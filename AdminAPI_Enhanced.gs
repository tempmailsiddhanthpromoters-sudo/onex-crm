/**
 * AdminAPI_Enhanced.gs - Enhanced Admin Panel Server-Side API
 * Complete CRM Control Panel with Node.js Backend Integration
 * 
 * This API handles all admin operations including:
 * - Dashboard & Analytics
 * - Lead Management  
 * - Dynamic Integration Builder
 * - Field Mapping Engine
 * - Routing Rules Management
 * - Zoho CRM Management
 * - AiSensy WhatsApp Management
 * - Telegram Management
 * - User Management & RBAC
 * - System Settings
 * - Audit Logs
 * - Sync Monitoring
 * - System Health
 */

function handleAdminActionEnhanced(payload) {
  var action = payload._adminAction;
  try {
    switch(action) {
      // Dashboard
      case 'getDashboardData':  return jsonR(getDashboardDataEnhanced());
      case 'getRealtimeStats':  return jsonR(getRealtimeStats());
      
      // Lead Management
      case 'getLeads':          return jsonR(getLeadsEnhanced(payload));
      case 'getLeadDetail':     return jsonR(getLeadDetailEnhanced(payload.leadId));
      case 'updateLead':        return jsonR(updateLeadEnhanced(payload));
      case 'getLeadTimeline':   return jsonR(getLeadTimeline(payload.leadId));
      case 'bulkUpdateLeads':   return jsonR(bulkUpdateLeads(payload));
      
      // Dynamic Integration Builder
      case 'getIntegrations':   return jsonR(getIntegrationsEnhanced());
      case 'createIntegration': return jsonR(createIntegration(payload));
      case 'updateIntegration': return jsonR(updateIntegration(payload));
      case 'deleteIntegration': return jsonR(deleteIntegration(payload));
      case 'enableIntegration': return jsonR(enableIntegration(payload.id));
      case 'disableIntegration': return jsonR(disableIntegration(payload.id));
      case 'testIntegration':   return jsonR(testIntegrationEnhanced(payload));
      case 'getWebhookUrls':    return jsonR(getWebhookUrls());
      
      // Field Mapping Management
      case 'getFieldMappings':  return jsonR(getFieldMappings());
      case 'createFieldMapping': return jsonR(createFieldMapping(payload));
      case 'updateFieldMapping': return jsonR(updateFieldMapping(payload));
      case 'deleteFieldMapping': return jsonR(deleteFieldMapping(payload));
      
      // Routing Rules Management
      case 'getRoutingRules':   return jsonR(getRoutingRulesEnhanced());
      case 'createRoutingRule': return jsonR(createRoutingRule(payload));
      case 'updateRoutingRule': return jsonR(updateRoutingRule(payload));
      case 'deleteRoutingRule': return jsonR(deleteRoutingRule(payload));
      
      // Zoho Management
      case 'getZohoConfig':     return jsonR(getZohoConfig());
      case 'updateZohoConfig':  return jsonR(updateZohoConfig(payload));
      case 'getZohoAuthUrl':    return jsonR(getZohoAuthUrl());
      case 'testZohoConnection': return jsonR(testZohoConnection());
      case 'refreshZohoToken':  return jsonR(refreshZohoToken());
      case 'disconnectZoho':    return jsonR(disconnectZoho());
      case 'syncLeadFromZoho':  return jsonR(syncLeadFromZoho(payload.zohoLeadId));
      case 'pushLeadToZoho':    return jsonR(pushLeadToZoho(payload.localLeadId, payload.status));
      case 'getZohoSyncLogs':    return jsonR(getZohoSyncLogs());
      
      // AiSensy Management
      case 'getAiSensyConfig':  return jsonR(getAiSensyConfig());
      case 'updateAiSensyConfig': return jsonR(updateAiSensyConfig(payload));
      case 'testAiSensyConnection': return jsonR(testAiSensyConnection());
      case 'sendAiSensyTest':   return jsonR(sendAiSensyTest(payload.phoneNumber));
      case 'enableAiSensy':     return jsonR(enableAiSensy());
      case 'disableAiSensy':    return jsonR(disableAiSensy());
      case 'disconnectAiSensy': return jsonR(disconnectAiSensy());
      case 'getAiSensyLogs':    return jsonR(getAiSensyLogs());
      
      // Telegram Management
      case 'getTelegramConfig':  return jsonR(getTelegramConfig());
      case 'updateTelegramConfig': return jsonR(updateTelegramConfig(payload));
      case 'testTelegramConnection': return jsonR(testTelegramConnection());
      case 'sendTelegramTest':  return jsonR(sendTelegramTest());
      case 'getTelegramBotInfo': return jsonR(getTelegramBotInfo());
      case 'enableTelegram':    return jsonR(enableTelegram());
      case 'disableTelegram':   return jsonR(disableTelegram());
      case 'disconnectTelegram': return jsonR(disconnectTelegram());
      case 'getTelegramLogs':   return jsonR(getTelegramLogs());
      
      // User Management & RBAC
      case 'getUsers':          return jsonR(getUsers());
      case 'createUser':        return jsonR(createUser(payload));
      case 'updateUser':        return jsonR(updateUser(payload));
      case 'deleteUser':        return jsonR(deleteUser(payload.id));
      case 'getUserRoles':      return jsonR(getUserRoles());
      case 'updateUserRole':    return jsonR(updateUserRole(payload));
      case 'getUserPermissions': return jsonR(getUserPermissions(payload.userId));
      
      // System Settings
      case 'getSystemSettings': return jsonR(getSystemSettings());
      case 'updateSystemSetting': return jsonR(updateSystemSetting(payload));
      case 'getServerSettings': return jsonR(getServerSettings());
      case 'updateServerSettings': return jsonR(updateServerSettings(payload));
      case 'getFeatureFlags':   return jsonR(getFeatureFlags());
      case 'updateFeatureFlags': return jsonR(updateFeatureFlags(payload));
      
      // Audit Logs
      case 'getAuditLogs':      return jsonR(getAuditLogs(payload));
      case 'getAuditLogDetail': return jsonR(getAuditLogDetail(payload.logId));
      
      // Sync Monitoring
      case 'getSyncStatus':     return jsonR(getSyncStatus());
      case 'getSyncHistory':    return jsonR(getSyncHistory(payload));
      case 'retryFailedSync':   return jsonR(retryFailedSync(payload.syncId));
      
      // System Health
      case 'getSystemHealth':   return jsonR(getSystemHealth());
      case 'getSystemMetrics':  return jsonR(getSystemMetrics());
      case 'getDatabaseStats':  return jsonR(getDatabaseStats());
      
      // Master Sheet Sync
      case 'syncMasterSheet':   return jsonR(syncMasterSheet());
      case 'getSheetSyncStatus': return jsonR(getSheetSyncStatus());
      
      // Node Backend Connection
      case 'getNodeApiUrl':     return jsonR({ nodeApiUrl: (Config.get().nodeApiUrl || '') });
      case 'setNodeApiUrl':     return jsonR(setNodeApiUrl(payload));
      case 'testNodeBackend':   return jsonR(testNodeBackendConnection());
      
      default: return buildResponse(400, false, 'Unknown action: '+action, null);
    }
  } catch(err) {
    console.error('handleAdminActionEnhanced ['+action+']: '+err.toString());
    return buildResponse(500, false, 'Server error: '+(err.message||err.toString()), null);
  }
}

function jsonR(data) { return buildResponse(200,true,'OK',data); }

// ── NODE BACKEND API CLIENT ─────────────────────────────────────────────

function callNodeBackend(endpoint, method, payload) {
  var nodeApiUrl = Config.get().nodeApiUrl;
  if (!nodeApiUrl) {
    throw new Error('Node API URL not configured. Please set it in Settings.');
  }
  
  var url = nodeApiUrl + endpoint;
  var options = {
    method: method,
    contentType: 'application/json',
    headers: {
      'Accept': 'application/json'
    },
    muteHttpExceptions: true,
    payload: payload ? JSON.stringify(payload) : null
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseBody);
    } else {
      throw new Error('Node API returned status ' + responseCode + ': ' + responseBody);
    }
  } catch(err) {
    console.error('Node API call failed:', err);
    throw err;
  }
}

// ── ENHANCED DASHBOARD ───────────────────────────────────────────────────

function getDashboardDataEnhanced() {
  var sheet = Config.getSheet(Config.SHEETS.LEADS);
  var data = sheet.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
  var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  var monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  var weekAgoStr = Utilities.formatDate(weekAgo,'Asia/Kolkata','yyyy-MM-dd');
  var monthAgoStr = Utilities.formatDate(monthAgo,'Asia/Kolkata','yyyy-MM-dd');
  
  var total=0, todayCount=0, weekCount=0, monthCount=0;
  var wasSent=0, wasFailed=0, telegramSent=0, telegramFailed=0;
  var zohoSynced=0, zohoFailed=0;
  var sourceCounts={}, statusCounts={}, agentCounts={};
  var siteVisits=0, bookings=0, revenue=0, commissions=0;
  
  for (var i=1; i<data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    total++;
    
    var src = (row[Config.LEAD_COLS.SOURCE] || '').toString();
    var status = (row[Config.LEAD_COLS.STATUS] || 'New').toString();
    var waSt = (row[Config.LEAD_COLS.WA_STATUS] || '').toString();
    var assignedTo = (row[Config.LEAD_COLS.ASSIGNED_TO] || '').toString();
    var created = (row[Config.LEAD_COLS.CREATED_AT] || '').toString();
    var ds = created.length>=10 ? created.slice(0,10) : '';
    var dealVal = parseFloat(row[Config.LEAD_COLS.DEAL_VALUE] || 0);
    var commVal = parseFloat(row[Config.LEAD_COLS.COMMISSION_VALUE] || 0);
    var siteVisit = (row[Config.LEAD_COLS.SITE_VISIT_DONE] || '').toString();
    
    if (ds===today) todayCount++;
    if (ds>=weekAgoStr) weekCount++;
    if (ds>=monthAgoStr) monthCount++;
    
    if (waSt==='SENT') wasSent++;
    if (waSt==='FAILED') wasFailed++;
    
    sourceCounts[src] = (sourceCounts[src]||0)+1;
    statusCounts[status] = (statusCounts[status]||0)+1;
    
    if (assignedTo) agentCounts[assignedTo] = (agentCounts[assignedTo]||0)+1;
    
    if (siteVisit==='Yes' || siteVisit==='true') siteVisits++;
    if (status==='Booked') {
      bookings++;
      revenue += dealVal;
      commissions += commVal;
    }
  }
  
  // Get sync stats from node backend
  var syncStats = { zohoSynced: 0, zohoFailed: 0 };
  try {
    var nodeStats = callNodeBackend('/health', 'GET', null);
    if (nodeStats.database && nodeStats.database.integrations) {
      // Integrations count from node
    }
  } catch(e) {
    console.log('Could not fetch node stats for dashboard');
  }
  
  // Recent 10 leads
  var recent = [];
  var all = data.slice(1).filter(function(r){return r[0];});
  for (var j=all.length-1; j>=Math.max(0,all.length-10); j--) {
    var r=all[j];
    recent.push({
      leadId:r[0].toString(),
      name:(r[Config.LEAD_COLS.NAME]||'').toString(),
      phone:(r[Config.LEAD_COLS.PHONE]||'').toString(),
      source:(r[Config.LEAD_COLS.SOURCE]||'').toString(),
      status:(r[Config.LEAD_COLS.STATUS]||'').toString(),
      waStatus:(r[Config.LEAD_COLS.WA_STATUS]||'').toString(),
      assignedTo:(r[Config.LEAD_COLS.ASSIGNED_TO]||'').toString(),
      created:(r[Config.LEAD_COLS.CREATED_AT]||'').toString()
    });
  }
  
  // Find top performing source
  var topSource = '';
  var topSourceCount = 0;
  Object.keys(sourceCounts).forEach(function(s){
    if (sourceCounts[s] > topSourceCount) {
      topSourceCount = sourceCounts[s];
      topSource = s;
    }
  });
  
  // Find top performing agent
  var topAgent = '';
  var topAgentCount = 0;
  Object.keys(agentCounts).forEach(function(a){
    if (agentCounts[a] > topAgentCount) {
      topAgentCount = agentCounts[a];
      topAgent = a;
    }
  });
  
  return {
    summary: {
      total: total,
      todayCount: todayCount,
      weekCount: weekCount,
      monthCount: monthCount,
      sourceCounts: sourceCounts,
      statusCounts: statusCounts,
      wasSent: wasSent,
      wasFailed: wasFailed,
      telegramSent: telegramSent,
      telegramFailed: telegramFailed,
      zohoSynced: zohoSynced,
      zohoFailed: zohoFailed,
      conversionRate: total>0 ? Math.round((statusCounts['Booked']||0)/total*100) : 0,
      siteVisits: siteVisits,
      bookings: bookings,
      revenue: revenue,
      commissions: commissions
    },
    recentLeads: recent,
    topSource: topSource,
    topAgent: topAgent,
    sourceCounts: sourceCounts,
    agentCounts: agentCounts
  };
}

function getRealtimeStats() {
  // Get current stats from Node backend
  try {
    var nodeHealth = callNodeBackend('/health', 'GET', null);
    return {
      nodeStatus: nodeHealth.status || 'unknown',
      database: nodeHealth.database || { status: 'unknown' },
      integrations: nodeHealth.integrations || []
    };
  } catch(e) {
    return {
      nodeStatus: 'error',
      database: { status: 'error' },
      integrations: [],
      error: e.message
    };
  }
}

// ── DYNAMIC INTEGRATION BUILDER ───────────────────────────────────────────

function getIntegrationsEnhanced() {
  try {
    return callNodeBackend('/api/integrations', 'GET', null);
  } catch(e) {
    console.error('Error fetching integrations:', e);
    return { success: false, integrations: [], error: e.message };
  }
}

function createIntegration(payload) {
  try {
    var integrationData = {
      name: payload.name,
      slug: payload.slug,
      source_type: payload.webhookType || 'webhook',
      enabled: payload.enabled !== false,
      priority: parseInt(payload.priority || 0),
      retry_count: parseInt(payload.retryCount || 3),
      timeout_ms: parseInt(payload.timeout || 30000),
      validation_rules: payload.validationRules || null,
      webhook_secret: payload.webhookSecret || null
    };
    
    return callNodeBackend('/api/integrations', 'POST', integrationData);
  } catch(e) {
    console.error('Error creating integration:', e);
    return { success: false, error: e.message };
  }
}

function updateIntegration(payload) {
  try {
    var integrationData = {
      name: payload.name,
      enabled: payload.enabled,
      priority: parseInt(payload.priority),
      retry_count: parseInt(payload.retryCount),
      timeout_ms: parseInt(payload.timeout)
    };
    
    return callNodeBackend('/api/integrations/' + payload.id, 'PUT', integrationData);
  } catch(e) {
    console.error('Error updating integration:', e);
    return { success: false, error: e.message };
  }
}

function deleteIntegration(id) {
  try {
    return callNodeBackend('/api/integrations/' + id, 'DELETE', null);
  } catch(e) {
    console.error('Error deleting integration:', e);
    return { success: false, error: e.message };
  }
}

function enableIntegration(id) {
  try {
    return callNodeBackend('/api/integrations/' + id + '/enable', 'POST', null);
  } catch(e) {
    console.error('Error enabling integration:', e);
    return { success: false, error: e.message };
  }
}

function disableIntegration(id) {
  try {
    return callNodeBackend('/api/integrations/' + id + '/disable', 'POST', null);
  } catch(e) {
    console.error('Error disabling integration:', e);
    return { success: false, error: e.message };
  }
}

function testIntegration(payload) {
  try {
    // Send test webhook to the integration
    var testData = {
      name: 'Test Lead',
      phone: '9876543210',
      email: 'test@example.com',
      property: 'Test Property',
      budget: '50L',
      location: 'Test Location'
    };
    
    return callNodeBackend('/webhook/' + payload.slug, 'POST', testData);
  } catch(e) {
    console.error('Error testing integration:', e);
    return { success: false, error: e.message };
  }
}

function getWebhookUrls() {
  try {
    return callNodeBackend('/webhooks', 'GET', null);
  } catch(e) {
    console.error('Error fetching webhook URLs:', e);
    return { success: false, webhooks: [], error: e.message };
  }
}

// ── FIELD MAPPING MANAGEMENT ─────────────────────────────────────────────

function getFieldMappings() {
  try {
    return callNodeBackend('/api/field-mappings', 'GET', null);
  } catch(e) {
    console.error('Error fetching field mappings:', e);
    return { success: false, mappings: [], error: e.message };
  }
}

function createFieldMapping(payload) {
  try {
    var mappingData = {
      name: payload.name,
      description: payload.description,
      mappings: payload.mappings
    };
    
    return callNodeBackend('/api/field-mappings', 'POST', mappingData);
  } catch(e) {
    console.error('Error creating field mapping:', e);
    return { success: false, error: e.message };
  }
}

function updateFieldMapping(payload) {
  try {
    var mappingData = {
      name: payload.name,
      description: payload.description,
      mappings: payload.mappings
    };
    
    return callNodeBackend('/api/field-mappings/' + payload.id, 'PUT', mappingData);
  } catch(e) {
    console.error('Error updating field mapping:', e);
    return { success: false, error: e.message };
  }
}

function deleteFieldMapping(id) {
  try {
    return callNodeBackend('/api/field-mappings/' + id, 'DELETE', null);
  } catch(e) {
    console.error('Error deleting field mapping:', e);
    return { success: false, error: e.message };
  }
}

// ── ROUTING RULES MANAGEMENT ───────────────────────────────────────────

function getRoutingRulesEnhanced() {
  try {
    return callNodeBackend('/api/routing-rules', 'GET', null);
  } catch(e) {
    console.error('Error fetching routing rules:', e);
    return { success: false, rules: [], error: e.message };
  }
}

function createRoutingRule(payload) {
  try {
    var ruleData = {
      name: payload.name,
      priority: parseInt(payload.priority || 0),
      conditions: payload.conditions,
      actions: payload.actions,
      enabled: payload.enabled !== false
    };
    
    return callNodeBackend('/api/routing-rules', 'POST', ruleData);
  } catch(e) {
    console.error('Error creating routing rule:', e);
    return { success: false, error: e.message };
  }
}

function updateRoutingRule(payload) {
  try {
    var ruleData = {
      name: payload.name,
      priority: parseInt(payload.priority || 0),
      conditions: payload.conditions,
      actions: payload.actions,
      enabled: payload.enabled
    };
    
    return callNodeBackend('/api/routing-rules/' + payload.id, 'PUT', ruleData);
  } catch(e) {
    console.error('Error updating routing rule:', e);
    return { success: false, error: e.message };
  }
}

function deleteRoutingRule(id) {
  try {
    return callNodeBackend('/api/routing-rules/' + id, 'DELETE', null);
  } catch(e) {
    console.error('Error deleting routing rule:', e);
    return { success: false, error: e.message };
  }
}

// ── ZOHO MANAGEMENT ────────────────────────────────────────────────────

function getZohoConfig() {
  try {
    return callNodeBackend('/api/zoho/config', 'GET', null);
  } catch(e) {
    console.error('Error fetching Zoho config:', e);
    return { success: false, config: {}, error: e.message };
  }
}

function updateZohoConfig(payload) {
  try {
    var zohoData = {
      clientId: payload.clientId,
      clientSecret: payload.clientSecret,
      refreshToken: payload.refreshToken,
      tokenUrl: payload.tokenUrl,
      apiUrl: payload.apiUrl
    };
    
    return callNodeBackend('/api/zoho/config', 'PUT', zohoData);
  } catch(e) {
    console.error('Error updating Zoho config:', e);
    return { success: false, error: e.message };
  }
}

function getZohoAuthUrl() {
  try {
    return callNodeBackend('/api/zoho/auth-url', 'GET', null);
  } catch(e) {
    console.error('Error getting Zoho auth URL:', e);
    return { success: false, error: e.message };
  }
}

function testZohoConnection() {
  try {
    return callNodeBackend('/api/zoho/test-connection', 'POST', null);
  } catch(e) {
    console.error('Error testing Zoho connection:', e);
    return { success: false, error: e.message };
  }
}

function refreshZohoToken() {
  try {
    return callNodeBackend('/api/zoho/refresh-token', 'POST', null);
  } catch(e) {
    console.error('Error refreshing Zoho token:', e);
    return { success: false, error: e.message };
  }
}

function disconnectZoho() {
  try {
    return callNodeBackend('/api/zoho/disconnect', 'POST', null);
  } catch(e) {
    console.error('Error disconnecting Zoho:', e);
    return { success: false, error: e.message };
  }
}

function syncLeadFromZoho(zohoLeadId) {
  try {
    return callNodeBackend('/api/zoho/sync-lead/' + zohoLeadId, 'POST', null);
  } catch(e) {
    console.error('Error syncing lead from Zoho:', e);
    return { success: false, error: e.message };
  }
}

function pushLeadToZoho(localLeadId, status) {
  try {
    var payload = { status: status };
    return callNodeBackend('/api/zoho/lead-status/' + localLeadId, 'PUT', payload);
  } catch(e) {
    console.error('Error pushing lead to Zoho:', e);
    return { success: false, error: e.message };
  }
}

function getZohoSyncLogs() {
  try {
    return callNodeBackend('/api/audit-logs?action=zoho_sync&limit=50', 'GET', null);
  } catch(e) {
    console.error('Error fetching Zoho sync logs:', e);
    return { success: false, logs: [], error: e.message };
  }
}

// ── AISENSY MANAGEMENT ─────────────────────────────────────────────────

function getAiSensyConfig() {
  try {
    return callNodeBackend('/api/aisensy/config', 'GET', null);
  } catch(e) {
    console.error('Error fetching AiSensy config:', e);
    return { success: false, config: {}, error: e.message };
  }
}

function updateAiSensyConfig(payload) {
  try {
    var aisensyData = {
      apiKey: payload.apiKey,
      campaignName: payload.campaignName,
      destination: payload.destination,
      userName: payload.userName,
      enabled: payload.enabled
    };
    
    return callNodeBackend('/api/aisensy/config', 'PUT', aisensyData);
  } catch(e) {
    console.error('Error updating AiSensy config:', e);
    return { success: false, error: e.message };
  }
}

function testAiSensyConnection() {
  try {
    return callNodeBackend('/api/aisensy/test-connection', 'POST', null);
  } catch(e) {
    console.error('Error testing AiSensy connection:', e);
    return { success: false, error: e.message };
  }
}

function sendAiSensyTest(payload) {
  try {
    return callNodeBackend('/api/aisensy/send-test', 'POST', payload);
  } catch(e) {
    console.error('Error sending AiSensy test:', e);
    return { success: false, error: e.message };
  }
}

function enableAiSensy() {
  try {
    return callNodeBackend('/api/aisensy/enable', 'POST', null);
  } catch(e) {
    console.error('Error enabling AiSensy:', e);
    return { success: false, error: e.message };
  }
}

function disableAiSensy() {
  try {
    return callNodeBackend('/api/aisensy/disable', 'POST', null);
  } catch(e) {
    console.error('Error disabling AiSensy:', e);
    return { success: false, error: e.message };
  }
}

function disconnectAiSensy() {
  try {
    return callNodeBackend('/api/aisensy/disconnect', 'POST', null);
  } catch(e) {
    console.error('Error disconnecting AiSensy:', e);
    return { success: false, error: e.message };
  }
}

function getAiSensyLogs() {
  try {
    return callNodeBackend('/api/audit-logs?action=aisensy&limit=50', 'GET', null);
  } catch(e) {
    console.error('Error fetching AiSensy logs:', e);
    return { success: false, logs: [], error: e.message };
  }
}

// ── TELEGRAM MANAGEMENT ────────────────────────────────────────────────

function getTelegramConfig() {
  try {
    return callNodeBackend('/api/telegram/config', 'GET', null);
  } catch(e) {
    console.error('Error fetching Telegram config:', e);
    return { success: false, config: {}, error: e.message };
  }
}

function updateTelegramConfig(payload) {
  try {
    var telegramData = {
      botToken: payload.botToken,
      chatId: payload.chatId,
      enabled: payload.enabled
    };
    
    return callNodeBackend('/api/telegram/config', 'PUT', telegramData);
  } catch(e) {
    console.error('Error updating Telegram config:', e);
    return { success: false, error: e.message };
  }
}

function testTelegramConnection() {
  try {
    return callNodeBackend('/api/telegram/test-connection', 'POST', null);
  } catch(e) {
    console.error('Error testing Telegram connection:', e);
    return { success: false, error: e.message };
  }
}

function sendTelegramTest() {
  try {
    return callNodeBackend('/api/telegram/send-test', 'POST', null);
  } catch(e) {
    console.error('Error sending Telegram test:', e);
    return { success: false, error: e.message };
  }
}

function getTelegramBotInfo() {
  try {
    return callNodeBackend('/api/telegram/bot-info', 'GET', null);
  } catch(e) {
    console.error('Error getting Telegram bot info:', e);
    return { success: false, error: e.message };
  }
}

function enableTelegram() {
  try {
    return callNodeBackend('/api/telegram/enable', 'POST', null);
  } catch(e) {
    console.error('Error enabling Telegram:', e);
    return { success: false, error: e.message };
  }
}

function disableTelegram() {
  try {
    return callNodeBackend('/api/telegram/disable', 'POST', null);
  } catch(e) {
    console.error('Error disabling Telegram:', e);
    return { success: false, error: e.message };
  }
}

function disconnectTelegram() {
  try {
    return callNodeBackend('/api/telegram/disconnect', 'POST', null);
  } catch(e) {
    console.error('Error disconnecting Telegram:', e);
    return { success: false, error: e.message };
  }
}

function getTelegramLogs() {
  try {
    return callNodeBackend('/api/audit-logs?action=telegram&limit=50', 'GET', null);
  } catch(e) {
    console.error('Error fetching Telegram logs:', e);
    return { success: false, logs: [], error: e.message };
  }
}

// ── USER MANAGEMENT & RBAC ───────────────────────────────────────────────

function getUsers() {
  try {
    return callNodeBackend('/api/users', 'GET', null);
  } catch(e) {
    console.error('Error fetching users:', e);
    return { success: false, users: [], error: e.message };
  }
}

function createUser(payload) {
  try {
    var userData = {
      email: payload.email,
      name: payload.name,
      role: payload.role || 'Sales Agent',
      phone: payload.phone,
      active: payload.active !== false,
      permissions: payload.permissions
    };
    
    return callNodeBackend('/api/users', 'POST', userData);
  } catch(e) {
    console.error('Error creating user:', e);
    return { success: false, error: e.message };
  }
}

function updateUser(payload) {
  try {
    var userData = {
      name: payload.name,
      role: payload.role,
      phone: payload.phone,
      active: payload.active,
      permissions: payload.permissions
    };
    
    return callNodeBackend('/api/users/' + payload.id, 'PUT', userData);
  } catch(e) {
    console.error('Error updating user:', e);
    return { success: false, error: e.message };
  }
}

function deleteUser(id) {
  try {
    return callNodeBackend('/api/users/' + id, 'DELETE', null);
  } catch(e) {
    console.error('Error deleting user:', e);
    return { success: false, error: e.message };
  }
}

function getUserRoles() {
  return {
    success: true,
    roles: [
      { id: 'admin', name: 'Admin', permissions: ['all'] },
      { id: 'manager', name: 'Manager', permissions: ['leads.read', 'leads.write', 'settings.read', 'integrations.read', 'audit.read'] },
      { id: 'agent', name: 'Sales Agent', permissions: ['leads.read', 'leads.write'] }
    ]
  };
}

function updateUserRole(payload) {
  try {
    var userData = {
      role: payload.role,
      permissions: payload.permissions
    };
    
    return callNodeBackend('/api/users/' + payload.userId, 'PUT', userData);
  } catch(e) {
    console.error('Error updating user role:', e);
    return { success: false, error: e.message };
  }
}

function getUserPermissions(userId) {
  try {
    var userResponse = callNodeBackend('/api/users/' + userId, 'GET', null);
    return userResponse;
  } catch(e) {
    console.error('Error fetching user permissions:', e);
    return { success: false, permissions: [], error: e.message };
  }
}

// ── SYSTEM SETTINGS ─────────────────────────────────────────────────────

function getSystemSettings() {
  try {
    return callNodeBackend('/api/settings', 'GET', null);
  } catch(e) {
    console.error('Error fetching system settings:', e);
    return { success: false, settings: [], error: e.message };
  }
}

function updateSystemSetting(payload) {
  try {
    var settingData = {
      value: payload.value,
      valueType: payload.valueType || 'string',
      category: payload.category || 'general',
      description: payload.description,
      isSecret: payload.isSecret || false
    };
    
    return callNodeBackend('/api/settings/' + payload.key, 'PUT', settingData);
  } catch(e) {
    console.error('Error updating system setting:', e);
    return { success: false, error: e.message };
  }
}

function getServerSettings() {
  try {
    var settings = callNodeBackend('/api/settings', 'GET', null);
    var serverSettings = {};
    
    if (settings.success && settings.settings) {
      settings.settings.forEach(function(setting) {
        if (setting.category === 'server' || setting.category === 'performance') {
          serverSettings[setting.key] = setting.value;
        }
      });
    }
    
    return { success: true, settings: serverSettings };
  } catch(e) {
    console.error('Error fetching server settings:', e);
    return { success: false, settings: {}, error: e.message };
  }
}

function updateServerSettings(payload) {
  var updates = [];
  
  if (payload.rateLimitEnabled !== undefined) {
    updates.push({ key: 'rate_limit_enabled', value: payload.rateLimitEnabled, valueType: 'boolean', category: 'performance' });
  }
  if (payload.rateLimitMaxRequests !== undefined) {
    updates.push({ key: 'rate_limit_max_requests', value: payload.rateLimitMaxRequests, valueType: 'number', category: 'performance' });
  }
  if (payload.rateLimitWindowMs !== undefined) {
    updates.push({ key: 'rate_limit_window_ms', value: payload.rateLimitWindowMs, valueType: 'number', category: 'performance' });
  }
  if (payload.retryCount !== undefined) {
    updates.push({ key: 'default_retry_count', value: payload.retryCount, valueType: 'number', category: 'general' });
  }
  if (payload.timeoutMs !== undefined) {
    updates.push({ key: 'default_timeout_ms', value: payload.timeoutMs, valueType: 'number', category: 'general' });
  }
  if (payload.webhookSecret !== undefined) {
    updates.push({ key: 'webhook_secret', value: payload.webhookSecret, valueType: 'string', category: 'security', isSecret: true });
  }
  
  var results = [];
  for (var i = 0; i < updates.length; i++) {
    try {
      var result = updateSystemSetting(updates[i]);
      results.push(result);
    } catch(e) {
      results.push({ success: false, error: e.message });
    }
  }
  
  return { success: true, results: results };
}

function getFeatureFlags() {
  try {
    var settings = callNodeBackend('/api/settings', 'GET', null);
    var featureFlags = {};
    
    if (settings.success && settings.settings) {
      settings.settings.forEach(function(setting) {
        if (setting.category === 'features') {
          featureFlags[setting.key] = setting.value;
        }
      });
    }
    
    return { success: true, flags: featureFlags };
  } catch(e) {
    console.error('Error fetching feature flags:', e);
    return { success: false, flags: {}, error: e.message };
  }
}

function updateFeatureFlags(payload) {
  var updates = [];
  
  if (payload.zohoAutoSync !== undefined) {
    updates.push({ key: 'zoho_auto_sync', value: payload.zohoAutoSync, valueType: 'boolean', category: 'integration' });
  }
  if (payload.aisensyAutoSend !== undefined) {
    updates.push({ key: 'aisensy_auto_send', value: payload.aisensyAutoSend, valueType: 'boolean', category: 'integration' });
  }
  if (payload.telegramAutoNotify !== undefined) {
    updates.push({ key: 'telegram_auto_notify', value: payload.telegramAutoNotify, valueType: 'boolean', category: 'integration' });
  }
  if (payload.gasAutoSync !== undefined) {
    updates.push({ key: 'gas_auto_sync', value: payload.gasAutoSync, valueType: 'boolean', category: 'integration' });
  }
  if (payload.sheetAutoSync !== undefined) {
    updates.push({ key: 'sheet_auto_sync', value: payload.sheetAutoSync, valueType: 'boolean', category: 'integration' });
  }
  
  var results = [];
  for (var i = 0; i < updates.length; i++) {
    try {
      var result = updateSystemSetting(updates[i]);
      results.push(result);
    } catch(e) {
      results.push({ success: false, error: e.message });
    }
  }
  
  return { success: true, results: results };
}

// ── AUDIT LOGS ───────────────────────────────────────────────────────────

function getAuditLogs(payload) {
  try {
    var filters = {};
    if (payload.action) filters.action = payload.action;
    if (payload.entityType) filters.entityType = payload.entityType;
    if (payload.entityId) filters.entityId = payload.entityId;
    if (payload.userId) filters.userId = payload.userId;
    if (payload.limit) filters.limit = payload.limit;
    
    var queryString = Object.keys(filters).map(function(key) {
      return key + '=' + encodeURIComponent(filters[key]);
    }).join('&');
    
    return callNodeBackend('/api/audit-logs?' + queryString, 'GET', null);
  } catch(e) {
    console.error('Error fetching audit logs:', e);
    return { success: false, logs: [], error: e.message };
  }
}

function getAuditLogDetail(logId) {
  // This would need to be implemented in Node backend
  return { success: true, message: 'Audit log detail not yet implemented' };
}

// ── SYNC MONITORING ───────────────────────────────────────────────────

function getSyncStatus() {
  try {
    var settings = callNodeBackend('/api/settings', 'GET', null);
    var syncSettings = {};
    
    if (settings.success && settings.settings) {
      settings.settings.forEach(function(setting) {
        if (setting.key.indexOf('auto_sync') > -1 || setting.key.indexOf('auto_send') > -1) {
          syncSettings[setting.key] = setting.value;
        }
      });
    }
    
    return { success: true, syncSettings: syncSettings };
  } catch(e) {
    console.error('Error fetching sync status:', e);
    return { success: false, syncSettings: {}, error: e.message };
  }
}

function getSyncHistory(payload) {
  try {
    return getAuditLogs({ action: 'sync', limit: payload.limit || 100 });
  } catch(e) {
    return { success: false, history: [], error: e.message };
  }
}

function retryFailedSync(syncId) {
  // This would need to be implemented in Node backend
  return { success: true, message: 'Sync retry not yet implemented' };
}

// ── SYSTEM HEALTH ───────────────────────────────────────────────────────

function getSystemHealth() {
  try {
    var nodeHealth = callNodeBackend('/health', 'GET', null);
    
    return {
      success: true,
      health: {
        node: nodeHealth.status || 'unknown',
        database: nodeHealth.database?.status || 'unknown',
        uptime: nodeHealth.uptime || 0,
        timestamp: new Date().toISOString()
      }
    };
  } catch(e) {
    console.error('Error fetching system health:', e);
    return {
      success: false,
      health: {
        node: 'error',
        database: 'error',
        error: e.message
      }
    };
  }
}

function getSystemMetrics() {
  try {
    var nodeHealth = callNodeBackend('/health', 'GET', null);
    
    return {
      success: true,
      metrics: {
        uptime: nodeHealth.uptime || 0,
        database: nodeHealth.database || {},
        integrations: nodeHealth.integrations || []
      }
    };
  } catch(e) {
    return { success: false, metrics: {}, error: e.message };
  }
}

function getDatabaseStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leadsSheet = ss.getSheetByName(Config.SHEETS.LEADS);
  
  if (!leadsSheet) {
    return { success: false, stats: {}, error: 'Leads sheet not found' };
  }
  
  var lastRow = leadsSheet.getLastRow();
  var lastCol = leadsSheet.getLastColumn();
  
  return {
    success: true,
    stats: {
      totalLeads: lastRow - 1,
      totalColumns: lastCol,
      sheetName: leadsSheet.getName()
    }
  };
}

// ── MASTER SHEET SYNC ─────────────────────────────────────────────────

function syncMasterSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leadsSheet = ss.getSheetByName(Config.SHEETS.LEADS);
  
  if (!leadsSheet) {
    return { success: false, error: 'Leads sheet not found' };
  }
  
  var data = leadsSheet.getDataRange().getValues();
  var syncedCount = 0;
  var errors = [];
  
  // Sync each lead to Node backend
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    
    try {
      var leadData = {
        leadId: row[0].toString(),
        source: row[2] ? row[2].toString() : '',
        name: row[3] ? row[3].toString() : '',
        phone: row[4] ? row[4].toString() : '',
        email: row[5] ? row[5].toString() : '',
        status: row[10] ? row[10].toString() : 'New',
        assignedTo: row[11] ? row[11].toString() : ''
      };
      
      callNodeBackend('/api/leads', 'POST', leadData);
      syncedCount++;
    } catch(e) {
      errors.push({ leadId: row[0].toString(), error: e.message });
    }
  }
  
  return {
    success: true,
    syncedCount: syncedCount,
    errors: errors
  };
}

function getSheetSyncStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leadsSheet = ss.getSheetByName(Config.SHEETS.LEADS);
  
  var lastSync = PropertiesService.getScriptProperties().getProperty('last_sheet_sync');
  
  return {
    success: true,
    lastSync: lastSync,
    sheetName: leadsSheet ? leadsSheet.getName() : 'Not found'
  };
}

// ── NODE BACKEND CONNECTION ───────────────────────────────────────────

function setNodeApiUrl(payload) {
  var config = Config.get();
  config.nodeApiUrl = payload.nodeApiUrl;
  Config.set(config);
  
  return {
    success: true,
    nodeApiUrl: payload.nodeApiUrl
  };
}

function testNodeBackendConnection() {
  try {
    var health = callNodeBackend('/health', 'GET', null);
    return {
      success: health.success || health.status === 'OK',
      health: health
    };
  } catch(e) {
    return {
      success: false,
      error: e.message
    };
  }
}

// ── LEAD MANAGEMENT ENHANCED ───────────────────────────────────────────

function getLeadsEnhanced(payload) {
  var sheet = Config.getSheet(Config.SHEETS.LEADS);
  var data = sheet.getDataRange().getValues();
  var search = (payload.search || '').toLowerCase().trim();
  var source = (payload.source || '').trim();
  var status = (payload.status || '').trim();
  var assignedTo = (payload.assignedTo || '').trim();
  var page = Math.max(1, parseInt(payload.page || '1', 10));
  var limit = Math.max(1, parseInt(payload.limit || '50', 10));
  var C = Config.LEAD_COLS;
  
  var leads = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[C.LEAD_ID]) continue;
    
    var lead = leadRowToObject(row, i + 1);
    if (source && lead.source !== source) continue;
    if (status && lead.status !== status) continue;
    if (assignedTo && lead.assignedTo !== assignedTo) continue;
    if (search) {
      var hay = (lead.name + ' ' + lead.phone + ' ' + lead.email + ' ' + lead.propertyTitle + ' ' + lead.leadId).toLowerCase();
      if (hay.indexOf(search) === -1) continue;
    }
    leads.push(lead);
  }
  
  leads.reverse();
  return {
    leads: leads.slice((page - 1) * limit, page * limit),
    total: leads.length,
    page: page,
    limit: limit
  };
}

function getLeadDetailEnhanced(leadId) {
  var sheet = Config.getSheet(Config.SHEETS.LEADS);
  var data = sheet.getDataRange().getValues();
  var C = Config.LEAD_COLS;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][C.LEAD_ID] && data[i][C.LEAD_ID].toString() === leadId.toString()) {
      return leadRowToObject(data[i], i + 1);
    }
  }
  
  return { success: false, error: 'Lead not found' };
}

function updateLeadEnhanced(payload) {
  var sheet = Config.getSheet(Config.SHEETS.LEADS);
  var data = sheet.getDataRange().getValues();
  var C = Config.LEAD_COLS;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][C.LEAD_ID] && data[i][C.LEAD_ID].toString() === payload.leadId.toString()) {
      var rowIndex = i + 1;
      
      // Update fields based on payload
      if (payload.status !== undefined) {
        sheet.getRange(rowIndex, C.STATUS + 1).setValue(payload.status);
      }
      if (payload.assignedTo !== undefined) {
        sheet.getRange(rowIndex, C.ASSIGNED_TO + 1).setValue(payload.assignedTo);
      }
      if (payload.notes !== undefined) {
        sheet.getRange(rowIndex, C.NOTES + 1).setValue(payload.notes);
      }
      if (payload.followupDue !== undefined) {
        sheet.getRange(rowIndex, C.FOLLOWUP_DUE + 1).setValue(payload.followupDue);
      }
      if (payload.meetingDate !== undefined) {
        sheet.getRange(rowIndex, C.MEETING_DATE + 1).setValue(payload.meetingDate);
      }
      if (payload.siteVisitDone !== undefined) {
        sheet.getRange(rowIndex, C.SITE_VISIT_DONE + 1).setValue(payload.siteVisitDone);
      }
      if (payload.dealValue !== undefined) {
        sheet.getRange(rowIndex, C.DEAL_VALUE + 1).setValue(payload.dealValue);
      }
      if (payload.commissionValue !== undefined) {
        sheet.getRange(rowIndex, C.COMMISSION_VALUE + 1).setValue(payload.commissionValue);
      }
      
      // Update last updated timestamp
      sheet.getRange(rowIndex, C.LAST_UPDATED + 1).setValue(new Date().toISOString());
      
      return { success: true, message: 'Lead updated successfully' };
    }
  }
  
  return { success: false, error: 'Lead not found' };
}

function getLeadTimeline(leadId) {
  try {
    // Get timeline from Node backend
    return callNodeBackend('/api/leads/' + leadId + '/timeline', 'GET', null);
  } catch(e) {
    console.error('Error fetching lead timeline:', e);
    
    // Fallback to sheet-based timeline
    var sheet = Config.getSheet(Config.SHEETS.LEADS);
    var data = sheet.getDataRange().getValues();
    var C = Config.LEAD_COLS;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][C.LEAD_ID] && data[i][C.LEAD_ID].toString() === leadId.toString()) {
        var row = data[i];
        return {
          success: true,
          timeline: [
            {
              event_type: 'lead_created',
              event_data: { source: row[C.SOURCE] },
              performed_at: row[C.CREATED_AT]
            },
            {
              event_type: 'current_status',
              event_data: { status: row[C.STATUS] },
              performed_at: row[C.LAST_UPDATED]
            }
          ]
        };
      }
    }
    
    return { success: false, timeline: [], error: 'Lead not found' };
  }
}

function bulkUpdateLeads(payload) {
  var results = { success: 0, failed: 0, errors: [] };
  
  if (!payload.leadIds || !Array.isArray(payload.leadIds)) {
    return { success: false, error: 'leadIds array required' };
  }
  
  for (var i = 0; i < payload.leadIds.length; i++) {
    try {
      var updatePayload = {
        leadId: payload.leadIds[i],
        status: payload.status,
        assignedTo: payload.assignedTo
      };
      
      var result = updateLeadEnhanced(updatePayload);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ leadId: payload.leadIds[i], error: result.error });
      }
    } catch(e) {
      results.failed++;
      results.errors.push({ leadId: payload.leadIds[i], error: e.message });
    }
  }
  
  return { success: true, results: results };
}

// ── HELPER FUNCTIONS ────────────────────────────────────────────────────

function buildResponse(status, success, message, data) {
  return {
    status: status,
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
}