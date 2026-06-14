/**
 * Config.gs - Centralized Configuration
 * Multi-tenant / white-label ready.
 */

var Config = {

  SHEETS: {
    LEADS:      'Leads',
    LOGS:       'Logs',
    ERRORS:     'Errors',
    DUPLICATES: 'Duplicate Leads',
    AUDIT:      'Audit Log',
    TEAMS:      'Team Members',
    SOURCES:    'Lead Sources',
    PROPERTIES: 'Property Inventory'
  },

  // Expanded lead columns for full profile
  LEAD_COLS: {
    LEAD_ID:0, TIMESTAMP:1, SOURCE:2, NAME:3, PHONE:4, EMAIL:5,
    PROPERTY_ID:6, PROPERTY_TITLE:7, MESSAGE:8, WA_STATUS:9,
    STATUS:10, ASSIGNED_TO:11, NOTES:12, CREATED_AT:13, LAST_UPDATED:14,
    BUDGET:15, LOCATION:16, REQUIREMENTS:17, TIMELINE:18,
    CALL_MADE:19, MEETING_SCHEDULED:20, SITE_VISIT_DONE:21,
    FOLLOWUP_DUE:22, NEXT_CALL:23, MEETING_DATE:24
  },

  LEAD_HEADERS: [
    'Lead ID','Timestamp','Source','Name','Phone','Email',
    'Property ID','Property Title','Message','WhatsApp Status',
    'Status','Assigned To','Notes','Created At','Last Updated',
    'Budget','Location','Requirements','Timeline',
    'Call Made','Meeting Scheduled','Site Visit Done',
    'Followup Due','Next Call','Meeting Date'
  ],
  LOG_HEADERS:  ['Timestamp','Lead ID','Source','Phone','Action','Result','Response Code','Message'],
  ERROR_HEADERS:['Timestamp','Lead ID','Error Type','Error Message','Payload Excerpt','Resolved'],
  DUPLICATE_HEADERS:['Timestamp','Dup ID','Original Lead ID','Source','Phone','Reason'],
  AUDIT_HEADERS:['Timestamp','User','Action','Field','Old Value','New Value','Notes'],
  TEAM_HEADERS: ['Name','Email','Phone','Role','Active'],
  SOURCE_HEADERS:['Source Key','Display Name','Enabled','Campaign Override','Webhook Param','Created At'],
  PROPERTY_HEADERS: ['Unit ID','Project','Tower','Unit No','Size (sqft)','Price','Status','Notes','Created At','Updated At'],

  // 9-stage real estate sales pipeline
  LEAD_STATUSES: ['New','Contacted','Interested','Meeting Scheduled','Site Visit Scheduled','Site Visit Done','Negotiation','Booked','Lost'],
  PROPERTY_STATUSES: ['Available','Blocked','Booked'],

  PROP_KEYS: {
    WEBHOOK_SECRET:     'WEBHOOK_SECRET',
    AISENSY_API_KEY:    'AISENSY_API_KEY',
    AISENSY_CAMPAIGN:   'AISENSY_CAMPAIGN',
    AISENSY_USERNAME:   'AISENSY_USERNAME',
    AISENSY_DEST_PHONE: 'AISENSY_DEST_PHONE',
    SHEET_ID:           'SHEET_ID',
    LEAD_COUNTER:       'LEAD_COUNTER',
    UNIT_COUNTER:       'UNIT_COUNTER',
    SETTINGS_JSON:      'SETTINGS_JSON',
    ROUTING_RULES_JSON: 'ROUTING_RULES_JSON',
    ADMIN_EMAIL:        'ADMIN_EMAIL',
    BRANDING_JSON:      'BRANDING_JSON',
    SOURCES_JSON:       'SOURCES_JSON',
    TEAMS_JSON:         'TEAMS_JSON',
    INTEGRATIONS_JSON:  'INTEGRATIONS_JSON',
    NODE_API_URL:       'NODE_API_URL',
    ZOHO_CLIENT_ID:     'ZOHO_CLIENT_ID',
    ZOHO_CLIENT_SECRET: 'ZOHO_CLIENT_SECRET',
    ZOHO_REFRESH_TOKEN: 'ZOHO_REFRESH_TOKEN',
    ZOHO_DOMAIN:        'ZOHO_DOMAIN'
  },

  DEFAULTS: {
    DUPLICATE_WINDOW_HOURS: 24,
    AISENSY_RETRY_DELAYS:   [5000,15000,30000],
    MAX_RETRIES:            3,
    AISENSY_BASE_URL:       'https://backend.aisensy.com/campaign/t1/api/v2'
  },

  get: function() {
    var props = PropertiesService.getScriptProperties();
    var settings={}, branding={}, sources=[], teams=[], integrations={};
    try { settings = JSON.parse(props.getProperty(Config.PROP_KEYS.SETTINGS_JSON) || '{}'); } catch(e){}
    try { branding = JSON.parse(props.getProperty(Config.PROP_KEYS.BRANDING_JSON) || '{}'); } catch(e){}
    try { sources  = JSON.parse(props.getProperty(Config.PROP_KEYS.SOURCES_JSON)  || 'null') || Config._defaultSources(); } catch(e){ sources = Config._defaultSources(); }
    try { teams    = JSON.parse(props.getProperty(Config.PROP_KEYS.TEAMS_JSON)    || '[]'); } catch(e){}
    try { integrations = JSON.parse(props.getProperty(Config.PROP_KEYS.INTEGRATIONS_JSON) || '{}'); } catch(e){}

    return {
      webhookSecret:   props.getProperty(Config.PROP_KEYS.WEBHOOK_SECRET)  || '',
      aiSensyApiKey:   props.getProperty(Config.PROP_KEYS.AISENSY_API_KEY) || '',
      aiSensyCampaign: props.getProperty(Config.PROP_KEYS.AISENSY_CAMPAIGN)|| '',
      aiSensyUsername: props.getProperty(Config.PROP_KEYS.AISENSY_USERNAME)|| '',
      aiSensyDestinationPhone: props.getProperty(Config.PROP_KEYS.AISENSY_DEST_PHONE) || '',
      adminEmail:      props.getProperty(Config.PROP_KEYS.ADMIN_EMAIL)     || '',
      nodeApiUrl:      props.getProperty(Config.PROP_KEYS.NODE_API_URL)    || '',
      ZOHO_CLIENT_ID:  props.getProperty(Config.PROP_KEYS.ZOHO_CLIENT_ID)  || '',
      ZOHO_CLIENT_SECRET: props.getProperty(Config.PROP_KEYS.ZOHO_CLIENT_SECRET) || '',
      ZOHO_REFRESH_TOKEN: props.getProperty(Config.PROP_KEYS.ZOHO_REFRESH_TOKEN) || '',
      ZOHO_DOMAIN:     props.getProperty(Config.PROP_KEYS.ZOHO_DOMAIN) || 'https://accounts.zoho.in',

      whatsappEnabled:      settings.whatsappEnabled      !== false,
      deduplicationEnabled: settings.deduplicationEnabled !== false,
      notificationsEnabled: settings.notificationsEnabled !== false,
      emailAlerts:          settings.emailAlerts          !== false,
      waAlerts:             settings.waAlerts             === true,
      alertPhone:           settings.alertPhone           || '',
      templateParams:       Array.isArray(settings.templateParams) ? settings.templateParams : ['name'],

      companyName:   branding.companyName  || 'OneX CRM',
      companyTagline:branding.companyTagline || 'Real Estate Sales Platform',
      accentColor:   branding.accentColor  || '#0051d5',
      logoEmoji:     branding.logoEmoji    || '🏢',

      sources: sources,
      teams: teams,
      integrations: integrations,

      _raw: settings,
      _branding: branding
    };
  },

  _defaultSources: function() {
    return [
      { key:'housing',     name:'Housing.com',    enabled:true,  campaignOverride:'', webhookParam:'housing' },
      { key:'99acres',     name:'99acres',         enabled:true,  campaignOverride:'', webhookParam:'99acres' },
      { key:'magicbricks', name:'MagicBricks',     enabled:false, campaignOverride:'', webhookParam:'magicbricks' },
      { key:'meta',        name:'Meta Lead Ads',   enabled:false, campaignOverride:'', webhookParam:'meta' },
      { key:'google',      name:'Google Ads',      enabled:false, campaignOverride:'', webhookParam:'google' },
      { key:'sulekha',     name:'Sulekha',         enabled:false, campaignOverride:'', webhookParam:'sulekha' },
      { key:'website',     name:'Website Form',    enabled:false, campaignOverride:'', webhookParam:'website' },
      { key:'indiamart',   name:'IndiaMART',        enabled:false, campaignOverride:'', webhookParam:'indiamart' }
    ];
  },

  saveSettings: function(updates) {
    var props = PropertiesService.getScriptProperties();
    var secretMap = {
      aiSensyApiKey:   Config.PROP_KEYS.AISENSY_API_KEY,
      aiSensyCampaign: Config.PROP_KEYS.AISENSY_CAMPAIGN,
      aiSensyUsername: Config.PROP_KEYS.AISENSY_USERNAME,
      aiSensyDestinationPhone: Config.PROP_KEYS.AISENSY_DEST_PHONE,
      adminEmail:      Config.PROP_KEYS.ADMIN_EMAIL,
      webhookSecret:   Config.PROP_KEYS.WEBHOOK_SECRET,
      NODE_API_URL:    Config.PROP_KEYS.NODE_API_URL,
      ZOHO_CLIENT_ID:  Config.PROP_KEYS.ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET: Config.PROP_KEYS.ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN: Config.PROP_KEYS.ZOHO_REFRESH_TOKEN,
      ZOHO_DOMAIN:     Config.PROP_KEYS.ZOHO_DOMAIN
    };
    var secretKeys = Object.keys(secretMap);
    for (var i=0; i<secretKeys.length; i++) {
      var k = secretKeys[i];
      if (updates[k] !== undefined) {
        if (updates[k] === '') {
          props.deleteProperty(secretMap[k]);
        } else {
          props.setProperty(secretMap[k], updates[k].toString());
        }
      }
    }
    var existing = {};
    try { existing = JSON.parse(props.getProperty(Config.PROP_KEYS.SETTINGS_JSON)||'{}'); } catch(e){}
    var flagKeys = ['whatsappEnabled','deduplicationEnabled','notificationsEnabled','emailAlerts','waAlerts','alertPhone','templateParams'];
    for (var f=0; f<flagKeys.length; f++) {
      var fk = flagKeys[f];
      if (updates[fk] !== undefined) existing[fk] = updates[fk];
    }
    props.setProperty(Config.PROP_KEYS.SETTINGS_JSON, JSON.stringify(existing));
    return true;
  },

  saveBranding: function(branding) {
    var props = PropertiesService.getScriptProperties();
    var existing = {};
    try { existing = JSON.parse(props.getProperty(Config.PROP_KEYS.BRANDING_JSON)||'{}'); } catch(e){}
    props.setProperty(Config.PROP_KEYS.BRANDING_JSON, JSON.stringify(Object.assign({}, existing, branding)));
    return true;
  },

  saveSources: function(sources) {
    PropertiesService.getScriptProperties().setProperty(Config.PROP_KEYS.SOURCES_JSON, JSON.stringify(sources));
    return true;
  },

  saveTeams: function(teams) {
    PropertiesService.getScriptProperties().setProperty(Config.PROP_KEYS.TEAMS_JSON, JSON.stringify(teams));
    return true;
  },

  saveIntegrations: function(integrations) {
    var props = PropertiesService.getScriptProperties();
    var existing = {};
    try { existing = JSON.parse(props.getProperty(Config.PROP_KEYS.INTEGRATIONS_JSON)||'{}'); } catch(e){}
    props.setProperty(Config.PROP_KEYS.INTEGRATIONS_JSON, JSON.stringify(Object.assign({}, existing, integrations)));
    return true;
  },

  getSpreadsheet: function() {
    var id = PropertiesService.getScriptProperties().getProperty(Config.PROP_KEYS.SHEET_ID);
    if (id && id.trim()) {
      try { return SpreadsheetApp.openById(id.trim()); } catch(e) { throw new Error('Cannot open sheet with ID: ' + id + ' — ' + e.message); }
    }
    try { return SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {
      throw new Error('No SHEET_ID configured and no active spreadsheet found. Set SHEET_ID in Script Properties.');
    }
  },

  getSheet: function(name) {
    var ss = Config.getSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); Config._initHeaders(sheet, name); }
    return sheet;
  },

  _initHeaders: function(sheet, name) {
    var hmap = {};
    hmap[Config.SHEETS.LEADS]      = Config.LEAD_HEADERS;
    hmap[Config.SHEETS.LOGS]       = Config.LOG_HEADERS;
    hmap[Config.SHEETS.ERRORS]     = Config.ERROR_HEADERS;
    hmap[Config.SHEETS.DUPLICATES] = Config.DUPLICATE_HEADERS;
    hmap[Config.SHEETS.AUDIT]      = Config.AUDIT_HEADERS;
    hmap[Config.SHEETS.TEAMS]      = Config.TEAM_HEADERS;
    hmap[Config.SHEETS.SOURCES]    = Config.SOURCE_HEADERS;
    hmap[Config.SHEETS.PROPERTIES] = Config.PROPERTY_HEADERS;
    var h = hmap[name]; if (!h) return;
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
    sheet.setFrozenRows(1);
  },

  /**
   * Migrates an existing Leads sheet to the new 25-column schema by
   * appending any missing headers. Safe to run multiple times.
   */
  migrateLeadsSheet: function() {
    var sheet = Config.getSheet(Config.SHEETS.LEADS);
    var lastCol = sheet.getLastColumn();
    var existingHeaders = lastCol > 0 ? sheet.getRange(1,1,1,lastCol).getValues()[0] : [];
    var target = Config.LEAD_HEADERS;
    if (existingHeaders.length < target.length) {
      var missing = target.slice(existingHeaders.length);
      sheet.getRange(1, existingHeaders.length+1, 1, missing.length).setValues([missing]);
      sheet.getRange(1,1,1,target.length).setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
      return { migrated:true, added: missing };
    }
    return { migrated:false, added: [] };
  }
};
