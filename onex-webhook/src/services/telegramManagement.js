/**
 * ─────────────────────────────────────────────────────────────────────
 * Telegram Management Service
 * ─────────────────────────────────────────────────────────────────────
 * Comprehensive Telegram bot integration management including:
 * - Bot token management
 * - Chat ID management
 * - Connection testing
 * - Notification sending
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const database = require('./databaseEnhanced');
const settingsManager = require('./settingsManager');

/**
 * Get Telegram configuration from system settings
 */
function getTelegramConfig() {
  return {
    botToken: database.getSetting('telegram_bot_token')?.value || process.env.TELEGRAM_BOT_TOKEN,
    chatId: database.getSetting('telegram_chat_id')?.value || process.env.TELEGRAM_CHAT_ID,
    enabled: database.getSetting('telegram_enabled')?.value !== false
  };
}

/**
 * Store Telegram configuration in system settings
 */
function setTelegramConfig(config) {
  if (config.botToken !== undefined) {
    database.setSetting('telegram_bot_token', config.botToken, 'string', 'integration', 'Telegram Bot Token', true);
  }
  if (config.chatId !== undefined) {
    database.setSetting('telegram_chat_id', config.chatId, 'string', 'integration', 'Telegram Chat ID');
  }
  if (config.enabled !== undefined) {
    database.setSetting('telegram_enabled', config.enabled, 'boolean', 'integration', 'Telegram Integration Enabled');
  }
  
  // Also update in settings manager for backward compatibility
  settingsManager.updateSettings({
    telegram: {
      botToken: config.botToken,
      chatId: config.chatId,
      enabled: config.enabled
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'telegram_config_updated',
    entityType: 'setting',
    entityId: 'telegram_config',
    changes: { hasBotToken: !!config.botToken, enabled: config.enabled }
  });
  
  return getTelegramConfig();
}

/**
 * Test Telegram connection
 */
async function testConnection() {
  try {
    const config = getTelegramConfig();
    
    if (!config.botToken) {
      return {
        success: false,
        error: 'Bot Token not configured'
      };
    }
    
    // Test by calling getMe API
    const response = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`);
    
    if (response.data.ok) {
      return {
        success: true,
        message: 'Connection successful',
        bot: response.data.result
      };
    } else {
      return {
        success: false,
        error: response.data.description || 'Failed to connect to Telegram'
      };
    }
  } catch (error) {
    console.error('[telegram] Connection test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

/**
 * Get Telegram connection status
 */
function getConnectionStatus() {
  const config = getTelegramConfig();
  
  return {
    configured: !!config.botToken,
    hasBotToken: !!config.botToken,
    hasChatId: !!config.chatId,
    enabled: config.enabled,
    chatId: config.chatId ? '***' + config.chatId.slice(-4) : ''
  };
}

/**
 * Send test Telegram message
 */
async function sendTestMessage() {
  try {
    const config = getTelegramConfig();
    
    if (!config.botToken || !config.chatId) {
      throw new Error('Bot Token or Chat ID not configured');
    }
    
    const message = `🧪 *Test Message from OneX CRM*

This is a test notification to verify your Telegram integration is working correctly.

Timestamp: ${new Date().toISOString()}`;

    const response = await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    
    if (response.data.ok) {
      // Log audit
      database.addAuditLog({
        userId: null,
        action: 'telegram_test_sent',
        entityType: 'integration',
        entityId: 'telegram',
        changes: { chatId: '***' + config.chatId.slice(-4) }
      });
      
      return {
        success: true,
        message: 'Test message sent successfully',
        messageId: response.data.result.message_id
      };
    } else {
      throw new Error(response.data.description || 'Failed to send message');
    }
  } catch (error) {
    console.error('[telegram] Test message failed:', error.response?.data || error.message);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'telegram_test_failed',
      entityType: 'integration',
      entityId: 'telegram',
      changes: { error: error.message }
    });
    
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

/**
 * Enable/disable Telegram integration
 */
function setTelegramEnabled(enabled) {
  return setTelegramConfig({ enabled });
}

/**
 * Disconnect Telegram integration
 */
function disconnectTelegram() {
  // Clear Telegram credentials from settings
  database.setSetting('telegram_bot_token', '', 'string', 'integration', 'Telegram Bot Token', true);
  database.setSetting('telegram_enabled', false, 'boolean', 'integration', 'Telegram Integration Enabled');
  
  // Also clear from settings manager
  settingsManager.updateSettings({
    telegram: {
      botToken: '',
      chatId: getTelegramConfig().chatId,
      enabled: false
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'telegram_disconnected',
    entityType: 'integration',
    entityId: 'telegram'
  });
  
  return { success: true, message: 'Telegram disconnected successfully' };
}

/**
 * Get bot information
 */
async function getBotInfo() {
  try {
    const config = getTelegramConfig();
    
    if (!config.botToken) {
      throw new Error('Bot Token not configured');
    }
    
    const response = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`);
    
    if (response.data.ok) {
      return {
        success: true,
        bot: response.data.result
      };
    } else {
      throw new Error(response.data.description || 'Failed to get bot info');
    }
  } catch (error) {
    console.error('[telegram] Get bot info failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.description || error.message
    };
  }
}

module.exports = {
  getTelegramConfig,
  setTelegramConfig,
  testConnection,
  getConnectionStatus,
  sendTestMessage,
  setTelegramEnabled,
  disconnectTelegram,
  getBotInfo
};