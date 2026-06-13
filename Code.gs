/**
 * LeadFlow CRM - Main Entry Point
 * Google Apps Script Web App
 * Version: 2.1.0
 *
 * IMPORTANT GAS EXECUTION ORDER:
 * Files load alphabetically: AdminAPI.gs → Code.gs → Config.gs → Modules.gs → Webhook.gs
 * All globals (AppLogger, ErrorHandler, etc.) are available across all files.
 */

// ─── WEB APP ENTRY POINTS ─────────────────────────────────────────────────────

function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('AdminPanel');
    template.page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';
    return template.evaluate()
      .setTitle('CRM Admin')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  } catch (err) {
    console.error('doGet error: ' + err.toString());
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:40px;text-align:center">' +
      '<h2>CRM</h2><p>Starting up — please refresh in a moment.</p>' +
      '<p style="color:#999;font-size:12px;margin-top:10px">' + escapeHtmlForError(err.toString()) + '</p></div>'
    );
  }
}

function escapeHtmlForError(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return buildResponse(400, false, 'Empty request body', null);
    }
    const rawBody = e.postData.contents;
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      return buildResponse(400, false, 'Invalid JSON: ' + parseErr.message, null);
    }
    if (!payload || typeof payload !== 'object') {
      return buildResponse(400, false, 'Payload must be a JSON object', null);
    }
    // Route: Admin API (called from UI via serverCallAdmin)
    if (payload._adminAction) {
      return handleAdminAction(payload);
    }
    // Route: Webhook from lead portals
    return handleWebhook(e, payload);
  } catch (err) {
    console.error('doPost critical error: ' + err.toString());
    // Safe error log - wrapped so sheet errors don't compound
    try { ErrorHandler.log('WEBHOOK_CRITICAL', err.toString(), {}); } catch(e2) {}
    return buildResponse(500, false, 'Internal server error', null);
  }
}

// ─── SERVER FUNCTION EXPOSED TO CLIENT-SIDE JS ────────────────────────────────
// google.script.run can ONLY call top-level named functions.
// doPost() cannot be called from the client. This wrapper bridges the UI.

function serverCallAdmin(actionPayload) {
  try {
    if (!actionPayload || !actionPayload._adminAction) {
      return { success: false, message: 'Missing _adminAction' };
    }
    const result = handleAdminAction(actionPayload);
    // handleAdminAction returns a ContentService TextOutput; parse it back
    const text = result.getContent();
    return JSON.parse(text);
  } catch (err) {
    console.error('serverCallAdmin error: ' + err.toString());
    return { success: false, message: err.message || err.toString() };
  }
}

// ─── RESPONSE BUILDER ─────────────────────────────────────────────────────────

function buildResponse(status, success, message, data) {
  const obj = {
    status:    status,
    success:   success,
    message:   message,
    data:      data !== undefined ? data : null,
    timestamp: new Date().toISOString()
  };
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── HTML INCLUDE HELPER ──────────────────────────────────────────────────────

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns the deployed web app URL for the Settings page webhook URL display.
 * Must be a top-level named function to be callable via google.script.run.
 */
function getDeploymentUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch(e) {
    return '';
  }
}
