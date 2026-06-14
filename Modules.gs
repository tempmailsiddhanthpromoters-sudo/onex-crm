/**
 * Modules.gs
 * Contains: PhoneNormalizer, DuplicateChecker, AiSensy, AppLogger, ErrorHandler, AuditLogger
 *
 * IMPORTANT: GAS has a built-in global called "Logger". We use "AppLogger" to avoid collision.
 */

// ─── PHONE NORMALIZER ─────────────────────────────────────────────────────────

var PhoneNormalizer = {
  /**
   * Normalize Indian phone numbers to 12-digit format: 91XXXXXXXXXX
   * Handles: +91-XXXXX-XXXXX, 091XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
   */
  normalize: function(raw) {
    if (!raw) return '';
    var digits = raw.toString().replace(/\D/g, '');
    if (digits.length === 0) return '';

    // Already 91XXXXXXXXXX (12 digits starting with 91)
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    // 0XXXXXXXXXX (11 digits with leading 0)
    if (digits.length === 11 && digits.charAt(0) === '0') {
      return '91' + digits.slice(1);
    }
    // XXXXXXXXXX (10 digits, no prefix)
    if (digits.length === 10) {
      return '91' + digits;
    }
    // +91XXXXXXXXXX given as 1191XXXXXXXXXX (extra country code doubled) - rare edge case
    if (digits.length === 14 && digits.startsWith('9191')) {
      return digits.slice(2);
    }
    // Too long starting with 91 - take first 12
    if (digits.length > 12 && digits.startsWith('91')) {
      return digits.slice(0, 12);
    }
    // Return as-is; validation will reject if wrong
    return digits;
  },

  display: function(normalized) {
    if (!normalized || normalized.length < 10) return normalized || '';
    if (normalized.length === 12) {
      return '+' + normalized.slice(0,2) + ' ' + normalized.slice(2,7) + ' ' + normalized.slice(7);
    }
    return normalized;
  }
};


// ─── DUPLICATE CHECKER ────────────────────────────────────────────────────────

var DuplicateChecker = {
  WINDOW_HOURS: 24,

  check: function(phone, source) {
    try {
      var sheet   = Config.getSheet(Config.SHEETS.LEADS);
      var data    = sheet.getDataRange().getValues();
      var now     = new Date();
      var windowMs = this.WINDOW_HOURS * 3600 * 1000;

      // Scan from bottom up (most recent first for speed)
      for (var i = data.length - 1; i >= 1; i--) {
        var row = data[i];
        if (!row[Config.LEAD_COLS.LEAD_ID]) continue;

        var rowPhone  = (row[Config.LEAD_COLS.PHONE]  || '').toString().trim();
        var rowSource = (row[Config.LEAD_COLS.SOURCE] || '').toString().trim();

        if (rowPhone !== phone || rowSource !== source) continue;

        var createdVal = row[Config.LEAD_COLS.CREATED_AT] || row[Config.LEAD_COLS.TIMESTAMP];
        var rowTime = new Date(createdVal);
        if (isNaN(rowTime.getTime())) continue;

        var age = now.getTime() - rowTime.getTime();
        if (age < windowMs) {
          return {
            isDuplicate:    true,
            originalLeadId: row[Config.LEAD_COLS.LEAD_ID].toString(),
            ageHours:       Math.round(age / 3600000 * 10) / 10
          };
        }
      }
      return { isDuplicate: false };
    } catch (err) {
      // Fail open: if checker crashes, allow lead through
      console.error('DuplicateChecker.check error: ' + err.toString());
      return { isDuplicate: false };
    }
  },

  saveDuplicate: function(lead, originalLeadId) {
    try {
      var sheet = Config.getSheet(Config.SHEETS.DUPLICATES);
      sheet.appendRow([
        new Date().toISOString(),
        'DUP-' + Date.now(),
        originalLeadId,
        lead.source,
        lead.phone,
        'Same phone+source within ' + this.WINDOW_HOURS + 'h. Original: ' + originalLeadId
      ]);
    } catch (err) {
      console.error('DuplicateChecker.saveDuplicate error: ' + err.toString());
    }
  }
};


// ─── AISENSY INTEGRATION ──────────────────────────────────────────────────────

var AiSensy = {

  sendWithRetry: function(lead, cfg) {
    var delays  = Config.DEFAULTS.AISENSY_RETRY_DELAYS;
    var maxTries = Config.DEFAULTS.MAX_RETRIES;
    var lastResult = null;

    for (var attempt = 0; attempt < maxTries; attempt++) {
      if (attempt > 0) {
        console.log('AiSensy retry attempt ' + (attempt + 1) + ' for ' + lead.phone);
        Utilities.sleep(delays[attempt - 1]);
      }
      lastResult = this.send(lead, cfg);
      if (lastResult.success) return lastResult;
    }
    return lastResult;
  },

  send: function(lead, cfg) {
    try {
      if (!cfg.aiSensyApiKey || cfg.aiSensyApiKey.trim() === '') {
        return { success: false, responseCode: 0, message: 'AiSensy API key not configured' };
      }

      // Campaign already overridden by Webhook.gs source-specific config if applicable
      var campaign = cfg.aiSensyCampaign || '';
      if (!campaign || campaign.trim() === '') {
        return { success: false, responseCode: 0, message: 'Campaign name not configured' };
      }

      // Template params: configurable count/order via Settings (cfg.templateParams)
      // Default: most "welcome" templates use a single {{1}} = name
      var paramFields = (cfg.templateParams && cfg.templateParams.length) ? cfg.templateParams : ['name'];
      var fieldMap = {
        name:          (lead.name || '').toString(),
        propertyTitle: (lead.propertyTitle || 'your enquiry').toString(),
        source:        (lead.source || '').toString(),
        phone:         (lead.phone || '').toString()
      };
      var templateParams = paramFields.map(function(f){ return fieldMap[f] !== undefined ? fieldMap[f] : ''; });

      var requestPayload = {
        apiKey:       cfg.aiSensyApiKey.trim(),
        campaignName: campaign.trim(),
        destination:  lead.phone,
        userName:     cfg.aiSensyUsername || cfg.companyName || 'CRM',
        templateParams: templateParams,
        source: (cfg.companyName || 'CRM') + '-Webhook',
        media:         {},
        buttons:       [],
        carouselCards: [],
        location:      {},
        paramsFallbackValue: { FirstName: (lead.name || '').toString() }
      };

      var options = {
        method:             'post',
        contentType:        'application/json',
        payload:            JSON.stringify(requestPayload),
        muteHttpExceptions: true,
        headers:            { 'Accept': 'application/json' }
      };

      var response = UrlFetchApp.fetch(Config.DEFAULTS.AISENSY_BASE_URL, options);
      var code     = response.getResponseCode();
      var bodyText = response.getContentText();
      var parsed   = {};
      try { parsed = JSON.parse(bodyText); } catch(e) {}

      if (code >= 200 && code < 300) {
        return { success: true,  responseCode: code, message: 'Sent',  raw: bodyText };
      } else {
        var errMsg = (parsed && (parsed.message || parsed.error)) ? (parsed.message || parsed.error) : ('HTTP ' + code);
        return { success: false, responseCode: code, message: errMsg, raw: bodyText };
      }
    } catch (err) {
      return { success: false, responseCode: 0, message: err.toString() };
    }
  }
};


// ─── APP LOGGER ───────────────────────────────────────────────────────────────
// Named AppLogger to avoid collision with GAS built-in Logger global.

var AppLogger = {
  write: function(leadId, source, phone, action, result, responseCode, message) {
    try {
      var sheet = Config.getSheet(Config.SHEETS.LOGS);
      sheet.appendRow([
        new Date().toISOString(),
        (leadId       || '').toString(),
        (source       || '').toString(),
        (phone        || '').toString(),
        (action       || '').toString(),
        (result       || '').toString(),
        (responseCode !== undefined && responseCode !== null) ? responseCode.toString() : '',
        (message      || '').toString().slice(0, 500)
      ]);
    } catch (err) {
      console.error('AppLogger.write failed: ' + err.toString());
    }
  }
};


// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

var ErrorHandler = {
  log: function(errorType, errorMessage, payloadObj) {
    try {
      var sheet = Config.getSheet(Config.SHEETS.ERRORS);
      var payloadExcerpt = '';
      try {
        payloadExcerpt = JSON.stringify(payloadObj || {}).slice(0, 500);
      } catch(e) { payloadExcerpt = '[unserializable]'; }

      sheet.appendRow([
        new Date().toISOString(),
        (payloadObj && payloadObj.leadId) ? payloadObj.leadId.toString() : '',
        (errorType    || '').toString(),
        (errorMessage || '').toString().slice(0, 1000),
        payloadExcerpt,
        'No'
      ]);
    } catch (err) {
      console.error('ErrorHandler.log failed: ' + err.toString());
    }
  },

  resolve: function(rowIndex) {
    try {
      var sheet = Config.getSheet(Config.SHEETS.ERRORS);
      var lastRow = sheet.getLastRow();
      if (rowIndex < 2 || rowIndex > lastRow) return;
      sheet.getRange(rowIndex, 6).setValue('Yes');
    } catch (err) {
      console.error('ErrorHandler.resolve failed: ' + err.toString());
    }
  }
};


// ─── AUDIT LOGGER ─────────────────────────────────────────────────────────────

var AuditLogger = {
  log: function(user, action, field, oldVal, newVal) {
    try {
      var sheet = Config.getSheet(Config.SHEETS.AUDIT);
      sheet.appendRow([
        new Date().toISOString(),
        (user   || 'System').toString(),
        (action || '').toString(),
        (field  || '').toString(),
        (oldVal !== undefined && oldVal !== null) ? oldVal.toString().slice(0, 200) : '',
        (newVal !== undefined && newVal !== null) ? newVal.toString().slice(0, 200) : '',
        ''
      ]);
    } catch (err) {
      console.error('AuditLogger.log failed: ' + err.toString());
    }
  }
};
