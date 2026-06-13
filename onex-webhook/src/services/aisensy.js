/**
 * ─────────────────────────────────────────────────────────────────────
 * AISensy WhatsApp Notification Service
 * ─────────────────────────────────────────────────────────────────────
 * Sends a WhatsApp message to the sales team every time a new lead
 * arrives from 99acres.
 *
 * Uses AISensy Campaign API v2:
 *   POST https://backend.aisensy.com/campaign/t1/api/v2
 *
 * The message template ("campaignName") must be pre-approved on the
 * AISensy dashboard. Template variables ({{1}}, {{2}}, …) are filled
 * in via `templateParams`.
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const config = require('../config');

/**
 * Sends a WhatsApp notification with lead details.
 *
 * Message format:
 *   New inquiry from 99acres
 *   Name:     {Name}
 *   Phone:    {Phone}
 *   Property: {Property}
 *   Budget:   {Budget}
 *   Location: {Location}
 *
 * @param {Object} lead - Extracted lead fields
 * @returns {Promise<Object>} AISensy API response body
 */
async function sendWhatsApp({ name, phone, property, budget, location }) {
  /*
   * AISensy v2 API payload reference:
   * ─────────────────────────────────
   * apiKey         – Your AISensy API key
   * campaignName   – Pre-approved template name
   * destination    – Recipient phone (with country code, e.g. 919876543210)
   * userName       – Sender name registered on AISensy
   * templateParams – Array of strings mapped to {{1}}, {{2}}, … in template
   */
  const payload = {
    apiKey: config.aisensy.apiKey,
    campaignName: config.aisensy.campaignName,
    destination: config.aisensy.destination,
    userName: config.aisensy.userName,
    templateParams: [
      name || 'N/A',
      phone || 'N/A',
      property || 'N/A',
      budget || 'N/A',
      location || 'N/A',
    ],
    // Optional: you can add media or buttons here per AISensy docs
  };

  const response = await axios.post(config.aisensy.url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000, // 10 s hard timeout
  });

  console.log('[aisensy] WhatsApp notification sent');
  return response.data;
}

/**
 * Wraps `sendWhatsApp()` with retry logic for transient network errors.
 *
 * Retry strategy:
 *  - Retries any failure (network timeout, 5xx, etc.) up to
 *    `config.retry.maxAttempts` with linear back-off.
 *
 * @param {Object} leadData
 * @param {number} [attempt=1]
 * @returns {Promise<Object>}
 */
async function sendWhatsAppWithRetry(leadData, attempt = 1) {
  try {
    return await sendWhatsApp(leadData);
  } catch (err) {
    if (attempt < config.retry.maxAttempts) {
      console.warn(`[aisensy] Send failed — retry ${attempt}/${config.retry.maxAttempts}`);
      await sleep(config.retry.delayMs * attempt);
      return sendWhatsAppWithRetry(leadData, attempt + 1);
    }
    throw err;
  }
}

/* ── Utility ────────────────────────────────────────────────────────── */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { sendWhatsAppWithRetry };
