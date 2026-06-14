/**
 * ─────────────────────────────────────────────────────────────────────
 * AiSensy WhatsApp Management Service
 * ─────────────────────────────────────────────────────────────────────
 * Comprehensive AiSensy WhatsApp integration management including:
 * - API configuration management
 * - Connection testing
 * - Template management
 * - Campaign management
 * - Message sending
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const database = require('./databaseEnhanced');
const settingsManager = require('./settingsManager');

/**
 * Get AiSensy configuration from system settings
 */
function getAiSensyConfig() {
  return {
    apiKey: database.getSetting('aisensy_api_key')?.value || process.env.AISENSY_API_KEY,
    campaignName: database.getSetting('aisensy_campaign_name')?.value || process.env.AISENSY_CAMPAIGN_NAME || '99acres_lead_alert',
    destination: database.getSetting('aisensy_destination_phone')?.value || process.env.AISENSY_DESTINATION_PHONE || '',
    userName: database.getSetting('aisensy_user_name')?.value || process.env.AISENSY_USER_NAME || 'OneX CRM',
    apiUrl: database.getSetting('aisensy_api_url')?.value || process.env.AISENSY_API_URL || 'https://backend.aisensy.com/campaign/t1/api/v2',
    enabled: database.getSetting('aisensy_enabled')?.value !== false
  };
}

/**
 * Store AiSensy configuration in system settings
 */
function setAiSensyConfig(config) {
  if (config.apiKey !== undefined) {
    database.setSetting('aisensy_api_key', config.apiKey, 'string', 'integration', 'AiSensy API Key', true);
  }
  if (config.campaignName !== undefined) {
    database.setSetting('aisensy_campaign_name', config.campaignName, 'string', 'integration', 'AiSensy Campaign Name');
  }
  if (config.destination !== undefined) {
    database.setSetting('aisensy_destination_phone', config.destination, 'string', 'integration', 'AiSensy Destination Phone');
  }
  if (config.userName !== undefined) {
    database.setSetting('aisensy_user_name', config.userName, 'string', 'integration', 'AiSensy Username');
  }
  if (config.apiUrl !== undefined) {
    database.setSetting('aisensy_api_url', config.apiUrl, 'string', 'integration', 'AiSensy API URL');
  }
  if (config.enabled !== undefined) {
    database.setSetting('aisensy_enabled', config.enabled, 'boolean', 'integration', 'AiSensy Integration Enabled');
  }
  
  // Also update in settings manager for backward compatibility
  settingsManager.updateSettings({
    aisensy: {
      apiKey: config.apiKey,
      campaignName: config.campaignName,
      destination: config.destination,
      userName: config.userName,
      enabled: config.enabled
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'aisensy_config_updated',
    entityType: 'setting',
    entityId: 'aisensy_config',
    changes: { hasApiKey: !!config.apiKey, enabled: config.enabled }
  });
  
  return getAiSensyConfig();
}

/**
 * Test AiSensy connection
 */
async function testConnection() {
  try {
    const config = getAiSensyConfig();
    
    if (!config.apiKey) {
      return {
        success: false,
        error: 'API Key not configured'
      };
    }
    
    // AiSensy doesn't have a dedicated connection test endpoint
    // We'll test by checking if the configuration is valid
    const isValid = config.apiKey && config.campaignName && config.destination;
    
    return {
      success: isValid,
      message: isValid ? 'Configuration appears valid' : 'Configuration incomplete',
      config: {
        hasApiKey: !!config.apiKey,
        hasCampaignName: !!config.campaignName,
        hasDestination: !!config.destination,
        enabled: config.enabled
      }
    };
  } catch (error) {
    console.error('[aisensy] Connection test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get AiSensy connection status
 */
function getConnectionStatus() {
  const config = getAiSensyConfig();
  
  return {
    configured: !!config.apiKey,
    hasApiKey: !!config.apiKey,
    hasCampaignName: !!config.campaignName,
    hasDestination: !!config.destination,
    enabled: config.enabled,
    campaignName: config.campaignName,
    destination: config.destination ? '***' + config.destination.slice(-4) : '',
    userName: config.userName,
    apiUrl: config.apiUrl
  };
}

/**
 * Send test WhatsApp message
 */
async function sendTestMessage(phoneNumber) {
  try {
    const config = getAiSensyConfig();
    
    if (!config.apiKey) {
      throw new Error('API Key not configured');
    }
    
    const testData = {
      name: 'Test User',
      phone: phoneNumber,
      property_title: 'Test Property',
      budget: 'Test Budget',
      location: 'Test Location',
      message: 'This is a test message from OneX CRM'
    };
    
    const response = await axios.post(config.apiUrl, {
      apiKey: config.apiKey,
      campaignName: config.campaignName,
      destination: phoneNumber,
      userName: config.userName,
      source: 'Test',
      components: [
        {
          type: 'body',
          text: `Test Message from OneX CRM\n\nName: ${testData.name}\nProperty: ${testData.property_title}\nBudget: ${testData.budget}\nLocation: ${testData.location}`
        }
      ],
      customParams: {
        name: testData.name,
        property: testData.property_title,
        budget: testData.budget,
        location: testData.location
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'aisensy_test_sent',
      entityType: 'integration',
      entityId: 'aisensy',
      changes: { phoneNumber: '***' + phoneNumber.slice(-4) }
    });
    
    return {
      success: true,
      message: 'Test message sent successfully',
      response: response.data
    };
  } catch (error) {
    console.error('[aisensy] Test message failed:', error.response?.data || error.message);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'aisensy_test_failed',
      entityType: 'integration',
      entityId: 'aisensy',
      changes: { error: error.message }
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Enable/disable AiSensy integration
 */
function setAiSensyEnabled(enabled) {
  return setAiSensyConfig({ enabled });
}

/**
 * Disconnect AiSensy integration
 */
function disconnectAiSensy() {
  // Clear AiSensy credentials from settings
  database.setSetting('aisensy_api_key', '', 'string', 'integration', 'AiSensy API Key', true);
  database.setSetting('aisensy_enabled', false, 'boolean', 'integration', 'AiSensy Integration Enabled');
  
  // Also clear from settings manager
  settingsManager.updateSettings({
    aisensy: {
      apiKey: '',
      campaignName: getAiSensyConfig().campaignName,
      destination: getAiSensyConfig().destination,
      userName: getAiSensyConfig().userName,
      enabled: false
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'aisensy_disconnected',
    entityType: 'integration',
    entityId: 'aisensy'
  });
  
  return { success: true, message: 'AiSensy disconnected successfully' };
}

module.exports = {
  getAiSensyConfig,
  setAiSensyConfig,
  testConnection,
  getConnectionStatus,
  sendTestMessage,
  setAiSensyEnabled,
  disconnectAiSensy
};