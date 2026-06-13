/**
 * Webhook.gs - Incoming Lead Processing
 * Multi-tenant: source detection uses dynamic sources from Config.
 */

function handleWebhook(e, payload) {
  var cfg = Config.get();

  // 1. TOKEN AUTH
  if (cfg.webhookSecret && cfg.webhookSecret.trim()) {
    var token = (e && e.parameter && e.parameter.token) ? e.parameter.token :
                (payload.token ? payload.token : '');
    if (token !== cfg.webhookSecret.trim()) {
      console.error('Unauthorized webhook - token mismatch');
      return buildResponse(401, false, 'Unauthorized', null);
    }
  }

  // 2. DETECT SOURCE (uses dynamic sources list)
  var source = detectSource(e, payload, cfg.sources);

  // 3. SOURCE ENABLED CHECK (dynamic)
  var srcConfig = getSourceConfig(source, cfg.sources);
  if (srcConfig && !srcConfig.enabled) {
    return buildResponse(200, true, source + ' leads currently paused', null);
  }

  // 4. NORMALIZE
  var normalized = normalizePayload(payload, source);

  // 5. VALIDATE
  var validation = validateLead(normalized);
  if (!validation.valid) {
    ErrorHandler.log('VALIDATION_ERROR', validation.error, { phone:normalized.phone, name:normalized.name });
    AppLogger.write('', source, normalized.phone, 'Validation Failed', 'ERROR', '', validation.error);
    return buildResponse(422, false, 'Validation failed: ' + validation.error, null);
  }

  // 6. DUPLICATE CHECK
  if (cfg.deduplicationEnabled) {
    var dup = DuplicateChecker.check(normalized.phone, source);
    if (dup.isDuplicate) {
      DuplicateChecker.saveDuplicate(normalized, dup.originalLeadId);
      AppLogger.write(dup.originalLeadId, source, normalized.phone, 'Duplicate Detected', 'SKIPPED', '',
        'Duplicate of ' + dup.originalLeadId + ' (' + dup.ageHours + 'h ago)');
      return buildResponse(200, true, 'Duplicate lead - logged but not re-processed', {
        isDuplicate: true, originalLeadId: dup.originalLeadId });
    }
  }

  // 7. GENERATE LEAD ID
  var leadId = generateLeadId();
  normalized.leadId      = leadId;
  normalized.createdAt   = new Date().toISOString();
  normalized.lastUpdated = new Date().toISOString();

  // 8. SAVE LEAD
  try {
    saveLead(normalized);
    AppLogger.write(leadId, source, normalized.phone, 'Lead Saved', 'SUCCESS', '', 'Saved to sheet');
  } catch(err) {
    ErrorHandler.log('SHEET_ERROR', err.toString(), normalized);
    return buildResponse(500, false, 'Failed to save lead to sheet', null);
  }

  // 9. WHATSAPP
  var waStatus  = 'DISABLED';
  var waMessage = 'WhatsApp disabled';
  var waResult  = null;

  if (cfg.whatsappEnabled) {
    if (!cfg.aiSensyApiKey || !cfg.aiSensyApiKey.trim()) {
      waStatus  = 'SKIPPED';
      waMessage = 'AiSensy API key not configured in Script Properties';
    } else {
      // Use source-specific campaign override if set
      var srcCampaign = srcConfig && srcConfig.campaignOverride ? srcConfig.campaignOverride : '';
      var cfgWithSrcCampaign = Object.assign({}, cfg);
      if (srcCampaign) cfgWithSrcCampaign.aiSensyCampaign = srcCampaign;

      waResult  = AiSensy.sendWithRetry(normalized, cfgWithSrcCampaign);
      waStatus  = waResult.success ? 'SENT' : 'FAILED';
      waMessage = waResult.message || '';
      AppLogger.write(leadId, source, normalized.phone,
        'AiSensy ' + (waResult.success ? 'Sent' : 'Failed'),
        waResult.success ? 'SUCCESS' : 'FAILED',
        waResult.responseCode || '', waMessage);
      if (!waResult.success) {
        ErrorHandler.log('AISENSY_FAILED', waMessage, { leadId:leadId, phone:normalized.phone });
      }
    }
  }
  updateLeadWaStatus(leadId, waStatus, waStatus === 'FAILED' ? waMessage : '');

  // 10. ROUTING RULES
  applyRoutingRules(leadId, normalized);

  // 11. EMAIL NOTIFICATION
  if (cfg.notificationsEnabled && cfg.emailAlerts && cfg.adminEmail && cfg.adminEmail.trim()) {
    try { sendNewLeadNotification(normalized, cfg); } catch(mailErr) {
      console.error('Email notification failed: ' + mailErr.toString());
    }
  }

  return buildResponse(200, true, 'Lead processed successfully', {
    leadId:leadId, source:source, phone:normalized.phone, wa:waStatus });
}

// ── SOURCE DETECTION ─────────────────────────────────────────────────────────

function detectSource(e, payload, sources) {
  // 1. URL param: ?source=housing  OR  ?source=99acres  etc.
  var urlParam = (e && e.parameter && e.parameter.source) ? e.parameter.source.toLowerCase().trim() : '';
  if (urlParam) {
    for (var i=0; i<sources.length; i++) {
      if (sources[i].webhookParam.toLowerCase() === urlParam ||
          sources[i].key.toLowerCase() === urlParam) {
        return sources[i].name;  // canonical display name
      }
    }
  }

  // 2. Payload field fingerprinting
  if (payload) {
    if (payload.property_id !== undefined || payload.property_title !== undefined) return findSourceName('housing', sources);
    if (payload.requirement_id !== undefined || payload.locality_title !== undefined || payload.buyer_name !== undefined) return findSourceName('99acres', sources);
    if (payload.ad_id !== undefined && payload.platform === 'meta') return findSourceName('meta', sources);
    if (payload.source) {
      var ps = payload.source.toString().toLowerCase();
      for (var j=0; j<sources.length; j++) {
        if (ps.indexOf(sources[j].key) !== -1) return sources[j].name;
      }
    }
  }

  AppLogger.write('','UNKNOWN','','Source Detection','WARNING','','Cannot detect source from payload');
  return 'UNKNOWN';
}

function findSourceName(key, sources) {
  for (var i=0; i<sources.length; i++) {
    if (sources[i].key === key) return sources[i].name;
  }
  return key;
}

function getSourceConfig(sourceName, sources) {
  for (var i=0; i<sources.length; i++) {
    if (sources[i].name === sourceName) return sources[i];
  }
  return null;
}

// ── NORMALIZE ────────────────────────────────────────────────────────────────

function normalizePayload(payload, source) {
  var now = new Date();
  return {
    source:        source,
    name:          (payload.name || payload.buyer_name || payload.contact_name || '').toString().trim(),
    email:         (payload.email || payload.buyer_email || payload.emailId || '').toString().trim().toLowerCase(),
    phone:         PhoneNormalizer.normalize((payload.phone || payload.mobile || payload.buyer_mobile || payload.phone_number || payload.contact_number || '').toString()),
    message:       (payload.user_message || payload.message || payload.requirement || payload.comment || payload.query || '').toString().trim(),
    propertyId:    (payload.property_id || payload.listing_id || payload.ad_id || payload.requirement_id || '').toString().trim(),
    propertyTitle: (payload.property_title || payload.project_name || payload.locality_title || payload.title || '').toString().trim(),
    timestamp:     (payload.time_stamp || payload.created_at || payload.timestamp || now.toISOString()).toString(),
    waStatus:   'PENDING',
    status:     'New',
    assignedTo: '',
    notes:      '',
    // Extended profile fields - default empty, editable later from CRM
    budget:           (payload.budget || '').toString().trim(),
    location:         (payload.location || payload.city || '').toString().trim(),
    requirements:     (payload.requirements || '').toString().trim(),
    timeline:         (payload.timeline || '').toString().trim(),
    callMade:         '',
    meetingScheduled: '',
    siteVisitDone:    '',
    followupDue:      '',
    nextCall:         '',
    meetingDate:      ''
  };
}

// ── VALIDATE ─────────────────────────────────────────────────────────────────

function validateLead(lead) {
  if (!lead.name || lead.name.length < 1) return { valid:false, error:'Name is required' };
  if (!lead.phone || lead.phone.length < 10) return { valid:false, error:'Phone required (min 10 digits)' };
  if (!/^\d{10,12}$/.test(lead.phone)) return { valid:false, error:'Phone invalid after normalization: "'+lead.phone+'"' };
  return { valid:true };
}

// ── SHEET WRITE ──────────────────────────────────────────────────────────────

function saveLead(lead) {
  Config.getSheet(Config.SHEETS.LEADS).appendRow([
    lead.leadId, lead.timestamp, lead.source, lead.name, lead.phone, lead.email,
    lead.propertyId, lead.propertyTitle, lead.message, lead.waStatus,
    lead.status, lead.assignedTo, lead.notes, lead.createdAt, lead.lastUpdated,
    lead.budget||'', lead.location||'', lead.requirements||'', lead.timeline||'',
    lead.callMade||'', lead.meetingScheduled||'', lead.siteVisitDone||'',
    lead.followupDue||'', lead.nextCall||'', lead.meetingDate||''
  ]);
}

function updateLeadWaStatus(leadId, status, failureReason) {
  try {
    var sheet = Config.getSheet(Config.SHEETS.LEADS);
    var data  = sheet.getDataRange().getValues();
    for (var i=1; i<data.length; i++) {
      if (data[i][0] && data[i][0].toString() === leadId) {
        sheet.getRange(i+1, Config.LEAD_COLS.WA_STATUS+1).setValue(status);
        sheet.getRange(i+1, Config.LEAD_COLS.LAST_UPDATED+1).setValue(new Date().toISOString());
        if (status === 'FAILED' && failureReason && failureReason.trim()) {
          var ex = (data[i][Config.LEAD_COLS.NOTES]||'').toString();
          var note = 'WA FAILED: ' + failureReason.slice(0,200);
          sheet.getRange(i+1, Config.LEAD_COLS.NOTES+1).setValue(ex ? ex+'\n'+note : note);
        }
        return;
      }
    }
  } catch(err) { console.error('updateLeadWaStatus: '+err); }
}

function updateLeadField(leadId, fieldName, value) {
  try {
    var C = Config.LEAD_COLS;
    var colMap = {
      name:             C.NAME+1,
      email:            C.EMAIL+1,
      propertyTitle:    C.PROPERTY_TITLE+1,
      assignedTo:       C.ASSIGNED_TO+1,
      status:           C.STATUS+1,
      notes:            C.NOTES+1,
      waStatus:         C.WA_STATUS+1,
      budget:           C.BUDGET+1,
      location:         C.LOCATION+1,
      requirements:     C.REQUIREMENTS+1,
      timeline:         C.TIMELINE+1,
      callMade:         C.CALL_MADE+1,
      meetingScheduled: C.MEETING_SCHEDULED+1,
      siteVisitDone:    C.SITE_VISIT_DONE+1,
      followupDue:      C.FOLLOWUP_DUE+1,
      nextCall:         C.NEXT_CALL+1,
      meetingDate:      C.MEETING_DATE+1
    };
    var col = colMap[fieldName];
    if (!col) return false;
    var sheet = Config.getSheet(Config.SHEETS.LEADS);
    var data  = sheet.getDataRange().getValues();
    for (var i=1; i<data.length; i++) {
      if (data[i][0] && data[i][0].toString() === leadId) {
        sheet.getRange(i+1, col).setValue(value !== undefined ? value : '');
        sheet.getRange(i+1, C.LAST_UPDATED+1).setValue(new Date().toISOString());
        return true;
      }
    }
    return false;
  } catch(err) { console.error('updateLeadField: '+err); return false; }
}

// ── ROUTING ──────────────────────────────────────────────────────────────────

function applyRoutingRules(leadId, lead) {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(Config.PROP_KEYS.ROUTING_RULES_JSON);
    if (!raw) return;
    var rules = JSON.parse(raw);
    if (!Array.isArray(rules)) return;
    for (var i=0; i<rules.length; i++) {
      var r = rules[i];
      if (!r.enabled || !r.field || !r.value || !r.assignTo) continue;
      var fv = (lead[r.field]||'').toString().toLowerCase();
      var rv = r.value.toString().toLowerCase();
      var match = (r.operator==='equals'?fv===rv: r.operator==='contains'?fv.indexOf(rv)!==-1: r.operator==='starts'?fv.indexOf(rv)===0:false);
      if (match) {
        updateLeadField(leadId, 'assignedTo', r.assignTo);
        AppLogger.write(leadId, lead.source, lead.phone, 'Routing Applied', 'SUCCESS', '',
          'Assigned to '+r.assignTo+' by rule "'+r.name+'"');
        break;
      }
    }
  } catch(err) { console.error('applyRoutingRules: '+err); }
}

// ── EMAIL NOTIFICATION ───────────────────────────────────────────────────────

function sendNewLeadNotification(lead, cfg) {
  var company = cfg.companyName || 'CRM';
  GmailApp.sendEmail(
    cfg.adminEmail,
    '[' + company + '] New Lead: ' + lead.name + ' (' + lead.source + ')',
    [
      'New lead received on ' + company,
      '',
      'Lead ID   : ' + lead.leadId,
      'Name      : ' + lead.name,
      'Phone     : ' + PhoneNormalizer.display(lead.phone),
      'Email     : ' + (lead.email || 'N/A'),
      'Source    : ' + lead.source,
      'Property  : ' + (lead.propertyTitle || 'N/A'),
      'Message   : ' + (lead.message || 'N/A'),
      'Time      : ' + new Date().toLocaleString('en-IN', { timeZone:'Asia/Kolkata' }),
      '',
      'Log in to your CRM admin panel to manage this lead.'
    ].join('\n')
  );
}

// ── LEAD ID ──────────────────────────────────────────────────────────────────

function generateLeadId() {
  var props = PropertiesService.getScriptProperties();
  var lock  = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var counter = parseInt(props.getProperty(Config.PROP_KEYS.LEAD_COUNTER)||'0',10);
    if (isNaN(counter)) counter = 0;
    counter++;
    props.setProperty(Config.PROP_KEYS.LEAD_COUNTER, counter.toString());
    return 'LD-' + Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMdd') + '-' + counter.toString().padStart(6,'0');
  } finally { lock.releaseLock(); }
}
