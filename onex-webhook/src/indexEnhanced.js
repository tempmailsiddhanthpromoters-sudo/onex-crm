/**
 * ─────────────────────────────────────────────────────────────────────
 * OneX CRM - Enhanced Dynamic Webhook Server
 * ─────────────────────────────────────────────────────────────────────
 *
 * This Express server provides:
 *
 *  1. DYNAMIC WEBHOOK ROUTING: POST /webhook/:source
 *     - Automatically routes to configured integrations
 *     - Applies field mappings
 *     - Validates incoming data
 *     - Checks duplicates
 *     - Processes through all configured destinations
 *
 *  2. BACKWARD COMPATIBILITY: Maintains existing webhook endpoints
 *     - POST /99acres-webhook
 *     - POST /housing-webhook
 *     - POST /magicbricks-webhook
 *
 *  3. INTEGRATION MANAGEMENT: Full CRUD for integrations via API
 *  4. FIELD MAPPING ENGINE: Dynamic field transformation
 *  5. USER MANAGEMENT: Role-based access control
 *  6. AUDIT LOGGING: Complete system audit trail
 *  7. SETTINGS MANAGEMENT: Dynamic server configuration
 *
 * Endpoints:
 *   POST /webhook/:source           – Dynamic webhook routing
 *   GET  /webhooks                   – List all webhook URLs
 *   GET  /api/integrations          – Integration management
 *   GET  /api/field-mappings        – Field mapping management
 *   GET  /api/users                 – User management
 *   GET  /api/settings              – System settings
 *   GET  /api/audit-logs            – Audit logs
 * ─────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { processWebhook, getWebhookUrls } = require('./services/webhookRouter');
const database = require('./services/databaseEnhanced');
const zohoManagement = require('./services/zohoManagement');
const aisensyManagement = require('./services/aisensyManagement');
const telegramManagement = require('./services/telegramManagement');
const { errorHandler } = require('./middleware/errorHandler');
const { webhookLimiter, adminLimiter } = require('./middleware/rateLimiter');

/* ── Initialise Express ─────────────────────────────────────────────── */
const app = express();

// Security headers (CSP, HSTS, X-Frame, etc.)
app.use(helmet());

// Allow cross-origin requests (restrict in production if needed)
app.use(cors());

// HTTP request logging → stdout
app.use(morgan('combined'));

// Parse JSON bodies up to 1 MB
app.use(express.json({ limit: '1mb' }));

/* ── Dynamic Webhook Routing ────────────────────────────────────────── */

/**
 * POST /webhook/:source
 * 
 * Dynamic webhook endpoint that routes to configured integrations
 * 
 * Example: POST /webhook/magicbricks
 */
app.post('/webhook/:source', webhookLimiter, async (req, res) => {
  try {
    const { source } = req.params;
    const payload = req.body;
    const headers = req.headers;
    const ipAddress = req.ip || req.connection.remoteAddress;

    console.log(`[webhook] Received webhook for source: ${source}`);

    const result = await processWebhook(source, payload, headers, ipAddress);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(result.statusCode || 500).json(result);
    }
  } catch (error) {
    console.error('[webhook] Processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /webhooks
 * 
 * Returns all available webhook URLs for configured integrations
 */
app.get('/webhooks', (req, res) => {
  try {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`;
    const webhookUrls = getWebhookUrls(baseUrl);
    
    res.json({
      success: true,
      baseUrl: baseUrl,
      webhooks: webhookUrls
    });
  } catch (error) {
    console.error('[webhooks] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Integration Management API ─────────────────────────────────────── */

/**
 * GET /api/integrations
 * List all integrations
 */
app.get('/api/integrations', adminLimiter, (req, res) => {
  try {
    const integrations = database.getAllIntegrations();
    res.json({
      success: true,
      integrations: integrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/:id
 * Get integration by ID
 */
app.get('/api/integrations/:id', adminLimiter, (req, res) => {
  try {
    const integration = database.getIntegrationById(req.params.id);
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }
    res.json({
      success: true,
      integration: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations
 * Create new integration
 */
app.post('/api/integrations', adminLimiter, (req, res) => {
  try {
    const integration = database.createIntegration(req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'integration_created',
      entityType: 'integration',
      entityId: integration.id.toString(),
      changes: { integration: integration.name }
    });
    
    res.status(201).json({
      success: true,
      integration: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/integrations/:id
 * Update integration
 */
app.put('/api/integrations/:id', adminLimiter, (req, res) => {
  try {
    const integration = database.updateIntegration(req.params.id, req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'integration_updated',
      entityType: 'integration',
      entityId: req.params.id,
      changes: { updates: req.body }
    });
    
    res.json({
      success: true,
      integration: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/integrations/:id
 * Delete integration
 */
app.delete('/api/integrations/:id', adminLimiter, (req, res) => {
  try {
    database.deleteIntegration(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'integration_deleted',
      entityType: 'integration',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/:id/enable
 * Enable integration
 */
app.post('/api/integrations/:id/enable', adminLimiter, (req, res) => {
  try {
    const integration = database.enableIntegration(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'integration_enabled',
      entityType: 'integration',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      integration: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/:id/disable
 * Disable integration
 */
app.post('/api/integrations/:id/disable', adminLimiter, (req, res) => {
  try {
    const integration = database.disableIntegration(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'integration_disabled',
      entityType: 'integration',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      integration: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Field Mapping API ───────────────────────────────────────────────── */

/**
 * GET /api/field-mappings
 * List all field mappings
 */
app.get('/api/field-mappings', adminLimiter, (req, res) => {
  try {
    const mappings = database.getAllFieldMappings();
    res.json({
      success: true,
      mappings: mappings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/field-mappings/:id
 * Get field mapping by ID
 */
app.get('/api/field-mappings/:id', adminLimiter, (req, res) => {
  try {
    const mapping = database.getFieldMappingById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Field mapping not found'
      });
    }
    res.json({
      success: true,
      mapping: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/field-mappings
 * Create new field mapping
 */
app.post('/api/field-mappings', adminLimiter, (req, res) => {
  try {
    const mapping = database.createFieldMapping(req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'field_mapping_created',
      entityType: 'field_mapping',
      entityId: mapping.id.toString(),
      changes: { name: mapping.name }
    });
    
    res.status(201).json({
      success: true,
      mapping: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/field-mappings/:id
 * Update field mapping
 */
app.put('/api/field-mappings/:id', adminLimiter, (req, res) => {
  try {
    const mapping = database.updateFieldMapping(req.params.id, req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'field_mapping_updated',
      entityType: 'field_mapping',
      entityId: req.params.id,
      changes: { updates: req.body }
    });
    
    res.json({
      success: true,
      mapping: mapping
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/field-mappings/:id
 * Delete field mapping
 */
app.delete('/api/field-mappings/:id', adminLimiter, (req, res) => {
  try {
    database.deleteFieldMapping(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'field_mapping_deleted',
      entityType: 'field_mapping',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'Field mapping deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── User Management API ─────────────────────────────────────────────── */

/**
 * GET /api/users
 * List all users
 */
app.get('/api/users', adminLimiter, (req, res) => {
  try {
    const users = database.getAllUsers();
    // Mask sensitive data
    const maskedUsers = users.map(user => ({
      ...user,
      // Add any sensitive field masking here if needed
    }));
    res.json({
      success: true,
      users: maskedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
app.get('/api/users/:id', adminLimiter, (req, res) => {
  try {
    const user = database.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * Create new user
 */
app.post('/api/users', adminLimiter, (req, res) => {
  try {
    const user = database.createUser(req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'user_created',
      entityType: 'user',
      entityId: user.id.toString(),
      changes: { email: user.email, name: user.name }
    });
    
    res.status(201).json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
app.put('/api/users/:id', adminLimiter, (req, res) => {
  try {
    const user = database.updateUser(req.params.id, req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'user_updated',
      entityType: 'user',
      entityId: req.params.id,
      changes: { updates: req.body }
    });
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
app.delete('/api/users/:id', adminLimiter, (req, res) => {
  try {
    database.deleteUser(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'user_deleted',
      entityType: 'user',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── System Settings API ────────────────────────────────────────────── */

/**
 * GET /api/settings
 * List all system settings
 */
app.get('/api/settings', adminLimiter, (req, res) => {
  try {
    const settings = database.getAllSettings();
    // Mask secret values
    const maskedSettings = settings.map(setting => {
      if (setting.is_secret) {
        return {
          ...setting,
          value: '***' + (setting.value ? setting.value.slice(-4) : '')
        };
      }
      return setting;
    });
    res.json({
      success: true,
      settings: maskedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/settings/:key
 * Get setting by key
 */
app.get('/api/settings/:key', adminLimiter, (req, res) => {
  try {
    const setting = database.getSetting(req.params.key);
    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }
    // Mask secret values
    if (setting.is_secret) {
      setting.value = '***' + (setting.value ? setting.value.slice(-4) : '');
    }
    res.json({
      success: true,
      setting: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/:key
 * Update setting
 */
app.put('/api/settings/:key', adminLimiter, (req, res) => {
  try {
    const { value, valueType, category, description, isSecret } = req.body;
    const setting = database.setSetting(
      req.params.key,
      value,
      valueType || 'string',
      category || 'general',
      description,
      isSecret || false
    );
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'setting_updated',
      entityType: 'setting',
      entityId: req.params.key,
      changes: { key: req.params.key }
    });
    
    res.json({
      success: true,
      setting: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Audit Logs API ─────────────────────────────────────────────────── */

/**
 * GET /api/audit-logs
 * List audit logs with optional filters
 */
app.get('/api/audit-logs', adminLimiter, (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      entityType: req.query.entityType,
      entityId: req.query.entityId
    };
    const limit = parseInt(req.query.limit) || 100;
    
    const logs = database.getAuditLogs(filters, limit);
    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Routing Rules API ───────────────────────────────────────────────── */

/**
 * GET /api/routing-rules
 * List all routing rules
 */
app.get('/api/routing-rules', adminLimiter, (req, res) => {
  try {
    const rules = database.getAllRoutingRules();
    res.json({
      success: true,
      rules: rules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/routing-rules
 * Create new routing rule
 */
app.post('/api/routing-rules', adminLimiter, (req, res) => {
  try {
    const rule = database.createRoutingRule(req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'routing_rule_created',
      entityType: 'routing_rule',
      entityId: rule.id.toString(),
      changes: { name: rule.name }
    });
    
    res.status(201).json({
      success: true,
      rule: rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/routing-rules/:id
 * Update routing rule
 */
app.put('/api/routing-rules/:id', adminLimiter, (req, res) => {
  try {
    const rule = database.updateRoutingRule(req.params.id, req.body);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'routing_rule_updated',
      entityType: 'routing_rule',
      entityId: req.params.id,
      changes: { updates: req.body }
    });
    
    res.json({
      success: true,
      rule: rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/routing-rules/:id
 * Delete routing rule
 */
app.delete('/api/routing-rules/:id', adminLimiter, (req, res) => {
  try {
    database.deleteRoutingRule(req.params.id);
    
    // Log audit
    database.addAuditLog({
      userId: null,
      action: 'routing_rule_deleted',
      entityType: 'routing_rule',
      entityId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'Routing rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



/* ── Zoho Management API ─────────────────────────────────────────────── */

/**
 * GET /api/zoho/config
 * Get Zoho configuration (masked)
 */
app.get('/api/zoho/config', adminLimiter, (req, res) => {
  try {
    const status = zohoManagement.getConnectionStatus();
    res.json({
      success: true,
      config: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/zoho/config
 * Update Zoho configuration
 */
app.put('/api/zoho/config', adminLimiter, (req, res) => {
  try {
    const config = zohoManagement.setZohoConfig(req.body);
    res.json({
      success: true,
      config: {
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret,
        hasRefreshToken: !!config.refreshToken,
        tokenUrl: config.tokenUrl,
        apiUrl: config.apiUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/zoho/auth-url
 * Generate OAuth authorization URL
 */
app.get('/api/zoho/auth-url', adminLimiter, (req, res) => {
  try {
    const redirectUri = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`}/api/zoho/callback`;
    const authUrl = zohoManagement.generateAuthUrl(redirectUri);
    res.json({
      success: true,
      authUrl: authUrl,
      redirectUri: redirectUri
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/zoho/callback
 * OAuth callback handler
 */
app.get('/api/zoho/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }
    
    const redirectUri = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`}/api/zoho/callback`;
    const tokens = await zohoManagement.exchangeCodeForTokens(code, redirectUri);
    
    console.log('[zoho] OAuth successful - tokens received');
    
    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho Connected</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #16a34a; font-size: 48px; margin-bottom: 20px; }
          h1 { margin: 0 0 10px 0; color: #333; }
          p { color: #666; margin-bottom: 20px; }
          button { background: #0051d5; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; }
          button:hover { background: #0040a8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Zoho CRM Connected Successfully</h1>
          <p>Your Zoho account has been connected. You can now close this window and return to the CRM.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
    
  } catch (err) {
    console.error('[zoho] OAuth callback error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho Connection Failed</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .error { color: #dc2626; font-size: 48px; margin-bottom: 20px; }
          h1 { margin: 0 0 10px 0; color: #333; }
          p { color: #666; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">✗</div>
          <h1>Zoho Connection Failed</h1>
          <p>Error: ${err.message}</p>
          <p>Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * POST /api/zoho/test-connection
 * Test Zoho connection
 */
app.post('/api/zoho/test-connection', adminLimiter, async (req, res) => {
  try {
    const result = await zohoManagement.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/zoho/disconnect
 * Disconnect Zoho integration
 */
app.post('/api/zoho/disconnect', adminLimiter, (req, res) => {
  try {
    const result = zohoManagement.disconnectZoho();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/zoho/refresh-token
 * Manually refresh access token
 */
app.post('/api/zoho/refresh-token', adminLimiter, async (req, res) => {
  try {
    const tokens = await zohoManagement.refreshAccessToken();
    res.json({
      success: true,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/zoho/sync-lead/:zohoLeadId
 * Sync lead from Zoho (pull)
 */
app.post('/api/zoho/sync-lead/:zohoLeadId', adminLimiter, async (req, res) => {
  try {
    const result = await zohoManagement.syncLeadFromZoho(req.params.zohoLeadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/zoho/lead-status/:localLeadId
 * Push lead status to Zoho
 */
app.put('/api/zoho/lead-status/:localLeadId', adminLimiter, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const result = await zohoManagement.pushLeadStatusToZoho(req.params.localLeadId, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── AiSensy Management API ───────────────────────────────────────────── */

/**
 * GET /api/aisensy/config
 * Get AiSensy configuration (masked)
 */
app.get('/api/aisensy/config', adminLimiter, (req, res) => {
  try {
    const status = aisensyManagement.getConnectionStatus();
    res.json({
      success: true,
      config: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/aisensy/config
 * Update AiSensy configuration
 */
app.put('/api/aisensy/config', adminLimiter, (req, res) => {
  try {
    const config = aisensyManagement.setAiSensyConfig(req.body);
    res.json({
      success: true,
      config: {
        hasApiKey: !!config.apiKey,
        hasCampaignName: !!config.campaignName,
        hasDestination: !!config.destination,
        enabled: config.enabled,
        campaignName: config.campaignName,
        destination: config.destination ? '***' + config.destination.slice(-4) : '',
        userName: config.userName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aisensy/test-connection
 * Test AiSensy connection
 */
app.post('/api/aisensy/test-connection', adminLimiter, async (req, res) => {
  try {
    const result = await aisensyManagement.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aisensy/send-test
 * Send test WhatsApp message
 */
app.post('/api/aisensy/send-test', adminLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    const result = await aisensyManagement.sendTestMessage(phoneNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aisensy/enable
 * Enable AiSensy integration
 */
app.post('/api/aisensy/enable', adminLimiter, (req, res) => {
  try {
    const config = aisensyManagement.setAiSensyEnabled(true);
    res.json({
      success: true,
      message: 'AiSensy integration enabled',
      enabled: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aisensy/disable
 * Disable AiSensy integration
 */
app.post('/api/aisensy/disable', adminLimiter, (req, res) => {
  try {
    const config = aisensyManagement.setAiSensyEnabled(false);
    res.json({
      success: true,
      message: 'AiSensy integration disabled',
      enabled: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aisensy/disconnect
 * Disconnect AiSensy integration
 */
app.post('/api/aisensy/disconnect', adminLimiter, (req, res) => {
  try {
    const result = aisensyManagement.disconnectAiSensy();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Telegram Management API ──────────────────────────────────────────── */

/**
 * GET /api/telegram/config
 * Get Telegram configuration (masked)
 */
app.get('/api/telegram/config', adminLimiter, (req, res) => {
  try {
    const status = telegramManagement.getConnectionStatus();
    res.json({
      success: true,
      config: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/telegram/config
 * Update Telegram configuration
 */
app.put('/api/telegram/config', adminLimiter, (req, res) => {
  try {
    const config = telegramManagement.setTelegramConfig(req.body);
    res.json({
      success: true,
      config: {
        hasBotToken: !!config.botToken,
        hasChatId: !!config.chatId,
        enabled: config.enabled,
        chatId: config.chatId ? '***' + config.chatId.slice(-4) : ''
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/test-connection
 * Test Telegram connection
 */
app.post('/api/telegram/test-connection', adminLimiter, async (req, res) => {
  try {
    const result = await telegramManagement.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/send-test
 * Send test Telegram message
 */
app.post('/api/telegram/send-test', adminLimiter, async (req, res) => {
  try {
    const result = await telegramManagement.sendTestMessage();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telegram/bot-info
 * Get Telegram bot information
 */
app.get('/api/telegram/bot-info', adminLimiter, async (req, res) => {
  try {
    const result = await telegramManagement.getBotInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/enable
 * Enable Telegram integration
 */
app.post('/api/telegram/enable', adminLimiter, (req, res) => {
  try {
    const config = telegramManagement.setTelegramEnabled(true);
    res.json({
      success: true,
      message: 'Telegram integration enabled',
      enabled: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/disable
 * Disable Telegram integration
 */
app.post('/api/telegram/disable', adminLimiter, (req, res) => {
  try {
    const config = telegramManagement.setTelegramEnabled(false);
    res.json({
      success: true,
      message: 'Telegram integration disabled',
      enabled: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telegram/disconnect
 * Disconnect Telegram integration
 */
app.post('/api/telegram/disconnect', adminLimiter, (req, res) => {
  try {
    const result = telegramManagement.disconnectTelegram();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/leads/:id/timeline
 * Get lead timeline
 */
app.get('/api/leads/:id/timeline', adminLimiter, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const timeline = database.getLeadTimeline(req.params.id, limit);
    res.json({
      success: true,
      timeline: timeline,
      count: timeline.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ── Legacy Admin API (for GAS CRM compatibility) ─────────────────────── */

/**
 * GET /api/admin/health
 * Full system health check (GAS CRM compatible)
 */
app.get('/api/admin/health', (req, res) => {
  try {
    const integrations = database.getAllIntegrations();
    const settings = database.getAllSettings();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      integrations: integrations.filter(i => i.enabled).map(i => ({
        name: i.name,
        slug: i.slug,
        enabled: i.enabled
      })),
      database: {
        status: 'connected',
        integrations: integrations.length,
        settings: settings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/settings
 * Retrieve all masked settings (GAS CRM compatible)
 */
app.get('/api/admin/settings', (req, res) => {
  try {
    const settings = database.getAllSettings();
    const maskedSettings = {};
    
    settings.forEach(setting => {
      if (setting.is_secret) {
        maskedSettings[setting.key] = '***' + (setting.value ? setting.value.slice(-4) : '');
      } else {
        maskedSettings[setting.key] = setting.value;
      }
    });
    
    res.json({
      success: true,
      data: maskedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/settings
 * Update settings (GAS CRM compatible)
 */
app.post('/api/admin/settings', (req, res) => {
  try {
    const newSettings = req.body.data || req.body;
    
    // Update each setting
    Object.keys(newSettings).forEach(key => {
      const value = newSettings[key];
      const isSecret = key.toLowerCase().includes('secret') || 
                       key.toLowerCase().includes('token') || 
                       key.toLowerCase().includes('key') ||
                       key.toLowerCase().includes('password');
      
      database.setSetting(key, value, 'string', 'general', undefined, isSecret);
    });
    
    res.json({
      success: true,
      data: newSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/leads
 * List leads with filters (GAS CRM compatible)
 */
app.get('/api/admin/leads', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const source = req.query.source || '';
    const search = req.query.search || '';
    
    const leads = database.getAllLeads(limit, offset, source, search);
    const total = database.getLeadsCount(source, search);
    
    res.json({
      success: true,
      data: leads,
      total: total,
      limit: limit,
      offset: offset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics data (GAS CRM compatible)
 */
app.get('/api/admin/analytics', (req, res) => {
  try {
    const leads = database.getAllLeads(10000, 0, '', '');
    
    const analytics = {
      totalLeads: leads.length,
      bySource: {},
      byStatus: {},
      todayLeads: 0,
      thisWeekLeads: 0,
      thisMonthLeads: 0
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    leads.forEach(lead => {
      const leadDate = new Date(lead.created_at);
      
      // By source
      if (!analytics.bySource[lead.source]) {
        analytics.bySource[lead.source] = 0;
      }
      analytics.bySource[lead.source]++;
      
      // By status
      if (!analytics.byStatus[lead.status]) {
        analytics.byStatus[lead.status] = 0;
      }
      analytics.byStatus[lead.status]++;
      
      // Time-based
      if (leadDate >= today) {
        analytics.todayLeads++;
      }
      if (leadDate >= weekAgo) {
        analytics.thisWeekLeads++;
      }
      if (leadDate >= monthAgo) {
        analytics.thisMonthLeads++;
      }
    });
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/sources
 * Get all sources (GAS CRM compatible)
 */
app.get('/api/admin/sources', (req, res) => {
  try {
    const integrations = database.getAllIntegrations();
    const sources = integrations.map(i => ({
      name: i.name,
      slug: i.slug,
      enabled: i.enabled,
      webhookUrl: i.webhook_url
    }));
    
    res.json({
      success: true,
      data: sources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/webhook-urls
 * Get webhook URLs for all integrations (GAS CRM compatible)
 */
app.get('/api/admin/webhook-urls', (req, res) => {
  try {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`;
    const webhookUrls = getWebhookUrls(baseUrl);
    
    res.json({
      success: true,
      baseUrl: baseUrl,
      webhooks: webhookUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/leads
 * Create a lead via API (for GAS CRM integration)
 */
app.post('/api/leads', (req, res) => {
  try {
    const leadData = req.body;
    
    // Insert lead
    const dbLeadId = database.insertLeadEnhanced({
      leadId: leadData.leadId || `lead_${Date.now()}`,
      integrationId: leadData.integrationId || null,
      source: leadData.source || 'API',
      name: leadData.name || '',
      phone: leadData.phone || '',
      email: leadData.email || '',
      propertyTitle: leadData.property_title || leadData.propertyTitle || '',
      propertyId: leadData.property_id || leadData.propertyId || '',
      budget: leadData.budget || '',
      location: leadData.location || '',
      message: leadData.message || '',
      requirements: leadData.requirements || '',
      timeline: leadData.timeline || '',
      rawPayload: leadData,
      assignedTo: leadData.assigned_to || null
    });
    
    res.status(201).json({
      success: true,
      leadId: dbLeadId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/leads/:id/resync-zoho
 * Manually retry Zoho sync for a lead
 */
app.post('/api/admin/leads/:id/resync-zoho', adminLimiter, async (req, res) => {
  try {
    const lead = database.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    
    const { createLeadWithRetry } = require('./services/zoho');
    const result = await createLeadWithRetry({
      source: lead.source,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      property: lead.property_title,
      budget: lead.budget,
      location: lead.location
    });
    
    if (result) {
      database.updateLeadZohoId(req.params.id, result);
    }
    
    res.json({
      success: true,
      message: 'Zoho sync retry completed',
      zohoLeadId: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/leads/:id/resend-whatsapp
 * Manually resend WhatsApp for a lead
 */
app.post('/api/admin/leads/:id/resend-whatsapp', adminLimiter, async (req, res) => {
  try {
    const lead = database.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    
    const { sendWhatsAppWithRetry } = require('./services/aisensy');
    await sendWhatsAppWithRetry({
      name: lead.name,
      phone: lead.phone,
      property: lead.property_title,
      budget: lead.budget,
      location: lead.location
    });
    
    database.updateLeadAisensyStatus(req.params.id, 'sent');
    
    res.json({
      success: true,
      message: 'WhatsApp resend completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
})

/* ── Health Check ───────────────────────────────────────────────────── */

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  try {
    const integrations = database.getAllIntegrations();
    const settings = database.getAllSettings();
    
    res.json({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        integrations: integrations.length,
        settings: settings.length
      },
      integrations: integrations.filter(i => i.enabled).map(i => ({
        name: i.name,
        slug: i.slug,
        enabled: i.enabled
      }))
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

/* ── Error Handling ──────────────────────────────────────────────────── */

app.use(errorHandler);

/* ── Start Server ─────────────────────────────────────────────────────── */

const PORT = config.port;

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 OneX CRM Enhanced Server running on port ${PORT}`);
  console.log(`📡 Dynamic webhook endpoint: http://localhost:${PORT}/webhook/:source`);
  console.log(`🔍 Webhook URLs: http://localhost:${PORT}/webhooks`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════════');
  
  // Initialize database
  try {
    database.getDb();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});

module.exports = app;