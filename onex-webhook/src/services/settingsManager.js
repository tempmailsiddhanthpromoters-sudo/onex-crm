/**
 * Settings Manager Service
 * Handles persistent configuration storage for production deployment
 * Stores and retrieves Zoho, AISensy, Telegram, and email configurations
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(process.cwd(), '.env.production');

/**
 * Load all settings from .env.production file
 * @returns {Object} All settings
 */
function loadSettings() {
  const settings = {
    zoho: {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
      tokenUrl: process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token',
      apiUrl: process.env.ZOHO_API_URL || 'https://www.zohoapis.in/crm/v2/Leads',
    },
    aisensy: {
      apiKey: process.env.AISENSY_API_KEY || '',
      campaignName: process.env.AISENSY_CAMPAIGN_NAME || '99acres_lead_alert',
      destination: process.env.AISENSY_DESTINATION_PHONE || '',
      userName: process.env.AISENSY_USER_NAME || 'OneX CRM',
      enabled: !!process.env.AISENSY_API_KEY,
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
    },
    email: {
      enabled: process.env.EMAIL_ALERTS === 'true' || process.env.EMAIL_ALERTS === '1',
      recipient: process.env.ADMIN_EMAIL || '',
    },
    port: parseInt(process.env.PORT, 10) || 3000,
  };

  return settings;
}

/**
 * Get masked version of settings (hide sensitive data)
 * @returns {Object} Settings with sensitive fields masked
 */
function getMaskedSettings() {
  const settings = loadSettings();
  return {
    zoho: {
      clientId: maskSecretValue(settings.zoho.clientId),
      clientSecret: maskSecretValue(settings.zoho.clientSecret),
      refreshToken: maskSecretValue(settings.zoho.refreshToken),
      tokenUrl: settings.zoho.tokenUrl,
      apiUrl: settings.zoho.apiUrl,
      configured: !!(settings.zoho.clientId && settings.zoho.clientSecret && settings.zoho.refreshToken),
    },
    aisensy: {
      apiKey: maskSecretValue(settings.aisensy.apiKey),
      campaignName: settings.aisensy.campaignName,
      destination: settings.aisensy.destination,
      userName: settings.aisensy.userName,
      enabled: settings.aisensy.enabled,
      configured: !!settings.aisensy.apiKey,
    },
    telegram: {
      botToken: maskSecretValue(settings.telegram.botToken),
      chatId: settings.telegram.chatId,
      enabled: settings.telegram.enabled,
      configured: !!settings.telegram.botToken,
    },
    email: {
      enabled: settings.email.enabled,
      recipient: settings.email.recipient,
      configured: !!settings.email.recipient,
    },
  };
}

/**
 * Update settings and write to environment
 * @param {Object} newSettings - Partial settings object
 * @returns {Object} Updated settings
 */
function updateSettings(newSettings) {
  const current = loadSettings();
  const updated = deepMerge(current, newSettings);

  // Update environment variables (using !== undefined so empty strings clear values)
  if (newSettings.zoho) {
    if (newSettings.zoho.clientId !== undefined) process.env.ZOHO_CLIENT_ID = newSettings.zoho.clientId;
    if (newSettings.zoho.clientSecret !== undefined) process.env.ZOHO_CLIENT_SECRET = newSettings.zoho.clientSecret;
    if (newSettings.zoho.refreshToken !== undefined) process.env.ZOHO_REFRESH_TOKEN = newSettings.zoho.refreshToken;
    if (newSettings.zoho.tokenUrl !== undefined) process.env.ZOHO_TOKEN_URL = newSettings.zoho.tokenUrl;
    if (newSettings.zoho.apiUrl !== undefined) process.env.ZOHO_API_URL = newSettings.zoho.apiUrl;
  }

  if (newSettings.aisensy) {
    if (newSettings.aisensy.apiKey !== undefined) process.env.AISENSY_API_KEY = newSettings.aisensy.apiKey;
    if (newSettings.aisensy.campaignName !== undefined) process.env.AISENSY_CAMPAIGN_NAME = newSettings.aisensy.campaignName;
    if (newSettings.aisensy.destination !== undefined) process.env.AISENSY_DESTINATION_PHONE = newSettings.aisensy.destination;
    if (newSettings.aisensy.userName !== undefined) process.env.AISENSY_USER_NAME = newSettings.aisensy.userName;
  }

  if (newSettings.telegram) {
    if (newSettings.telegram.botToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = newSettings.telegram.botToken;
    if (newSettings.telegram.chatId !== undefined) process.env.TELEGRAM_CHAT_ID = newSettings.telegram.chatId;
  }

  if (newSettings.email) {
    if (newSettings.email.enabled !== undefined) {
      process.env.EMAIL_ALERTS = newSettings.email.enabled ? 'true' : 'false';
    }
    if (newSettings.email.recipient !== undefined) process.env.ADMIN_EMAIL = newSettings.email.recipient;
  }

  // Persist settings to .env.production file for survival across restarts
  persistSettings(updated);

  console.log('[settings] Configuration updated and persisted');
  return getMaskedSettings();
}

/**
 * Persist settings to .env.production file so they survive server restarts.
 * This is critical for Zoho OAuth refresh tokens obtained via callback.
 */
function persistSettings(settings) {
  try {
    const envMap = {
      ZOHO_CLIENT_ID: settings.zoho?.clientId,
      ZOHO_CLIENT_SECRET: settings.zoho?.clientSecret,
      ZOHO_REFRESH_TOKEN: settings.zoho?.refreshToken,
      ZOHO_TOKEN_URL: settings.zoho?.tokenUrl,
      ZOHO_API_URL: settings.zoho?.apiUrl,
      AISENSY_API_KEY: settings.aisensy?.apiKey,
      AISENSY_CAMPAIGN_NAME: settings.aisensy?.campaignName,
      AISENSY_DESTINATION_PHONE: settings.aisensy?.destination,
      AISENSY_USER_NAME: settings.aisensy?.userName,
      TELEGRAM_BOT_TOKEN: settings.telegram?.botToken,
      TELEGRAM_CHAT_ID: settings.telegram?.chatId,
      ADMIN_EMAIL: settings.email?.recipient,
      EMAIL_ALERTS: settings.email?.enabled ? 'true' : 'false',
    };

    let existingRaw = '';
    try {
      existingRaw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    } catch (e) {
      // File doesn't exist yet
    }

    const existingLines = existingRaw ? existingRaw.split('\n') : [];
    const knownKeys = Object.keys(envMap);
    const writtenKeys = new Set();

    // Update existing lines
    const newLines = existingLines.map((line) => {
      const match = line.match(/^([A-Z_]+)=/);
      if (match && knownKeys.includes(match[1])) {
        const key = match[1];
        const val = envMap[key];
        if (val !== undefined && val !== null && val !== '') {
          writtenKeys.add(key);
          return `${key}=${val}`;
        }
        return `# ${key}=`; // comment out empty values
      }
      return line;
    });

    // Append new keys not already in file
    knownKeys.forEach((key) => {
      if (!writtenKeys.has(key)) {
        const val = envMap[key];
        if (val !== undefined && val !== null && val !== '') {
          newLines.push(`${key}=${val}`);
          writtenKeys.add(key);
        }
      }
    });

    fs.writeFileSync(SETTINGS_FILE, newLines.join('\n') + '\n');
    console.log('[settings] Persisted to', SETTINGS_FILE);
  } catch (err) {
    console.error('[settings] Failed to persist settings:', err.message);
  }
}

/**
 * Get connection status for all integrations
 * @returns {Object} Status of each integration
 */
function getIntegrationStatus() {
  const settings = loadSettings();
  return {
    zoho: {
      configured: !!(settings.zoho.clientId && settings.zoho.clientSecret && settings.zoho.refreshToken),
      status: settings.zoho.clientId ? 'ready' : 'not_configured',
    },
    aisensy: {
      configured: !!settings.aisensy.apiKey,
      status: settings.aisensy.apiKey ? 'ready' : 'not_configured',
      enabled: settings.aisensy.enabled,
    },
    telegram: {
      configured: !!settings.telegram.botToken,
      status: settings.telegram.botToken ? 'ready' : 'not_configured',
      enabled: settings.telegram.enabled,
    },
    email: {
      configured: !!settings.email.recipient,
      status: settings.email.recipient ? 'ready' : 'not_configured',
      enabled: settings.email.enabled,
    },
  };
}

function maskSecretValue(value) {
  if (!value || value.length === 0) return '(not set)';
  if (value.length < 4) return '***';
  return '***' + value.slice(-4);
}

function deepMerge(target, source) {
  const result = JSON.parse(JSON.stringify(target));
  Object.keys(source).forEach((key) => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!result[key]) result[key] = {};
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  });
  return result;
}

module.exports = {
  loadSettings,
  getMaskedSettings,
  updateSettings,
  getIntegrationStatus,
};
