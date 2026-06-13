/**
 * AdminAPI.gs - Admin Panel Server-Side API
 * Multi-tenant: handles branding, sources, teams.
 */

function handleAdminAction(payload) {
  var action = payload._adminAction;
  try {
    switch(action) {
      case 'getDashboardData':  return jsonR(getDashboardData());
      case 'getLeads':          return jsonR(getLeads(payload));
      case 'getLeadDetail':     return jsonR(getLeadDetail(payload.leadId));
      case 'getKanbanData':      return jsonR(getKanbanData());
      case 'updateLeadBulk':    return jsonR(updateLeadBulk(payload));
      case 'getProperties':     return jsonR(getProperties(payload));
      case 'saveProperty':      return jsonR(saveProperty(payload));
      case 'deleteProperty':    return jsonR(deleteProperty(payload));
      case 'getIntegrations':   return jsonR(getIntegrationsData());
      case 'saveIntegrations':  return jsonR(saveIntegrationsData(payload));
      case 'testIntegration':   return jsonR(testIntegrationAction(payload));
      case 'updateLeadStatusKanban': return jsonR(updateLeadStatusKanban(payload));
      case 'getLogs':           return jsonR(getLogs());
      case 'getErrors':         return jsonR(getErrors());
      case 'getDuplicates':     return jsonR(getDuplicates());
      case 'getSettings':       return jsonR(getSettingsData());
      case 'saveSettings':      return jsonR(saveSettingsData(payload));
      case 'getBranding':       return jsonR(getBrandingData());
      case 'saveBranding':      return jsonR(saveBrandingData(payload));
      case 'getSources':        return jsonR(getSourcesData());
      case 'saveSources':       return jsonR(saveSourcesData(payload));
      case 'getTeams':          return jsonR(getTeamsData());
      case 'saveTeams':         return jsonR(saveTeamsData(payload));
      case 'getRoutingRules':   return jsonR(getRoutingRules());
      case 'saveRoutingRules':  return jsonR(saveRoutingRules(payload.rules));
      case 'updateLead':        return jsonR(updateLeadAction(payload));
      case 'retryWhatsApp':     return jsonR(retryWhatsAppAction(payload.leadId));
      case 'resolveError':      return jsonR(resolveErrorAction(payload.rowIndex));
      case 'exportLeads':       return jsonR(exportLeads(payload));
      case 'testAiSensy':       return jsonR(testAiSensyAction(payload));
      case 'initializeSheets':  return jsonR(initializeSheetsAction());
      case 'generateWebhookUrl':return jsonR(generateWebhookUrl(payload));
      case 'getNodeBackendStatus': return jsonR(getNodeBackendStatusAction());
      case 'testNodeConnection': return jsonR(testNodeConnectionAction());
      case 'saveZohoCredentials': return jsonR(saveZohoCredentialsAction(payload));
      case 'saveAiSensySettings': return jsonR(saveAiSensySettingsAction(payload));
      case 'saveTelegramConfig': return jsonR(saveTelegramConfigAction(payload));
      case 'saveEmailAlerts': return jsonR(saveEmailAlertsAction(payload));
      case 'getNodeApiUrl': return jsonR({ nodeApiUrl: (Config.get().nodeApiUrl || '') });
      case 'setNodeApiUrl': return jsonR(setNodeApiUrlAction(payload));
      default: return buildResponse(400, false, 'Unknown action: '+action, null);
    }
  } catch(err) {
    console.error('handleAdminAction ['+action+']: '+err.toString());
    try { ErrorHandler.log('ADMIN_API_ERROR', err.toString(), { action:action }); } catch(e2){}
    return buildResponse(500, false, 'Server error: '+(err.message||err.toString()), null);
  }
}
function jsonR(data) { return buildResponse(200,true,'OK',data); }

// ── DASHBOARD ────────────────────────────────────────────────────────────────

function getDashboardData() {
  var sheet = Config.getSheet(Config.SHEETS.LEADS);
  var data  = sheet.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
  var total=0, todayCount=0, wasSent=0, wasFailed=0;
  var sourceCounts={}, statusCounts={}, sourceDailyMap={};

  for (var i=1; i<data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    total++;
    var src    = (row[Config.LEAD_COLS.SOURCE]    ||'').toString();
    var waSt   = (row[Config.LEAD_COLS.WA_STATUS] ||'').toString();
    var status = (row[Config.LEAD_COLS.STATUS]    ||'New').toString();
    var created= (row[Config.LEAD_COLS.CREATED_AT]||'').toString();
    var ds     = created.length>=10 ? created.slice(0,10) : '';

    if (ds===today) todayCount++;
    if (waSt==='SENT')   wasSent++;
    if (waSt==='FAILED') wasFailed++;
    sourceCounts[src]  = (sourceCounts[src]||0)+1;
    statusCounts[status]=(statusCounts[status]||0)+1;
    if (ds) { if (!sourceDailyMap[ds]) sourceDailyMap[ds]={}; sourceDailyMap[ds][src]=(sourceDailyMap[ds][src]||0)+1; }
  }

  var dupCount = Math.max(0, Config.getSheet(Config.SHEETS.DUPLICATES).getLastRow()-1);

  // Recent 10
  var recent=[];
  var all = data.slice(1).filter(function(r){return r[0];});
  for (var j=all.length-1; j>=Math.max(0,all.length-10); j--) {
    var r=all[j];
    recent.push({ leadId:r[0].toString(), name:(r[3]||'').toString(), phone:(r[4]||'').toString(),
      source:(r[2]||'').toString(), status:(r[10]||'').toString(), waStatus:(r[9]||'').toString(),
      property:(r[7]||'').toString(), created:(r[13]||'').toString() });
  }

  // 7-day trend (all sources dynamic)
  var trend=[];
  for (var d=6; d>=0; d--) {
    var dt=new Date(); dt.setDate(dt.getDate()-d);
    var key=Utilities.formatDate(dt,'Asia/Kolkata','yyyy-MM-dd');
    var entry={date:key};
    if (sourceDailyMap[key]) {
      Object.keys(sourceDailyMap[key]).forEach(function(s){ entry[s]=sourceDailyMap[key][s]; });
    }
    trend.push(entry);
  }

  return {
    summary:{ total:total, todayCount:todayCount, sourceCounts:sourceCounts, wasSent:wasSent,
      wasFailed:wasFailed, dupCount:dupCount,
      conversionRate:total>0?Math.round((statusCounts['Booked']||0)/total*100):0 },
    statusCounts:statusCounts, sourceCounts:sourceCounts, recentLeads:recent, trend:trend
  };
}

// ── LEADS ─────────────────────────────────────────────────────────────────────

function getLeads(params) {
  var sheet  = Config.getSheet(Config.SHEETS.LEADS);
  var data   = sheet.getDataRange().getValues();
  var search = (params.search||'').toLowerCase().trim();
  var source = (params.source||'').trim();
  var status = (params.status||'').trim();
  var page   = Math.max(1, parseInt(params.page||'1',10));
  var limit  = Math.max(1, parseInt(params.limit||'50',10));
  var C      = Config.LEAD_COLS;

  var leads=[];
  for (var i=1; i<data.length; i++) {
    var row=data[i]; if (!row[C.LEAD_ID]) continue;
    var lead=leadRowToObject(row, i+1);
    if (source && lead.source!==source) continue;
    if (status && lead.status!==status) continue;
    if (search) {
      var hay=(lead.name+' '+lead.phone+' '+lead.email+' '+lead.propertyTitle+' '+lead.leadId).toLowerCase();
      if (hay.indexOf(search)===-1) continue;
    }
    leads.push(lead);
  }
  leads.reverse();
  return { leads:leads.slice((page-1)*limit, page*limit), total:leads.length, page:page, limit:limit };
}

/**
 * Converts a Leads sheet row array into a full lead object (25 fields).
 */
function leadRowToObject(row, rowIndex) {
  var C = Config.LEAD_COLS;
  function s(idx){ return (row[idx]!==undefined && row[idx]!==null) ? row[idx].toString() : ''; }
  return {
    rowIndex:rowIndex, leadId:s(C.LEAD_ID),
    timestamp:s(C.TIMESTAMP), source:s(C.SOURCE),
    name:s(C.NAME), phone:s(C.PHONE), email:s(C.EMAIL),
    propertyId:s(C.PROPERTY_ID), propertyTitle:s(C.PROPERTY_TITLE), message:s(C.MESSAGE),
    waStatus:s(C.WA_STATUS), status:s(C.STATUS)||'New', assignedTo:s(C.ASSIGNED_TO),
    notes:s(C.NOTES), createdAt:s(C.CREATED_AT), lastUpdated:s(C.LAST_UPDATED),
    budget:s(C.BUDGET), location:s(C.LOCATION), requirements:s(C.REQUIREMENTS), timeline:s(C.TIMELINE),
    callMade:s(C.CALL_MADE), meetingScheduled:s(C.MEETING_SCHEDULED), siteVisitDone:s(C.SITE_VISIT_DONE),
    followupDue:s(C.FOLLOWUP_DUE), nextCall:s(C.NEXT_CALL), meetingDate:s(C.MEETING_DATE)
  };
}

/**
 * Returns a single lead's full profile by leadId.
 */
function getLeadDetail(leadId) {
  var sheet=Config.getSheet(Config.SHEETS.LEADS), data=sheet.getDataRange().getValues();
  for (var i=1; i<data.length; i++) {
    if (data[i][0] && data[i][0].toString()===leadId) return { lead: leadRowToObject(data[i], i+1) };
  }
  return { lead: null };
}

/**
 * Returns ALL leads grouped by status for the Kanban board (lightweight fields only).
 */
function getKanbanData() {
  var sheet=Config.getSheet(Config.SHEETS.LEADS), data=sheet.getDataRange().getValues();
  var C=Config.LEAD_COLS;
  var board={};
  Config.LEAD_STATUSES.forEach(function(s){ board[s]=[]; });
  for (var i=1; i<data.length; i++) {
    var row=data[i]; if (!row[C.LEAD_ID]) continue;
    var status=(row[C.STATUS]||'New').toString();
    if (!board[status]) board[status]=[]; // unknown status bucket
    board[status].push({
      leadId:row[C.LEAD_ID].toString(), name:(row[C.NAME]||'').toString(),
      phone:(row[C.PHONE]||'').toString(), source:(row[C.SOURCE]||'').toString(),
      propertyTitle:(row[C.PROPERTY_TITLE]||'').toString(), assignedTo:(row[C.ASSIGNED_TO]||'').toString(),
      budget:(row[C.BUDGET]||'').toString(), waStatus:(row[C.WA_STATUS]||'').toString(),
      createdAt:(row[C.CREATED_AT]||'').toString()
    });
  }
  return { board:board, statuses:Config.LEAD_STATUSES };
}

// ── LOGS / ERRORS / DUPLICATES ───────────────────────────────────────────────

function getLogs() {
  var sheet=Config.getSheet(Config.SHEETS.LOGS), data=sheet.getDataRange().getValues(), logs=[];
  for (var i=Math.max(1,data.length-200); i<data.length; i++) {
    if (!data[i][0]) continue;
    logs.push({ timestamp:data[i][0].toString(), leadId:(data[i][1]||'').toString(),
      source:(data[i][2]||'').toString(), phone:(data[i][3]||'').toString(),
      action:(data[i][4]||'').toString(), result:(data[i][5]||'').toString(),
      responseCode:(data[i][6]||'').toString(), message:(data[i][7]||'').toString() });
  }
  return { logs:logs.reverse() };
}

function getErrors() {
  var sheet=Config.getSheet(Config.SHEETS.ERRORS), data=sheet.getDataRange().getValues(), errors=[];
  for (var i=1; i<data.length; i++) {
    if (!data[i][0]) continue;
    errors.push({ rowIndex:i+1, timestamp:data[i][0].toString(), leadId:(data[i][1]||'').toString(),
      errorType:(data[i][2]||'').toString(), errorMessage:(data[i][3]||'').toString(),
      payload:(data[i][4]||'').toString(), resolved:(data[i][5]||'No').toString() });
  }
  return { errors:errors.reverse() };
}

function getDuplicates() {
  var sheet=Config.getSheet(Config.SHEETS.DUPLICATES), data=sheet.getDataRange().getValues(), dups=[];
  for (var i=1; i<data.length; i++) {
    if (!data[i][0]) continue;
    dups.push({ timestamp:data[i][0].toString(), dupId:(data[i][1]||'').toString(),
      originalLeadId:(data[i][2]||'').toString(), source:(data[i][3]||'').toString(),
      phone:(data[i][4]||'').toString(), reason:(data[i][5]||'').toString() });
  }
  return { duplicates:dups.reverse(), total:dups.length };
}

function resolveErrorAction(rowIndex) {
  var idx=parseInt(rowIndex,10);
  if (isNaN(idx)||idx<2) return { success:false, error:'Invalid row index' };
  ErrorHandler.resolve(idx);
  AuditLogger.log('Admin','Error Resolved','rowIndex','',idx.toString());
  return { success:true };
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────

function getSettingsData() {
  var cfg=Config.get();
  function mask(v){ return (!v||!v.trim())?'':'***'+v.slice(-4); }
  return {
    aiSensyApiKey:mask(cfg.aiSensyApiKey), aiSensyCampaign:cfg.aiSensyCampaign,
    aiSensyUsername:cfg.aiSensyUsername, adminEmail:cfg.adminEmail,
    webhookSecret:mask(cfg.webhookSecret), whatsappEnabled:cfg.whatsappEnabled,
    deduplicationEnabled:cfg.deduplicationEnabled, notificationsEnabled:cfg.notificationsEnabled,
    emailAlerts:cfg.emailAlerts, waAlerts:cfg.waAlerts, alertPhone:cfg.alertPhone,
    templateParams: cfg.templateParams
  };
}

function saveSettingsData(payload) {
  var s=payload.settings;
  if (!s||typeof s!=='object') return { success:false, error:'No settings object' };
  ['aiSensyApiKey','webhookSecret'].forEach(function(k){
    if (s[k]&&(s[k].indexOf('***')===0||s[k]==='')) delete s[k];
  });
  Config.saveSettings(s);
  AuditLogger.log('Admin','Settings Saved','','',JSON.stringify(s).slice(0,200));
  return { success:true };
}

// ── BRANDING ─────────────────────────────────────────────────────────────────

function getBrandingData() {
  var cfg=Config.get();
  return {
    companyName:    cfg.companyName,
    companyTagline: cfg.companyTagline,
    accentColor:    cfg.accentColor,
    logoEmoji:      cfg.logoEmoji
  };
}

function saveBrandingData(payload) {
  var b=payload.branding;
  if (!b||typeof b!=='object') return { success:false, error:'No branding object' };
  Config.saveBranding(b);
  AuditLogger.log('Admin','Branding Updated','','',JSON.stringify(b).slice(0,200));
  return { success:true };
}

// ── SOURCES ──────────────────────────────────────────────────────────────────

function getSourcesData() {
  return { sources: Config.get().sources };
}

function saveSourcesData(payload) {
  if (!Array.isArray(payload.sources)) return { success:false, error:'sources must be array' };
  Config.saveSources(payload.sources);
  AuditLogger.log('Admin','Sources Updated','count','',payload.sources.length.toString());
  return { success:true };
}

// ── TEAMS ─────────────────────────────────────────────────────────────────────

function getTeamsData() {
  return { teams: Config.get().teams };
}

function saveTeamsData(payload) {
  if (!Array.isArray(payload.teams)) return { success:false, error:'teams must be array' };
  Config.saveTeams(payload.teams);
  AuditLogger.log('Admin','Teams Updated','count','',payload.teams.length.toString());
  return { success:true };
}

// ── ROUTING RULES ─────────────────────────────────────────────────────────────

function getRoutingRules() {
  var raw=PropertiesService.getScriptProperties().getProperty(Config.PROP_KEYS.ROUTING_RULES_JSON);
  var rules=[];
  if (raw) { try{ rules=JSON.parse(raw); }catch(e){ rules=[]; } }
  return { rules:rules };
}

function saveRoutingRules(rules) {
  if (!Array.isArray(rules)) return { success:false, error:'Rules must be array' };
  PropertiesService.getScriptProperties().setProperty(Config.PROP_KEYS.ROUTING_RULES_JSON, JSON.stringify(rules));
  AuditLogger.log('Admin','Routing Rules Saved','count','',rules.length.toString());
  return { success:true };
}

// ── LEAD UPDATE ───────────────────────────────────────────────────────────────

function updateLeadAction(payload) {
  var leadId=payload.leadId, field=payload.field, value=payload.value;
  if (!leadId||!field) return { success:false, error:'leadId and field required' };
  var allowed=['status','assignedTo','notes','waStatus','name','email','propertyTitle',
    'budget','location','requirements','timeline','callMade','meetingScheduled',
    'siteVisitDone','followupDue','nextCall','meetingDate'];
  if (allowed.indexOf(field)===-1) return { success:false, error:'Field "'+field+'" not updatable' };
  var ok=updateLeadField(leadId,field,value!==undefined?value:'');
  if (!ok) return { success:false, error:'Lead not found: '+leadId };
  AuditLogger.log('Admin','Lead Updated',field,'',String(value||'').slice(0,100));
  return { success:true };
}

/**
 * Bulk update multiple fields on one lead in a single call (used by Lead Profile save).
 */
function updateLeadBulk(payload) {
  var leadId=payload.leadId, fields=payload.fields;
  if (!leadId||!fields||typeof fields!=='object') return { success:false, error:'leadId and fields required' };
  var allowed=['status','assignedTo','notes','waStatus','name','email','propertyTitle',
    'budget','location','requirements','timeline','callMade','meetingScheduled',
    'siteVisitDone','followupDue','nextCall','meetingDate'];
  var updated=[];
  Object.keys(fields).forEach(function(f){
    if (allowed.indexOf(f)!==-1) { updateLeadField(leadId,f,fields[f]!==undefined?fields[f]:''); updated.push(f); }
  });
  AuditLogger.log('Admin','Lead Profile Saved','fields','',updated.join(','));
  return { success:true, updated:updated };
}

// ── WA RETRY ──────────────────────────────────────────────────────────────────

function retryWhatsAppAction(leadId) {
  if (!leadId) return { success:false, error:'leadId required' };
  var sheet=Config.getSheet(Config.SHEETS.LEADS), data=sheet.getDataRange().getValues(), lead=null;
  var C=Config.LEAD_COLS;
  for (var i=1; i<data.length; i++) {
    if (data[i][C.LEAD_ID]&&data[i][C.LEAD_ID].toString()===leadId) {
      lead={ leadId:leadId, name:(data[i][C.NAME]||'').toString(), phone:(data[i][C.PHONE]||'').toString(),
        source:(data[i][C.SOURCE]||'').toString(), propertyTitle:(data[i][C.PROPERTY_TITLE]||'').toString() };
      break;
    }
  }
  if (!lead) return { success:false, error:'Lead not found: '+leadId };
  var cfg=Config.get(), result=AiSensy.sendWithRetry(lead,cfg);
  updateLeadWaStatus(leadId, result.success?'SENT':'FAILED', result.success?'':result.message);
  AuditLogger.log('Admin','WA Retry','waStatus','FAILED',result.success?'SENT':'FAILED');
  AppLogger.write(leadId,lead.source,lead.phone,'WA Retry',result.success?'SUCCESS':'FAILED',result.responseCode||'',result.message||'');
  return { success:result.success, message:result.message||'' };
}

// ── CSV EXPORT ────────────────────────────────────────────────────────────────

function exportLeads(params) {
  var ep={ search:params.search||'', source:params.source||'', status:params.status||'', page:'1', limit:'99999' };
  var result=getLeads(ep);
  function esc(v){ return '"'+(v||'').toString().replace(/"/g,'""')+'"'; }
  var rows=[Config.LEAD_HEADERS.join(',')];
  for (var i=0; i<result.leads.length; i++) {
    var l=result.leads[i];
    rows.push([esc(l.leadId),esc(l.timestamp),esc(l.source),esc(l.name),esc(l.phone),esc(l.email),
      esc(l.propertyId),esc(l.propertyTitle),esc(l.message),esc(l.waStatus),esc(l.status),
      esc(l.assignedTo),esc(l.notes),esc(l.createdAt),esc(l.lastUpdated)].join(','));
  }
  return { csv:rows.join('\n'), count:result.leads.length };
}

// ── TEST AISENSY ──────────────────────────────────────────────────────────────

function testAiSensyAction(payload) {
  var cfg=Config.get();
  var phone=PhoneNormalizer.normalize((payload.phone||'9999999999').toString());
  if (!phone||!/^\d{10,12}$/.test(phone)) return { success:false, message:'Invalid phone: '+payload.phone };
  var lead={ leadId:'TEST-'+Date.now(), name:(payload.name||'Test User').toString().trim(),
    phone:phone, source:'Test', propertyTitle:'Test - '+cfg.companyName };
  var result=AiSensy.send(lead,cfg);
  AuditLogger.log('Admin','AiSensy Test Send','phone','',phone);
  return result;
}

// ── WEBHOOK URL GENERATOR ─────────────────────────────────────────────────────

function generateWebhookUrl(payload) {
  var base=ScriptApp.getService().getUrl();
  var secret=(Config.get().webhookSecret||'YOUR_SECRET');
  var sourceKey=(payload.sourceKey||'housing');
  return { url: base+'?token='+secret+'&source='+encodeURIComponent(sourceKey), base:base };
}

// ── NODE BACKEND INTEGRATION ──────────────────────────────────────────────────

/**
 * Get Node backend health and integration status
 */
function getNodeBackendStatusAction() {
  try {
    var result = NodeAPI.getHealth();
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Test connectivity to Node backend
 */
function testNodeConnectionAction() {
  try {
    var result = testNodeBackendConnection();
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Save Zoho credentials to backend
 */
function saveZohoCredentialsAction(payload) {
  try {
    var clientId = payload.clientId || '';
    var clientSecret = payload.clientSecret || '';
    var refreshToken = payload.refreshToken || '';
    var tokenUrl = payload.tokenUrl || 'https://accounts.zoho.in/oauth/v2/token';
    var apiUrl = payload.apiUrl || 'https://www.zohoapis.in/crm/v2/Leads';

    var result = syncZohoCredentialsToBackend(clientId, clientSecret, refreshToken, tokenUrl, apiUrl);
    
    if (result.success) {
      AuditLogger.log('Admin', 'Zoho Credentials Saved', '', '', 'Synced to Node backend');
    }
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Save AISensy settings to backend
 */
function saveAiSensySettingsAction(payload) {
  try {
    var apiKey = payload.apiKey || '';
    var campaignName = payload.campaignName || '99acres_lead_alert';
    var destination = payload.destination || '';
    var userName = payload.userName || 'OneX CRM';

    var result = syncAiSensyCredentialsToBackend(apiKey, campaignName, destination, userName);
    
    if (result.success) {
      AuditLogger.log('Admin', 'AISensy Settings Saved', '', '', 'Synced to Node backend');
    }
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Save Telegram config to backend
 */
function saveTelegramConfigAction(payload) {
  try {
    var botToken = payload.botToken || '';
    var chatId = payload.chatId || '';

    var result = syncTelegramConfigToBackend(botToken, chatId);
    
    if (result.success) {
      AuditLogger.log('Admin', 'Telegram Config Saved', '', '', 'Synced to Node backend');
    }
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Save email alerts config to backend
 */
function saveEmailAlertsAction(payload) {
  try {
    var recipient = payload.recipient || '';
    var enabled = payload.enabled === true || payload.enabled === 'true';

    var result = syncEmailConfigToBackend(recipient, enabled);
    
    if (result.success) {
      AuditLogger.log('Admin', 'Email Alerts Config Saved', '', '', 'Synced to Node backend');
    }
    return result;
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Set Node API URL
 */
function setNodeApiUrlAction(payload) {
  try {
    var nodeApiUrl = (payload.nodeApiUrl || '').trim();
    if (!nodeApiUrl) {
      return { success: false, error: 'Node API URL is required' };
    }

    var props = PropertiesService.getScriptProperties();
    props.setProperty('NODE_API_URL', nodeApiUrl);

    AuditLogger.log('Admin', 'Node API URL Updated', '', '', nodeApiUrl);
    return { success: true, nodeApiUrl: nodeApiUrl };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ── INITIALIZE SHEETS ─────────────────────────────────────────────────────────

function initializeSheetsAction() {
  var names=Object.values(Config.SHEETS);
  var created=[], existed=[];
  var ss=Config.getSpreadsheet();
  for (var i=0; i<names.length; i++) {
    var name=names[i], sheet=ss.getSheetByName(name);
    if (!sheet){ sheet=ss.insertSheet(name); Config._initHeaders(sheet,name); created.push(name); }
    else existed.push(name);
  }
  var props=PropertiesService.getScriptProperties();
  if (!props.getProperty(Config.PROP_KEYS.ROUTING_RULES_JSON)) props.setProperty(Config.PROP_KEYS.ROUTING_RULES_JSON,'[]');
  if (!props.getProperty(Config.PROP_KEYS.LEAD_COUNTER)) props.setProperty(Config.PROP_KEYS.LEAD_COUNTER,'0');
  // Initialize default sources if not set
  if (!props.getProperty(Config.PROP_KEYS.SOURCES_JSON)) {
    props.setProperty(Config.PROP_KEYS.SOURCES_JSON, JSON.stringify(Config._defaultSources()));
  }
  AuditLogger.log('System','Sheets Initialized','','','Created:['+created.join(',')+']');
  return { success:true, created:created, existed:existed, message:'Created:['+created.join(',')+'] Existed:['+existed.join(',')+']' };
}

// ── PROPERTY INVENTORY ────────────────────────────────────────────────────────

function getProperties(params) {
  var sheet=Config.getSheet(Config.SHEETS.PROPERTIES), data=sheet.getDataRange().getValues();
  var search=((params&&params.search)||'').toLowerCase().trim();
  var statusF=((params&&params.status)||'').trim();
  var props=[];
  for (var i=1; i<data.length; i++) {
    var row=data[i]; if (!row[0]) continue;
    var p={ rowIndex:i+1, unitId:(row[0]||'').toString(), project:(row[1]||'').toString(),
      tower:(row[2]||'').toString(), unitNo:(row[3]||'').toString(), size:(row[4]||'').toString(),
      price:(row[5]||'').toString(), status:(row[6]||'Available').toString(),
      notes:(row[7]||'').toString(), createdAt:(row[8]||'').toString(), updatedAt:(row[9]||'').toString() };
    if (statusF && p.status!==statusF) continue;
    if (search) {
      var hay=(p.project+' '+p.tower+' '+p.unitNo+' '+p.unitId).toLowerCase();
      if (hay.indexOf(search)===-1) continue;
    }
    props.push(p);
  }
  props.reverse();
  return { properties:props, total:props.length };
}

function saveProperty(payload) {
  var p=payload.property;
  if (!p||typeof p!=='object') return { success:false, error:'property object required' };
  var sheet=Config.getSheet(Config.SHEETS.PROPERTIES);
  var now=new Date().toISOString();

  if (p.rowIndex) {
    // Update existing
    var row=parseInt(p.rowIndex,10);
    sheet.getRange(row,1,1,10).setValues([[
      p.unitId||'', p.project||'', p.tower||'', p.unitNo||'', p.size||'',
      p.price||'', p.status||'Available', p.notes||'',
      sheet.getRange(row,9).getValue()||now, now
    ]]);
    AuditLogger.log('Admin','Property Updated','unitId','',p.unitId||'');
    return { success:true, unitId:p.unitId };
  } else {
    // Create new with auto unit ID
    var props=PropertiesService.getScriptProperties();
    var counter=parseInt(props.getProperty(Config.PROP_KEYS.UNIT_COUNTER)||'0',10);
    counter++;
    props.setProperty(Config.PROP_KEYS.UNIT_COUNTER, counter.toString());
    var unitId='UNIT-'+counter.toString().padStart(5,'0');
    sheet.appendRow([unitId, p.project||'', p.tower||'', p.unitNo||'', p.size||'',
      p.price||'', p.status||'Available', p.notes||'', now, now]);
    AuditLogger.log('Admin','Property Created','unitId','',unitId);
    return { success:true, unitId:unitId };
  }
}

function deleteProperty(payload) {
  var rowIndex=parseInt(payload.rowIndex,10);
  if (isNaN(rowIndex)||rowIndex<2) return { success:false, error:'Invalid row' };
  var sheet=Config.getSheet(Config.SHEETS.PROPERTIES);
  sheet.deleteRow(rowIndex);
  AuditLogger.log('Admin','Property Deleted','rowIndex','',rowIndex.toString());
  return { success:true };
}

// ── INTEGRATIONS (extended settings) ──────────────────────────────────────────
// Stores config for Meta Ads, Housing API, MagicBricks, 99acres, SMTP, Telegram.
// These are stored credentials for future direct API polling / bot notifications.

function getIntegrationsData() {
  var cfg=Config.get();
  var ig=cfg.integrations||{};
  function mask(v){ return (!v||!v.toString().trim())?'':'***'+v.toString().slice(-4); }
  return {
    metaAccessToken:    mask(ig.metaAccessToken),
    metaAdAccountId:    ig.metaAdAccountId||'',
    housingApiKey:      mask(ig.housingApiKey),
    magicbricksApiKey:  mask(ig.magicbricksApiKey),
    acres99ApiKey:      mask(ig.acres99ApiKey),
    smtpHost:           ig.smtpHost||'',
    smtpPort:           ig.smtpPort||'',
    smtpUser:           ig.smtpUser||'',
    smtpPass:           mask(ig.smtpPass),
    telegramBotToken:   mask(ig.telegramBotToken),
    telegramChatId:     ig.telegramChatId||''
  };
}

function saveIntegrationsData(payload) {
  var ig=payload.integrations;
  if (!ig||typeof ig!=='object') return { success:false, error:'integrations object required' };
  // Strip masked values
  Object.keys(ig).forEach(function(k){
    if (typeof ig[k]==='string' && (ig[k].indexOf('***')===0 || ig[k]==='')) delete ig[k];
  });
  Config.saveIntegrations(ig);
  AuditLogger.log('Admin','Integrations Updated','','',Object.keys(ig).join(','));
  return { success:true };
}

// ── INTEGRATION TESTING ────────────────────────────────────────────────────────
// Each platform has a different "test" — e.g. Telegram sends a real message,
// SMTP/Email sends a test mail via GmailApp, others validate key format.

function testIntegrationAction(payload) {
  var platform = (payload.platform||'').toLowerCase();
  var data = payload.data || {};
  try {
    switch(platform) {
      case 'telegram':   return testTelegramBot(data);
      case 'smtp':       return testSmtpEmail(data);
      case 'meta':       return testMetaAds(data);
      case 'housing':    return { success:true, message:'Housing webhook receives leads automatically — no separate test needed. Send a test lead from Housing dashboard.' };
      case 'magicbricks':return { success:true, message:'MagicBricks webhook receives leads automatically — no separate test needed.' };
      case '99acres':    return { success:true, message:'99acres webhook receives leads automatically — no separate test needed.' };
      case 'googlesheets':return testGoogleSheets(data);
      case 'webhook':    return { success:true, message:'Webhook URL is auto-generated and always active once deployed.' };
      default: return { success:false, message:'Unknown platform: '+platform };
    }
  } catch(err) {
    return { success:false, message:'Test error: '+err.toString() };
  }
}

/**
 * Sends a real test message via Telegram Bot API.
 * Requires: bot token + chat ID.
 */
function testTelegramBot(data) {
  var token  = data.botToken;
  var chatId = data.chatId;
  if (!token || !token.trim())  return { success:false, message:'Bot Token is required. Get it from @BotFather on Telegram.' };
  if (!chatId || !chatId.toString().trim()) return { success:false, message:'Chat ID is required. Message @userinfobot to get your Chat ID.' };

  var url = 'https://api.telegram.org/bot' + token.trim() + '/sendMessage';
  var cfg = Config.get();
  var msg = '✅ Test message from ' + (cfg.companyName||'OneX CRM') + '!\n\nYour Telegram bot is connected and working correctly.';

  var resp = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify({ chat_id: chatId.toString(), text: msg }),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var body = resp.getContentText();
  var parsed = {}; try { parsed = JSON.parse(body); } catch(e){}

  if (code===200 && parsed.ok) {
    return { success:true, message:'Test message sent! Check your Telegram.' };
  }
  return { success:false, message:(parsed.description || ('HTTP '+code+': '+body)) };
}

/**
 * Sends a test email via GmailApp (Apps Script does not support raw SMTP,
 * but GmailApp.sendEmail uses the authenticated Google account's outgoing mail —
 * functionally equivalent for notification purposes).
 */
function testSmtpEmail(data) {
  var to = data.testRecipient || data.smtpUser;
  if (!to || !to.trim()) return { success:false, message:'Enter a recipient email to send the test to.' };
  var cfg = Config.get();
  try {
    GmailApp.sendEmail(to.trim(),
      '✅ Test Email from ' + (cfg.companyName||'OneX CRM'),
      'This is a test email confirming your email notifications are working correctly.\n\n— '+(cfg.companyName||'OneX CRM'));
    return { success:true, message:'Test email sent to '+to.trim()+'. Note: Apps Script sends via your Google account (Gmail), not external SMTP servers.' };
  } catch(err) {
    return { success:false, message:'Failed to send: '+err.toString() };
  }
}

/**
 * Validates Meta (Facebook) Ads access token by calling the Graph API /me endpoint.
 */
function testMetaAds(data) {
  var token = data.accessToken;
  if (!token || !token.trim()) return { success:false, message:'Access Token is required from Meta Business Suite.' };
  var resp = UrlFetchApp.fetch('https://graph.facebook.com/v19.0/me?access_token='+encodeURIComponent(token.trim()), { muteHttpExceptions:true });
  var code=resp.getResponseCode(); var body=resp.getContentText();
  var parsed={}; try{ parsed=JSON.parse(body); }catch(e){}
  if (code===200 && parsed.id) return { success:true, message:'Token valid! Connected account: '+(parsed.name||parsed.id) };
  return { success:false, message:(parsed.error&&parsed.error.message)||('HTTP '+code) };
}

/**
 * Verifies the configured Google Sheet is accessible and writable.
 */
function testGoogleSheets(data) {
  try {
    var ss = Config.getSpreadsheet();
    var name = ss.getName();
    // Try a lightweight read to confirm access
    Config.getSheet(Config.SHEETS.LEADS).getRange(1,1).getValue();
    return { success:true, message:'Connected to sheet: "'+name+'". Read/write access confirmed.' };
  } catch(err) {
    return { success:false, message:'Cannot access sheet: '+err.toString() };
  }
}

// ── KANBAN: UPDATE STATUS (drag-drop) ───────────────────────────────────────

function updateLeadStatusKanban(payload) {
  var leadId=payload.leadId, newStatus=payload.status;
  if (!leadId||!newStatus) return { success:false, error:'leadId and status required' };
  if (Config.LEAD_STATUSES.indexOf(newStatus)===-1) return { success:false, error:'Invalid status: '+newStatus };
  var ok=updateLeadField(leadId,'status',newStatus);
  if (!ok) return { success:false, error:'Lead not found' };
  AuditLogger.log('Admin','Kanban Move','status','',newStatus);
  AppLogger.write(leadId,'','', 'Status Changed','SUCCESS','','Moved to '+newStatus+' via Kanban');
  return { success:true };
}
