/**
 * NodeAPI.gs — Node Webhook Backend Integration
 * Communicates with the Node.js/Express backend for settings, analytics, and lead control
 * Production-ready with full error handling and retry logic
 */

var NodeAPI = {
  // Backend base URL — set this in Config.PROP_KEYS.NODE_API_URL
  // Example: https://onex-api.railway.app or https://api.yourdomain.com

  /**
   * Get backend URL from configuration
   * @returns {string} Base URL for Node backend
   */
  getBackendUrl: function() {
    var url = (Config.get().nodeApiUrl || PropertiesService.getScriptProperties().getProperty('NODE_API_URL') || '').trim();
    if (!url) {
      throw new Error('Node backend API URL not configured. Set NODE_API_URL in Script Properties.');
    }
    return url.replace(/\/$/, '');
  },

  /**
   * Make HTTP request to Node backend with retry logic
   * @param {string} method - HTTP method (GET, POST, etc)
   * @param {string} endpoint - API endpoint (e.g., /api/admin/health)
   * @param {Object} payload - Request body for POST/PUT
   * @param {number} attempt - Current retry attempt
   * @returns {Object} Response data
   */
  _request: function(method, endpoint, payload, attempt) {
    attempt = attempt || 1;
    var maxAttempts = 3;

    try {
      var url = NodeAPI.getBackendUrl() + endpoint;
      var options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OneX-CRM-GAS/1.0'
        },
        muteHttpExceptions: true
      };

      if (payload) {
        options.payload = JSON.stringify(payload);
      }

      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();

      if (code >= 200 && code < 300) {
        var data = JSON.parse(response.getContentText());
        return data;
      } else if (code === 429 || code >= 500) {
        if (attempt < maxAttempts) {
          Utilities.sleep(Math.pow(2, attempt) * 1000); // exponential backoff
          return NodeAPI._request(method, endpoint, payload, attempt + 1);
        }
        throw new Error('Backend error (HTTP ' + code + '): ' + response.getContentText().slice(0, 200));
      } else {
        var errorData = JSON.parse(response.getContentText());
        throw new Error(errorData.error || 'Request failed');
      }
    } catch (err) {
      console.error('NodeAPI._request error:', err.toString());
      throw err;
    }
  },

  /**
   * GET /api/admin/health
   * Check all integrations health status
   */
  getHealth: function() {
    return NodeAPI._request('GET', '/api/admin/health');
  },

  /**
   * GET /api/admin/settings
   * Retrieve current masked settings
   */
  getSettings: function() {
    return NodeAPI._request('GET', '/api/admin/settings');
  },

  /**
   * POST /api/admin/settings
   * Update any settings (Zoho, AISensy, Telegram, email)
   */
  saveSettings: function(settings) {
    return NodeAPI._request('POST', '/api/admin/settings', { data: settings });
  },

  /**
   * GET /api/admin/leads?limit=X&offset=Y&source=Z&search=term
   * List leads with filters
   */
  getLeads: function(params) {
    params = params || {};
    var limit = params.limit || 50;
    var offset = params.offset || 0;
    var source = params.source || '';
    var search = params.search || '';

    var query = '?limit=' + limit + '&offset=' + offset;
    if (source) query += '&source=' + encodeURIComponent(source);
    if (search) query += '&search=' + encodeURIComponent(search);

    return NodeAPI._request('GET', '/api/admin/leads' + query);
  },

  /**
   * GET /api/admin/leads/:id
   * Get single lead details
   */
  getLeadDetail: function(leadId) {
    return NodeAPI._request('GET', '/api/admin/leads/' + leadId);
  },

  /**
   * GET /api/admin/analytics
   * Get dashboard analytics
   */
  getAnalytics: function() {
    return NodeAPI._request('GET', '/api/admin/analytics');
  },

  /**
   * GET /api/admin/sources
   * List all available webhook sources
   */
  getSources: function() {
    return NodeAPI._request('GET', '/api/admin/sources');
  },

  /**
   * GET /api/admin/webhook-urls
   * Get webhook URLs for deployment
   */
  getWebhookUrls: function() {
    return NodeAPI._request('GET', '/api/admin/webhook-urls');
  },

  /**
   * POST /api/leads
   * Synchronize a normalized lead with the Node backend
   */
  pushLead: function(lead) {
    return NodeAPI._request('POST', '/api/leads', lead);
  },

  /**
   * POST /api/admin/leads/:id/resync-zoho
   * Manually retry Zoho sync for a lead
   */
  resyncLeadToZoho: function(leadId) {
    return NodeAPI._request('POST', '/api/admin/leads/' + leadId + '/resync-zoho');
  },

  /**
   * POST /api/admin/leads/:id/resend-whatsapp
   * Manually resend WhatsApp for a lead
   */
  resendWhatsApp: function(leadId) {
    return NodeAPI._request('POST', '/api/admin/leads/' + leadId + '/resend-whatsapp');
  }
};

/**
 * Test connectivity to Node backend
 */
function testNodeBackendConnection() {
  try {
    var result = NodeAPI.getHealth();
    if (result.success) {
      return { success: true, status: result.data };
    }
    return { success: false, error: 'Backend health check returned non-success status' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Sync Zoho credentials to backend
 */
function syncZohoCredentialsToBackend(clientId, clientSecret, refreshToken, tokenUrl, apiUrl) {
  try {
    var settings = {
      zoho: {
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        tokenUrl: tokenUrl,
        apiUrl: apiUrl
      }
    };
    var result = NodeAPI.saveSettings(settings);
    return result;
  } catch (err) {
    console.error('Sync Zoho error:', err.toString());
    throw err;
  }
}

/**
 * Sync AISensy credentials to backend
 */
function syncAiSensyCredentialsToBackend(apiKey, campaignName, destination, userName) {
  try {
    var settings = {
      aisensy: {
        apiKey: apiKey,
        campaignName: campaignName,
        destination: destination,
        userName: userName
      }
    };
    var result = NodeAPI.saveSettings(settings);
    return result;
  } catch (err) {
    console.error('Sync AISensy error:', err.toString());
    throw err;
  }
}

/**
 * Sync Telegram config to backend
 */
function syncTelegramConfigToBackend(botToken, chatId) {
  try {
    var settings = {
      telegram: {
        botToken: botToken,
        chatId: chatId
      }
    };
    var result = NodeAPI.saveSettings(settings);
    return result;
  } catch (err) {
    console.error('Sync Telegram error:', err.toString());
    throw err;
  }
}

/**
 * Sync email notification config
 */
function syncEmailConfigToBackend(recipient, enabled) {
  try {
    var settings = {
      email: {
        recipient: recipient,
        enabled: enabled === true || enabled === 'true'
      }
    };
    var result = NodeAPI.saveSettings(settings);
    return result;
  } catch (err) {
    console.error('Sync email error:', err.toString());
    throw err;
  }
}
