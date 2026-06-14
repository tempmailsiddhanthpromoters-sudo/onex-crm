/**
 * ─────────────────────────────────────────────────────────────────────
 * Zoho CRM Service
 * ─────────────────────────────────────────────────────────────────────
 * Handles OAuth2 token management and lead creation in Zoho CRM.
 *
 * Flow:
 *  1. Obtain an access token using the stored refresh token.
 *  2. POST the lead to `Zoho CRM /crm/v2/Leads`.
 *  3. If the token is expired (HTTP 401), invalidate the cache and
 *     retry with a freshly minted token (up to `config.retry.maxAttempts`).
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const config = require('../config');

/* ── In-memory token cache ──────────────────────────────────────────── */
let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

/**
 * Fetches a new access token using the Zoho OAuth2 refresh-token grant.
 * Tokens are cached for (expires_in − 60) seconds to avoid unnecessary
 * round-trips while still refreshing before actual expiry.
 *
 * @returns {Promise<string>} OAuth2 access token
 */
async function getAccessToken() {
  // Return cached token if it's still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    refresh_token: config.zoho.refreshToken,
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await axios.post(config.zoho.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000, // 10 s hard timeout
  });

  if (!response.data.access_token) {
    throw new Error(
      `Zoho token response missing access_token: ${JSON.stringify(response.data)}`
    );
  }

  cachedToken = response.data.access_token;
  // Refresh 60 s before actual expiry
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

  console.log('[zoho] Access token refreshed successfully');
  return cachedToken;
}

/**
 * Creates a lead record in Zoho CRM.
 *
 * Field mapping:
 *   - Last_Name  → lead name
 *   - Phone      → phone number
 *   - Email      → email address
 *   - Description → property + budget + location (multi-line)
 *   - Lead_Source → hard-coded "99acres"
 *
 * @param {Object} lead
 * @returns {Promise<string|null>} Zoho lead ID on success, null otherwise
 * @throws {ZohoTokenExpiredError} if the API returns HTTP 401
 */
async function createLead({ source, name, phone, email, property, budget, location }) {
  // Build a human-readable description from the property details
  const description = [
    `Property: ${property || 'N/A'}`,
    `Budget: ${budget || 'N/A'}`,
    `Location: ${location || 'N/A'}`,
  ].join('\n');

  const payload = {
    data: [
      {
        Last_Name: name || 'Unknown',
        Phone: phone,
        Email: email,
        Description: description,
        Lead_Source: source || 'API',
      },
    ],
  };

  const token = await getAccessToken();

  try {
    const response = await axios.post(config.zoho.apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 s hard timeout
    });

    const zohoId = response.data?.data?.[0]?.details?.id || null;
    if (zohoId) {
      console.log(`[zoho] Lead created → ID ${zohoId}`);
    }
    return zohoId;
  } catch (err) {
    // If token was revoked or expired, clear cache & signal retry
    if (err.response?.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
      throw new ZohoTokenExpiredError('Zoho token expired — will retry');
    }
    throw err;
  }
}

/* ── Custom error for token-expired retries ─────────────────────────── */
class ZohoTokenExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ZohoTokenExpiredError';
  }
}

/**
 * Wraps `createLead()` with retry logic.
 *
 * Retry strategy:
 *  - On `ZohoTokenExpiredError` (HTTP 401): retry up to maxAttempts
 *    with linear back-off (delayMs × attempt).
 *  - On any other error: propagate immediately.
 *
 * @param {Object} leadData
 * @param {number} [attempt=1]
 * @returns {Promise<string|null>}
 */
async function createLeadWithRetry(leadData, attempt = 1) {
  try {
    return await createLead(leadData);
  } catch (err) {
    if (err instanceof ZohoTokenExpiredError && attempt < config.retry.maxAttempts) {
      console.warn(`[zoho] Token expired — retry ${attempt}/${config.retry.maxAttempts}`);
      await sleep(config.retry.delayMs * attempt);
      return createLeadWithRetry(leadData, attempt + 1);
    }
    throw err;
  }
}

/* ── Utility ────────────────────────────────────────────────────────── */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tests Zoho CRM connection by attempting to obtain an access token.
 * Does NOT create any records — purely a connectivity check.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testConnection() {
  try {
    const token = await getAccessToken();
    if (token) {
      return { success: true, message: 'Zoho OAuth token obtained successfully' };
    }
    return { success: false, message: 'Failed to obtain Zoho access token' };
  } catch (err) {
    return { success: false, message: 'Zoho connection failed: ' + (err.message || err.toString()) };
  }
}

module.exports = { createLeadWithRetry, testConnection };
