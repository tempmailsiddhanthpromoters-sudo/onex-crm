/**
 * ─────────────────────────────────────────────────────────────────────
 * Zoho CRM Management Service
 * ─────────────────────────────────────────────────────────────────────
 * Comprehensive Zoho CRM integration management including:
 * - OAuth flow management
 * - Connection testing
 * - Token refresh
 * - Lead sync operations
 * - 2-way sync capabilities
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const database = require('./databaseEnhanced');
const settingsManager = require('./settingsManager');

/**
 * Get Zoho OAuth configuration from system settings
 */
function getZohoConfig() {
  return {
    clientId: database.getSetting('zoho_client_id')?.value || process.env.ZOHO_CLIENT_ID,
    clientSecret: database.getSetting('zoho_client_secret')?.value || process.env.ZOHO_CLIENT_SECRET,
    refreshToken: database.getSetting('zoho_refresh_token')?.value || process.env.ZOHO_REFRESH_TOKEN,
    tokenUrl: database.getSetting('zoho_token_url')?.value || process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token',
    apiUrl: database.getSetting('zoho_api_url')?.value || process.env.ZOHO_API_URL || 'https://www.zohoapis.in/crm/v2/Leads'
  };
}

/**
 * Store Zoho OAuth configuration in system settings
 */
function setZohoConfig(config) {
  if (config.clientId) {
    database.setSetting('zoho_client_id', config.clientId, 'string', 'integration', 'Zoho OAuth Client ID', true);
  }
  if (config.clientSecret) {
    database.setSetting('zoho_client_secret', config.clientSecret, 'string', 'integration', 'Zoho OAuth Client Secret', true);
  }
  if (config.refreshToken) {
    database.setSetting('zoho_refresh_token', config.refreshToken, 'string', 'integration', 'Zoho OAuth Refresh Token', true);
  }
  if (config.tokenUrl) {
    database.setSetting('zoho_token_url', config.tokenUrl, 'string', 'integration', 'Zoho OAuth Token URL');
  }
  if (config.apiUrl) {
    database.setSetting('zoho_api_url', config.apiUrl, 'string', 'integration', 'Zoho CRM API URL');
  }
  
  // Also update in settings manager for backward compatibility
  settingsManager.updateSettings({
    zoho: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      tokenUrl: config.tokenUrl,
      apiUrl: config.apiUrl
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'zoho_config_updated',
    entityType: 'setting',
    entityId: 'zoho_config',
    changes: { hasClientId: !!config.clientId, hasClientSecret: !!config.clientSecret, hasRefreshToken: !!config.refreshToken }
  });
  
  return getZohoConfig();
}

/**
 * Generate OAuth authorization URL
 */
function generateAuthUrl(redirectUri) {
  const config = getZohoConfig();
  
  if (!config.clientId) {
    throw new Error('ZOHO_CLIENT_ID not configured');
  }
  
  const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${config.clientId}&response_type=code&access_type=offline&prompt=consent&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code, redirectUri) {
  const config = getZohoConfig();
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Zoho credentials not configured');
  }
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code: code
  });
  
  const response = await axios.post(config.tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  const { access_token, refresh_token, expires_in } = response.data;
  
  // Store the refresh token
  setZohoConfig({
    ...config,
    refreshToken: refresh_token
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'zoho_oauth_completed',
    entityType: 'integration',
    entityId: 'zoho',
    changes: { success: true }
  });
  
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresIn: expires_in
  };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const config = getZohoConfig();
  
  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    throw new Error('Zoho OAuth not properly configured');
  }
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken
  });
  
  try {
    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const { access_token, expires_in } = response.data;
    
    return {
      accessToken: access_token,
      expiresIn: expires_in
    };
  } catch (error) {
    console.error('[zoho] Token refresh failed:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Get current access token (refresh if needed)
 */
async function getAccessToken() {
  try {
    return await refreshAccessToken();
  } catch (error) {
    console.error('[zoho] Failed to get access token:', error);
    throw error;
  }
}

/**
 * Test Zoho connection
 */
async function testConnection() {
  try {
    const { accessToken } = await getAccessToken();
    const config = getZohoConfig();
    
    // Make a simple API call to test connection
    const response = await axios.get(`${config.apiUrl.replace('/Leads', '')}/users`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    return {
      success: true,
      message: 'Connection successful',
      users: response.data?.users?.length || 0
    };
  } catch (error) {
    console.error('[zoho] Connection test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Disconnect Zoho integration
 */
function disconnectZoho() {
  // Clear Zoho credentials from settings
  database.setSetting('zoho_client_id', '', 'string', 'integration', 'Zoho OAuth Client ID', true);
  database.setSetting('zoho_client_secret', '', 'string', 'integration', 'Zoho OAuth Client Secret', true);
  database.setSetting('zoho_refresh_token', '', 'string', 'integration', 'Zoho OAuth Refresh Token', true);
  
  // Also clear from settings manager
  settingsManager.updateSettings({
    zoho: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      tokenUrl: getZohoConfig().tokenUrl,
      apiUrl: getZohoConfig().apiUrl
    }
  });
  
  // Log audit
  database.addAuditLog({
    userId: null,
    action: 'zoho_disconnected',
    entityType: 'integration',
    entityId: 'zoho'
  });
  
  return { success: true, message: 'Zoho disconnected successfully' };
}

/**
 * Get Zoho connection status
 */
function getConnectionStatus() {
  const config = getZohoConfig();
  
  const isConfigured = !!(
    config.clientId && 
    config.clientSecret && 
    config.refreshToken
  );
  
  return {
    configured: isConfigured,
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    hasRefreshToken: !!config.refreshToken,
    tokenUrl: config.tokenUrl,
    apiUrl: config.apiUrl
  };
}

/**
 * Sync lead changes from Zoho to local database
 * This is for 2-way sync - pulling updates from Zoho
 */
async function syncLeadFromZoho(zohoLeadId) {
  try {
    const { accessToken } = await getAccessToken();
    const config = getZohoConfig();
    
    const response = await axios.get(`${config.apiUrl}/${zohoLeadId}`, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    const zohoLead = response.data?.data?.[0];
    if (!zohoLead) {
      throw new Error('Lead not found in Zoho');
    }
    
    // Find corresponding local lead
    const localLead = database.getLeadByLeadId(zohoLeadId) || 
                     database.getAllIntegrations().find(i => i.zoho_lead_id === zohoLeadId);
    
    if (localLead) {
      // Update local lead with Zoho data
      // This would involve mapping Zoho fields back to local fields
      // For now, just log the sync
      database.addTimelineEntry(
        localLead.id, 
        'zoho_sync_pull', 
        { zohoLeadId, status: zohoLead.Lead_Status }, 
        'System'
      );
    }
    
    return {
      success: true,
      lead: zohoLead
    };
  } catch (error) {
    console.error('[zoho] Sync from Zoho failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Push lead status changes to Zoho
 * This is for 2-way sync - pushing local updates to Zoho
 */
async function pushLeadStatusToZoho(localLeadId, newStatus) {
  try {
    const localLead = database.getLeadById(localLeadId);
    if (!localLead || !localLead.zoho_lead_id) {
      throw new Error('Local lead not found or not synced to Zoho');
    }
    
    const { accessToken } = await getAccessToken();
    const config = getZohoConfig();
    
    const response = await axios.put(`${config.apiUrl}/${localLead.zoho_lead_id}`, {
      data: [{
        Lead_Status: newStatus
      }]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    // Log the sync
    database.addTimelineEntry(
      localLeadId,
      'zoho_sync_push',
      { zohoLeadId: localLead.zoho_lead_id, status: newStatus },
      'System'
    );
    
    return {
      success: true,
      message: 'Status synced to Zoho'
    };
  } catch (error) {
    console.error('[zoho] Push to Zoho failed:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getZohoConfig,
  setZohoConfig,
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getAccessToken,
  testConnection,
  disconnectZoho,
  getConnectionStatus,
  syncLeadFromZoho,
  pushLeadStatusToZoho
};