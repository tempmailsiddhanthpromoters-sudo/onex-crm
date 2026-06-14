/**
 * ─────────────────────────────────────────────────────────────────────
 * Dynamic Webhook Router Service
 * ─────────────────────────────────────────────────────────────────────
 * Handles dynamic webhook routing based on integration configurations.
 * 
 * Single entry point: POST /webhook/:source
 * 
 * This service:
 * 1. Looks up integration by slug
 * 2. Validates integration is enabled
 * 3. Applies field mappings
 * 4. Validates incoming data
 * 5. Checks for duplicates
 * 6. Processes lead through all configured destinations
 * ─────────────────────────────────────────────────────────────────────
 */

const databaseEnhanced = require('./databaseEnhanced');
const { createLeadWithRetry } = require('./zoho');
const { sendWhatsAppWithRetry } = require('./aisensy');
const { sendTelegramNotification } = require('./telegram');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique lead ID
 */
function generateLeadId() {
  return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply field mappings to incoming data
 */
function applyFieldMappings(incomingData, mappings) {
  const mappedData = {};
  
  mappings.forEach(mapping => {
    const sourceValue = incomingData[mapping.from];
    
    if (sourceValue !== undefined && sourceValue !== null) {
      let transformedValue = sourceValue;
      
      // Apply transformations
      switch (mapping.transform) {
        case 'title':
          transformedValue = sourceValue.toString()
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          break;
        case 'lower':
          transformedValue = sourceValue.toString().toLowerCase();
          break;
        case 'upper':
          transformedValue = sourceValue.toString().toUpperCase();
          break;
        case 'trim':
          transformedValue = sourceValue.toString().trim();
          break;
        case 'clean':
          // Remove non-numeric characters for phone
          transformedValue = sourceValue.toString().replace(/[^0-9+]/g, '');
          break;
        case 'none':
        default:
          transformedValue = sourceValue;
      }
      
      mappedData[mapping.to] = transformedValue;
    }
  });
  
  return mappedData;
}

/**
 * Validate webhook secret if configured
 */
function validateWebhookSecret(integration, headers) {
  if (!integration.webhook_secret) {
    return true; // No secret configured, skip validation
  }
  
  const providedSecret = headers['x-webhook-secret'] || headers['webhook-secret'];
  return providedSecret === integration.webhook_secret;
}

/**
 * Validate incoming data against integration rules
 */
function validateIncomingData(data, validationRules) {
  if (!validationRules) {
    return { valid: true, errors: [] };
  }
  
  const errors = [];
  
  validationRules.forEach(rule => {
    const value = data[rule.field];
    
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`${rule.field} is required`);
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${rule.field} must be a valid email`);
        }
        break;
      case 'phone':
        if (value && !/^[0-9+]{10,15}$/.test(value.replace(/[^0-9+]/g, ''))) {
          errors.push(`${rule.field} must be a valid phone number`);
        }
        break;
      case 'min_length':
        if (value && value.toString().length < rule.value) {
          errors.push(`${rule.field} must be at least ${rule.value} characters`);
        }
        break;
      case 'max_length':
        if (value && value.toString().length > rule.value) {
          errors.push(`${rule.field} must not exceed ${rule.value} characters`);
        }
        break;
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Process webhook payload
 */
async function processWebhook(source, payload, headers, ipAddress) {
  try {
    // Look up integration by slug
    const integration = databaseEnhanced.getIntegrationBySlug(source);
    
    if (!integration) {
      return {
        success: false,
        error: 'Integration not found',
        statusCode: 404
      };
    }
    
    // Check if integration is enabled
    if (!integration.enabled) {
      return {
        success: false,
        error: 'Integration is disabled',
        statusCode: 403
      };
    }
    
    // Validate webhook secret
    if (!validateWebhookSecret(integration, headers)) {
      return {
        success: false,
        error: 'Invalid webhook secret',
        statusCode: 401
      };
    }
    
    // Get field mapping for this integration
    const fieldMapping = integration.field_mapping_id 
      ? databaseEnhanced.getFieldMappingById(integration.field_mapping_id)
      : null;
    
    // Apply field mappings
    const mappedData = fieldMapping 
      ? applyFieldMappings(payload, fieldMapping.mappings)
      : payload;
    
    // Validate incoming data
    const validationRules = integration.validation_rules 
      ? JSON.parse(integration.validation_rules)
      : null;
    
    const validation = validateIncomingData(mappedData, validationRules);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validation.errors,
        statusCode: 400
      };
    }
    
    // Check for duplicates
    const duplicateCheckWindow = databaseEnhanced.getSetting('duplicate_check_window_hours');
    const duplicate = databaseEnhanced.checkDuplicateLead(
      mappedData.phone,
      mappedData.email,
      duplicateCheckWindow ? duplicateCheckWindow.value : 24
    );
    
    if (duplicate) {
      // Log duplicate but still process (could be a lead update)
      console.log(`[webhook] Duplicate lead detected: ${duplicate.lead_id}`);
    }
    
    // Generate lead ID
    const leadId = duplicate ? duplicate.lead_id : generateLeadId();
    
    // Prepare lead data
    const leadData = {
      leadId: leadId,
      integrationId: integration.id,
      source: integration.name,
      name: mappedData.name || '',
      phone: mappedData.phone || '',
      email: mappedData.email || '',
      propertyTitle: mappedData.property_title || mappedData.property || '',
      propertyId: mappedData.property_id || '',
      budget: mappedData.budget || '',
      location: mappedData.location || '',
      message: mappedData.message || '',
      requirements: mappedData.requirements || '',
      timeline: mappedData.timeline || '',
      rawPayload: payload,
      assignedTo: null
    };
    
    // Insert/update lead in database (use both for backward compatibility)
    const dbLeadId = databaseEnhanced.insertLeadEnhanced(leadData);
    
    // Database insert already complete via databaseEnhanced
    
    // Get system settings for auto-sync
    const autoSyncSettings = {
      zoho: databaseEnhanced.getSetting('zoho_auto_sync'),
      aisensy: databaseEnhanced.getSetting('aisensy_auto_send'),
      telegram: databaseEnhanced.getSetting('telegram_auto_notify'),
      gas: databaseEnhanced.getSetting('gas_auto_sync'),
      sheet: databaseEnhanced.getSetting('sheet_auto_sync')
    };
    
    // Process integrations in parallel
    const processingResults = {
      database: { status: 'success', leadId: leadId, dbLeadId: dbLeadId }
    };
    
    const processingPromises = [];
    
    // Zoho CRM sync
    if (autoSyncSettings.zoho && autoSyncSettings.zoho.value) {
      const zohoPromise = (async () => {
        try {
          databaseEnhanced.createSyncStatus(dbLeadId, 'zoho', 'push');
          const zohoResult = await createLeadWithRetry(leadData);
          databaseEnhanced.updateLeadZohoId(dbLeadId, zohoResult.leadId);
          database.addTimelineEntry(dbLeadId, 'zoho_synced', { zohoLeadId: zohoResult.leadId }, 'System');
          return { status: 'success', zohoLeadId: zohoResult.leadId };
        } catch (error) {
          console.error('[webhook] Zoho sync failed:', error);
          databaseEnhanced.addTimelineEntry(dbLeadId, 'zoho_sync_failed', { error: error.message }, 'System');
          return { status: 'failed', error: error.message };
        }
      })();
      processingPromises.push(zohoPromise.then(result => { processingResults.zoho = result; }));
    }
    
    // WhatsApp send
    if (autoSyncSettings.aisensy && autoSyncSettings.aisensy.value) {
      const aisensyPromise = (async () => {
        try {
          await sendWhatsAppWithRetry(leadData);
          databaseEnhanced.updateLeadAisensyStatus(dbLeadId, 'sent');
          databaseEnhanced.addTimelineEntry(dbLeadId, 'whatsapp_sent', {}, 'System');
          return { status: 'success' };
        } catch (error) {
          console.error('[webhook] WhatsApp send failed:', error);
          databaseEnhanced.updateLeadAisensyStatus(dbLeadId, 'failed');
          databaseEnhanced.addTimelineEntry(dbLeadId, 'whatsapp_failed', { error: error.message }, 'System');
          return { status: 'failed', error: error.message };
        }
      })();
      processingPromises.push(aisensyPromise.then(result => { processingResults.aisensy = result; }));
    }
    
    // Telegram notification
    if (autoSyncSettings.telegram && autoSyncSettings.telegram.value) {
      const telegramPromise = (async () => {
        try {
          await sendTelegramNotification(leadData);
          databaseEnhanced.updateLeadTelegramStatus(dbLeadId, 'sent');
          databaseEnhanced.addTimelineEntry(dbLeadId, 'telegram_sent', {}, 'System');
          return { status: 'success' };
        } catch (error) {
          console.error('[webhook] Telegram send failed:', error);
          databaseEnhanced.updateLeadTelegramStatus(dbLeadId, 'failed');
          databaseEnhanced.addTimelineEntry(dbLeadId, 'telegram_failed', { error: error.message }, 'System');
          return { status: 'failed', error: error.message };
        }
      })();
      processingPromises.push(telegramPromise.then(result => { processingResults.telegram = result; }));
    }
    
    // Wait for all processing to complete
    await Promise.all(processingPromises);
    
    // Apply routing rules for assignment
    const routingRules = databaseEnhanced.getAllRoutingRules();
    for (const rule of routingRules) {
      if (evaluateRoutingRule(rule, leadData)) {
        const assignAction = rule.actions.find(a => a.type === 'assign_to');
        if (assignAction) {
          databaseEnhanced.updateLeadAssignment(dbLeadId, assignAction.value, 'Routing System');
          leadData.assignedTo = assignAction.value;
          processingResults.assignment = { status: 'success', assignedTo: assignAction.value };
          break;
        }
      }
    }
    
    // Log audit trail
    databaseEnhanced.addAuditLog({
      userId: null, // System action
      action: 'webhook_received',
      entityType: 'lead',
      entityId: leadId,
      changes: { source: source, integration: integration.name },
      ipAddress: ipAddress,
      userAgent: headers['user-agent']
    });
    
    return {
      success: true,
      leadId: leadId,
      duplicate: !!duplicate,
      processing: processingResults,
      message: duplicate ? 'Duplicate lead processed' : 'New lead created'
    };
    
  } catch (error) {
    console.error('[webhook] Processing error:', error);
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}

/**
 * Evaluate routing rule conditions
 */
function evaluateRoutingRule(rule, leadData) {
  return rule.conditions.every(condition => {
    const fieldValue = leadData[condition.field];
    const ruleValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue == ruleValue;
      case 'not_equals':
        return fieldValue != ruleValue;
      case 'contains':
        return fieldValue && fieldValue.toString().includes(ruleValue);
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().includes(ruleValue);
      case 'greater_than':
        return parseFloat(fieldValue) > parseFloat(ruleValue);
      case 'less_than':
        return parseFloat(fieldValue) < parseFloat(ruleValue);
      case 'in':
        return ruleValue.includes(fieldValue);
      case 'not_in':
        return !ruleValue.includes(fieldValue);
      default:
        return true;
    }
  });
}

/**
 * Get all available webhook URLs
 */
function getWebhookUrls(baseUrl) {
  const integrations = databaseEnhanced.getAllIntegrations();
  return integrations
    .filter(integration => integration.enabled)
    .map(integration => ({
      name: integration.name,
      slug: integration.slug,
      url: `${baseUrl}/webhook/${integration.slug}`,
      method: 'POST'
    }));
}

module.exports = {
  processWebhook,
  getWebhookUrls,
  generateLeadId,
  applyFieldMappings,
  validateWebhookSecret,
  validateIncomingData
};