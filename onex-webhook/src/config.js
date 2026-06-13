/**
 * ─────────────────────────────────────────────────────────────────────
 * Configuration Module
 * ─────────────────────────────────────────────────────────────────────
 * Centralises every configurable value in the application.
 *
 * Environment variables are loaded from a `.env` file at the project
 * root (via dotenv). Sensible defaults are provided so the server can
 * start in development mode with minimal configuration.
 * ─────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

module.exports = {
  /** Port on which the Express server listens */
  port: parseInt(process.env.PORT, 10) || 3000,

  /* ── Zoho CRM OAuth2 ──────────────────────────────────────────────── */
  zoho: {
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,

    /**
     * Zoho accounts domain — use `accounts.zoho.in` for Indian DC,
     * `accounts.zoho.com` for US, `accounts.zoho.eu` for EU, etc.
     */
    tokenUrl:
      process.env.ZOHO_TOKEN_URL ||
      'https://accounts.zoho.in/oauth/v2/token',

    /**
     * CRM API base — use `www.zohoapis.in` for Indian DC,
     * `www.zohoapis.com` for US, etc.
     */
    apiUrl:
      process.env.ZOHO_API_URL ||
      'https://www.zohoapis.in/crm/v2/Leads',
  },

  /* ── AISensy WhatsApp API ─────────────────────────────────────────── */
  aisensy: {
    apiKey: process.env.AISENSY_API_KEY,

    /** The pre-approved campaign / template name on AISensy */
    campaignName: process.env.AISENSY_CAMPAIGN_NAME || '99acres_lead_alert',

    /** Destination phone number for the sales team (with country code) */
    destination: process.env.AISENSY_DESTINATION_PHONE || '',

    /** Sender's registered WhatsApp username on AISensy */
    userName: process.env.AISENSY_USER_NAME || 'OneX CRM',

    /** AISensy v2 campaign endpoint */
    url:
      process.env.AISENSY_API_URL ||
      'https://backend.aisensy.com/campaign/t1/api/v2',
  },

  /* ── SQLite database ──────────────────────────────────────────────── */
  db: {
    /** Path is relative to process.cwd() unless absolute */
    path: process.env.DB_PATH || './data/leads.db',
  },

  /* ── Retry behaviour ──────────────────────────────────────────────── */
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 10) || 3,
    /** Base delay in ms — actual delay is `delayMs × attemptNumber` */
    delayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 1000,
  },

  /* ── Logging ──────────────────────────────────────────────────────── */
  logs: {
    dir: process.env.LOG_DIR || './logs',
  },
};
