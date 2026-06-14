/**
 * ─────────────────────────────────────────────────────────────────────
 * Enhanced SQLite Database Service - Full CRM Schema
 * ─────────────────────────────────────────────────────────────────────
 * Comprehensive database backend supporting:
 * - Dynamic integration management
 * - Field mapping engine
 * - Enhanced lead lifecycle tracking
 * - User management with RBAC
 * - Complete audit trail
 * - Cross-system sync tracking
 * - Dynamic server settings
 * 
 * Uses `better-sqlite3` for synchronous, fast, single-file persistence
 * with WAL mode enabled for concurrent read performance.
 * ─────────────────────────────────────────────────────────────────────
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const config = require('../config');

/** @type {import('better-sqlite3').Database | null} */
let db = null;

/**
 * Lazily initialises and returns the database connection.
 * Creates all tables if they don't exist.
 *
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  if (!db) {
    // Ensure the parent directory exists
    const dbDir = path.dirname(config.db.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.db.path);

    // WAL mode gives better concurrent-read performance
    db.pragma('journal_mode = WAL');

    // Initialize schema
    initializeSchema();

    // Initialize default data
    initializeDefaultData();

    console.log('[db-enhanced] SQLite database ready with full CRM schema →', config.db.path);
  }

  return db;
}

/**
 * Initialize all database tables
 */
function initializeSchema() {
  // Integrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      webhook_url TEXT,
      source_type TEXT DEFAULT 'webhook',
      enabled BOOLEAN DEFAULT 1,
      priority INTEGER DEFAULT 0,
      field_mapping_id INTEGER,
      retry_count INTEGER DEFAULT 3,
      timeout_ms INTEGER DEFAULT 30000,
      validation_rules TEXT,
      webhook_secret TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (field_mapping_id) REFERENCES field_mappings(id)
    )
  `);

  // Field mappings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS field_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      mappings TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Enhanced leads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT UNIQUE NOT NULL,
      integration_id INTEGER,
      source TEXT,
      name TEXT,
      phone TEXT,
      email TEXT,
      property_title TEXT,
      property_id TEXT,
      budget TEXT,
      location TEXT,
      message TEXT,
      requirements TEXT,
      timeline TEXT,
      raw_payload TEXT,
      zoho_lead_id TEXT,
      zoho_contact_id TEXT,
      gas_lead_row_id INTEGER,
      status TEXT DEFAULT 'New',
      stage TEXT DEFAULT 'Lead',
      assigned_to TEXT,
      whatsapp_status TEXT DEFAULT 'pending',
      telegram_status TEXT DEFAULT 'pending',
      email_status TEXT DEFAULT 'pending',
      call_made BOOLEAN DEFAULT 0,
      meeting_scheduled BOOLEAN DEFAULT 0,
      site_visit_done BOOLEAN DEFAULT 0,
      followup_due TEXT,
      next_call TEXT,
      meeting_date TEXT,
      deal_value REAL,
      commission_value REAL,
      zoho_sync_status TEXT DEFAULT 'pending',
      gas_sync_status TEXT DEFAULT 'pending',
      sheet_sync_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (integration_id) REFERENCES integrations(id)
    )
  `);

  // Lead timeline table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      performed_by TEXT,
      performed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Sales Agent',
      phone TEXT,
      active BOOLEAN DEFAULT 1,
      permissions TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      changes TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      value_type TEXT DEFAULT 'string',
      description TEXT,
      category TEXT,
      is_secret BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Sync status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      system TEXT NOT NULL,
      sync_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      attempt_count INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
  `);

  // Routing rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS routing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      conditions TEXT NOT NULL,
      actions TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_integrations_slug ON integrations(slug);
    CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);
    
    CREATE INDEX IF NOT EXISTS idx_field_mappings_name ON field_mappings(name);
    
    CREATE INDEX IF NOT EXISTS idx_leads_lead_id ON leads(lead_id);
    CREATE INDEX IF NOT EXISTS idx_leads_integration_id ON leads(integration_id);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_zoho_lead_id ON leads(zoho_lead_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead_id ON lead_timeline(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_timeline_event_type ON lead_timeline(event_type);
    CREATE INDEX IF NOT EXISTS idx_lead_timeline_performed_at ON lead_timeline(performed_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
    CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
    
    CREATE INDEX IF NOT EXISTS idx_sync_status_lead_id ON sync_status(lead_id);
    CREATE INDEX IF NOT EXISTS idx_sync_status_system ON sync_status(system);
    CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);
    
    CREATE INDEX IF NOT EXISTS idx_routing_rules_enabled ON routing_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON routing_rules(priority);
  `);
}

/**
 * Initialize default data
 */
function initializeDefaultData() {
  // Default integrations
  const defaultIntegrations = [
    { name: '99acres', slug: '99acres', enabled: 1, priority: 1 },
    { name: 'Housing.com', slug: 'housing', enabled: 1, priority: 2 },
    { name: 'MagicBricks', slug: 'magicbricks', enabled: 1, priority: 3 },
    { name: 'Facebook Ads', slug: 'facebook', enabled: 1, priority: 4 },
    { name: 'Google Ads', slug: 'google', enabled: 1, priority: 5 },
    { name: 'Website Form', slug: 'website', enabled: 1, priority: 6 }
  ];

  const insertIntegration = db.prepare(`
    INSERT OR IGNORE INTO integrations (name, slug, enabled, priority)
    VALUES (?, ?, ?, ?)
  `);

  defaultIntegrations.forEach(integration => {
    insertIntegration.run(integration.name, integration.slug, integration.enabled, integration.priority);
  });

  // Default field mapping
  const defaultFieldMapping = `[{
    "from": "name",
    "to": "name",
    "transform": "title"
  }, {
    "from": "phone",
    "to": "phone",
    "transform": "clean"
  }, {
    "from": "mobile",
    "to": "phone",
    "transform": "clean"
  }, {
    "from": "email",
    "to": "email",
    "transform": "lower"
  }, {
    "from": "email_id",
    "to": "email",
    "transform": "lower"
  }, {
    "from": "property",
    "to": "property_title",
    "transform": "none"
  }, {
    "from": "budget",
    "to": "budget",
    "transform": "none"
  }, {
    "from": "location",
    "to": "location",
    "transform": "none"
  }, {
    "from": "message",
    "to": "message",
    "transform": "none"
  }]`;

  db.prepare(`
    INSERT OR IGNORE INTO field_mappings (name, mappings)
    VALUES ('Default Real Estate', ?)
  `).run(defaultFieldMapping);

  // Default system settings
  const defaultSettings = [
    { key: 'webhook_secret', value: '', type: 'string', category: 'security', description: 'Secret for webhook HMAC verification' },
    { key: 'rate_limit_enabled', value: 'true', type: 'boolean', category: 'performance', description: 'Enable rate limiting' },
    { key: 'rate_limit_window_ms', value: '60000', type: 'number', category: 'performance', description: 'Rate limit time window' },
    { key: 'rate_limit_max_requests', value: '100', type: 'number', category: 'performance', description: 'Max requests per window' },
    { key: 'duplicate_check_window_hours', value: '24', type: 'number', category: 'general', description: 'Hours to check for duplicates' },
    { key: 'default_retry_count', value: '3', type: 'number', category: 'general', description: 'Default retry count for failed operations' },
    { key: 'default_timeout_ms', value: '30000', type: 'number', category: 'general', description: 'Default timeout for external API calls' },
    { key: 'zoho_auto_sync', value: 'true', type: 'boolean', category: 'integration', description: 'Auto-sync leads to Zoho' },
    { key: 'aisensy_auto_send', value: 'true', type: 'boolean', category: 'integration', description: 'Auto-send WhatsApp messages' },
    { key: 'telegram_auto_notify', value: 'true', type: 'boolean', category: 'integration', description: 'Auto-send Telegram notifications' },
    { key: 'gas_auto_sync', value: 'true', type: 'boolean', category: 'integration', description: 'Auto-sync to Google Apps Script' },
    { key: 'sheet_auto_sync', value: 'true', type: 'boolean', category: 'integration', description: 'Auto-sync to Google Sheet' }
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, value_type, category, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultSettings.forEach(setting => {
    insertSetting.run(setting.key, setting.value, setting.type, setting.category, setting.description);
  });
}

// ── INTEGRATION FUNCTIONS ────────────────────────────────────────────────

function getAllIntegrations() {
  return getDb().prepare('SELECT * FROM integrations ORDER BY priority ASC').all();
}

function getIntegrationBySlug(slug) {
  return getDb().prepare('SELECT * FROM integrations WHERE slug = ?').get(slug);
}

function getIntegrationById(id) {
  return getDb().prepare('SELECT * FROM integrations WHERE id = ?').get(id);
}

function createIntegration(data) {
  const stmt = getDb().prepare(`
    INSERT INTO integrations (name, slug, webhook_url, source_type, enabled, priority, field_mapping_id, retry_count, timeout_ms, validation_rules, webhook_secret)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.slug,
    data.webhook_url || null,
    data.source_type || 'webhook',
    data.enabled !== undefined ? data.enabled : 1,
    data.priority || 0,
    data.field_mapping_id || null,
    data.retry_count || 3,
    data.timeout_ms || 30000,
    data.validation_rules ? JSON.stringify(data.validation_rules) : null,
    data.webhook_secret || null
  );
  return getIntegrationById(result.lastInsertRowid);
}

function updateIntegration(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.webhook_url !== undefined) { fields.push('webhook_url = ?'); values.push(data.webhook_url); }
  if (data.source_type !== undefined) { fields.push('source_type = ?'); values.push(data.source_type); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled); }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
  if (data.field_mapping_id !== undefined) { fields.push('field_mapping_id = ?'); values.push(data.field_mapping_id); }
  if (data.retry_count !== undefined) { fields.push('retry_count = ?'); values.push(data.retry_count); }
  if (data.timeout_ms !== undefined) { fields.push('timeout_ms = ?'); values.push(data.timeout_ms); }
  if (data.validation_rules !== undefined) { fields.push('validation_rules = ?'); values.push(JSON.stringify(data.validation_rules)); }
  if (data.webhook_secret !== undefined) { fields.push('webhook_secret = ?'); values.push(data.webhook_secret); }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  getDb().prepare(`UPDATE integrations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getIntegrationById(id);
}

function deleteIntegration(id) {
  getDb().prepare('DELETE FROM integrations WHERE id = ?').run(id);
}

function enableIntegration(id) {
  return updateIntegration(id, { enabled: 1 });
}

function disableIntegration(id) {
  return updateIntegration(id, { enabled: 0 });
}

// ── FIELD MAPPING FUNCTIONS ─────────────────────────────────────────────

function getAllFieldMappings() {
  return getDb().prepare('SELECT * FROM field_mappings ORDER BY name ASC').all();
}

function getFieldMappingById(id) {
  const row = getDb().prepare('SELECT * FROM field_mappings WHERE id = ?').get(id);
  if (row && row.mappings) {
    row.mappings = JSON.parse(row.mappings);
  }
  return row;
}

function createFieldMapping(data) {
  const stmt = getDb().prepare(`
    INSERT INTO field_mappings (name, description, mappings)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.description || null,
    JSON.stringify(data.mappings)
  );
  return getFieldMappingById(result.lastInsertRowid);
}

function updateFieldMapping(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.mappings !== undefined) { fields.push('mappings = ?'); values.push(JSON.stringify(data.mappings)); }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  getDb().prepare(`UPDATE field_mappings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getFieldMappingById(id);
}

function deleteFieldMapping(id) {
  getDb().prepare('DELETE FROM field_mappings WHERE id = ?').run(id);
}

// ── LEAD FUNCTIONS ────────────────────────────────────────────────────────

function insertLeadEnhanced(data) {
  const stmt = getDb().prepare(`
    INSERT INTO leads (lead_id, integration_id, source, name, phone, email, property_title, property_id, budget, location, message, requirements, timeline, raw_payload, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lead_id) DO UPDATE SET
      integration_id=excluded.integration_id,
      source=excluded.source,
      name=excluded.name,
      phone=excluded.phone,
      email=excluded.email,
      property_title=excluded.property_title,
      property_id=excluded.property_id,
      budget=excluded.budget,
      location=excluded.location,
      message=excluded.message,
      requirements=excluded.requirements,
      timeline=excluded.timeline,
      raw_payload=excluded.raw_payload,
      updated_at=datetime('now')
  `);

  const result = stmt.run(
    data.leadId,
    data.integrationId || null,
    data.source,
    data.name,
    data.phone,
    data.email,
    data.propertyTitle,
    data.propertyId,
    data.budget,
    data.location,
    data.message,
    data.requirements,
    data.timeline,
    JSON.stringify(data.rawPayload),
    data.assignedTo || null
  );

  const leadId = data.leadId ? getLeadIdByLeadId(data.leadId) : result.lastInsertRowid;
  
  // Add timeline entry
  addTimelineEntry(leadId, 'lead_created', { source: data.source }, 'System');
  
  return leadId;
}

function getLeadIdByLeadId(leadId) {
  const row = getDb().prepare('SELECT id FROM leads WHERE lead_id = ?').get(leadId);
  return row ? row.id : null;
}

function getLeadById(id) {
  return getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

function getLeadByLeadId(leadId) {
  return getDb().prepare('SELECT * FROM leads WHERE lead_id = ?').get(leadId);
}

function updateLeadStatus(id, status, performedBy = 'System') {
  const oldLead = getLeadById(id);
  getDb().prepare('UPDATE leads SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  
  addTimelineEntry(id, 'status_changed', {
    from: oldLead.status,
    to: status
  }, performedBy);
  
  return getLeadById(id);
}

function updateLeadAssignment(id, assignedTo, performedBy = 'System') {
  const oldLead = getLeadById(id);
  getDb().prepare('UPDATE leads SET assigned_to = ?, updated_at = datetime(\'now\') WHERE id = ?').run(assignedTo, id);
  
  addTimelineEntry(id, 'assignment_changed', {
    from: oldLead.assigned_to,
    to: assignedTo
  }, performedBy);
  
  return getLeadById(id);
}

function checkDuplicateLead(phone, email, hours = 24) {
  const stmt = getDb().prepare(`
    SELECT * FROM leads 
    WHERE (phone = ? OR email = ?) 
    AND datetime(created_at) > datetime('now', '-' || ? || ' hours')
    ORDER BY created_at DESC
    LIMIT 1
  `);
  return stmt.get(phone, email, hours);
}

/**
 * Updates the Zoho CRM lead ID after a successful push (for backward compatibility)
 * @param {number} id - Local row ID
 * @param {string} zohoLeadId - Zoho record ID
 */
function updateLeadZohoId(id, zohoLeadId) {
  try {
    getDb().prepare('UPDATE leads SET zoho_lead_id = ? WHERE id = ?').run(zohoLeadId, id);
  } catch (error) {
    console.error('[db-enhanced] Error updating Zoho lead ID:', error.message);
    throw new Error(`Failed to update Zoho lead ID: ${error.message}`);
  }
}

/**
 * Updates the AISensy notification status (for backward compatibility)
 * @param {number} id - Local row ID
 * @param {'sent'|'failed'} status
 */
function updateLeadAisensyStatus(id, status) {
  try {
    getDb().prepare('UPDATE leads SET whatsapp_status = ? WHERE id = ?').run(status, id);
  } catch (error) {
    console.error('[db-enhanced] Error updating AISensy status:', error.message);
    throw new Error(`Failed to update AISensy status: ${error.message}`);
  }
}

/**
 * Updates the Telegram notification status (for backward compatibility)
 * @param {number} id - Local row ID
 * @param {'sent'|'failed'} status
 */
function updateLeadTelegramStatus(id, status) {
  try {
    getDb().prepare('UPDATE leads SET telegram_status = ? WHERE id = ?').run(status, id);
  } catch (error) {
    console.error('[db-enhanced] Error updating Telegram status:', error.message);
    throw new Error(`Failed to update Telegram status: ${error.message}`);
  }
}

function getAllLeads(limit = 50, offset = 0, source = '', search = '') {
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return getDb().prepare(query).all(...params);
}

function getLeadsCount(source = '', search = '') {
  let query = 'SELECT COUNT(*) as count FROM leads WHERE 1=1';
  const params = [];

  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const result = getDb().prepare(query).all(...params);
  return result[0].count;
}

// ── TIMELINE FUNCTIONS ───────────────────────────────────────────────────

function addTimelineEntry(leadId, eventType, eventData, performedBy = 'System') {
  const stmt = getDb().prepare(`
    INSERT INTO lead_timeline (lead_id, event_type, event_data, performed_by)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(leadId, eventType, JSON.stringify(eventData), performedBy);
}

function getLeadTimeline(leadId, limit = 50) {
  return getDb().prepare(`
    SELECT * FROM lead_timeline 
    WHERE lead_id = ? 
    ORDER BY performed_at DESC 
    LIMIT ?
  `).all(leadId, limit);
}

// ── USER FUNCTIONS ────────────────────────────────────────────────────────

function getAllUsers() {
  return getDb().prepare('SELECT * FROM users ORDER BY name ASC').all();
}

function getUserById(id) {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (row && row.permissions) {
    row.permissions = JSON.parse(row.permissions);
  }
  return row;
}

function getUserByEmail(email) {
  const row = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (row && row.permissions) {
    row.permissions = JSON.parse(row.permissions);
  }
  return row;
}

function createUser(data) {
  const stmt = getDb().prepare(`
    INSERT INTO users (email, name, role, phone, active, permissions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.email,
    data.name,
    data.role || 'Sales Agent',
    data.phone || null,
    data.active !== undefined ? data.active : 1,
    data.permissions ? JSON.stringify(data.permissions) : null
  );
  return getUserById(result.lastInsertRowid);
}

function updateUser(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }
  if (data.permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(data.permissions)); }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(id);
}

function deleteUser(id) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ── AUDIT LOG FUNCTIONS ─────────────────────────────────────────────────

function addAuditLog(data) {
  const stmt = getDb().prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.userId || null,
    data.action,
    data.entityType || null,
    data.entityId || null,
    data.changes ? JSON.stringify(data.changes) : null,
    data.ipAddress || null,
    data.userAgent || null
  );
}

function getAuditLogs(filters = {}, limit = 100) {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (filters.userId) {
    query += ' AND user_id = ?';
    params.push(filters.userId);
  }
  if (filters.action) {
    query += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters.entityType) {
    query += ' AND entity_type = ?';
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    query += ' AND entity_id = ?';
    params.push(filters.entityId);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return getDb().prepare(query).all(...params);
}

// ── SYSTEM SETTINGS FUNCTIONS ────────────────────────────────────────────

function getAllSettings() {
  return getDb().prepare('SELECT * FROM system_settings ORDER BY category, key ASC').all();
}

function getSetting(key) {
  const row = getDb().prepare('SELECT * FROM system_settings WHERE key = ?').get(key);
  if (row) {
    switch (row.value_type) {
      case 'number':
        row.value = parseFloat(row.value);
        break;
      case 'boolean':
        row.value = row.value === 'true';
        break;
      case 'json':
        row.value = JSON.parse(row.value);
        break;
    }
  }
  return row;
}

function setSetting(key, value, valueType = 'string', category = 'general', description = null, isSecret = false) {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, value_type, category, description, is_secret, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(key, String(value), valueType, category, description, isSecret ? 1 : 0);
  return getSetting(key);
}

function updateSetting(key, value) {
  const existing = getSetting(key);
  if (existing) {
    return setSetting(key, value, existing.value_type, existing.category, existing.description, existing.is_secret);
  }
  return null;
}

// ── SYNC STATUS FUNCTIONS ────────────────────────────────────────────────

function createSyncStatus(leadId, system, syncType) {
  const stmt = getDb().prepare(`
    INSERT INTO sync_status (lead_id, system, sync_type, status)
    VALUES (?, ?, ?, 'pending')
  `);
  const result = stmt.run(leadId, system, syncType);
  return getSyncStatusById(result.lastInsertRowid);
}

function getSyncStatusById(id) {
  return getDb().prepare('SELECT * FROM sync_status WHERE id = ?').get(id);
}

function updateSyncStatus(id, status, errorMessage = null) {
  const fields = ['status = ?', 'last_attempt_at = datetime(\'now\')', 'attempt_count = attempt_count + 1'];
  const values = [status];

  if (errorMessage) {
    fields.push('error_message = ?');
    values.push(errorMessage);
  }

  if (status === 'success') {
    fields.push('completed_at = datetime(\'now\')');
  }

  values.push(id);

  getDb().prepare(`UPDATE sync_status SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getSyncStatusById(id);
}

function getLeadSyncStatus(leadId) {
  return getDb().prepare('SELECT * FROM sync_status WHERE lead_id = ? ORDER BY created_at DESC').all(leadId);
}

// ── ROUTING RULES FUNCTIONS ───────────────────────────────────────────────

function getAllRoutingRules() {
  const rules = getDb().prepare('SELECT * FROM routing_rules WHERE enabled = 1 ORDER BY priority ASC').all();
  return rules.map(rule => ({
    ...rule,
    conditions: JSON.parse(rule.conditions),
    actions: JSON.parse(rule.actions)
  }));
}

function createRoutingRule(data) {
  const stmt = getDb().prepare(`
    INSERT INTO routing_rules (name, priority, conditions, actions, enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.priority || 0,
    JSON.stringify(data.conditions),
    JSON.stringify(data.actions),
    data.enabled !== undefined ? data.enabled : 1
  );
  return getRoutingRuleById(result.lastInsertRowid);
}

function getRoutingRuleById(id) {
  const row = getDb().prepare('SELECT * FROM routing_rules WHERE id = ?').get(id);
  if (row) {
    row.conditions = JSON.parse(row.conditions);
    row.actions = JSON.parse(row.actions);
  }
  return row;
}

function updateRoutingRule(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
  if (data.conditions !== undefined) { fields.push('conditions = ?'); values.push(JSON.stringify(data.conditions)); }
  if (data.actions !== undefined) { fields.push('actions = ?'); values.push(JSON.stringify(data.actions)); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled); }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  getDb().prepare(`UPDATE routing_rules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getRoutingRuleById(id);
}

function deleteRoutingRule(id) {
  getDb().prepare('DELETE FROM routing_rules WHERE id = ?').run(id);
}

module.exports = {
  getDb,
  // Integration functions
  getAllIntegrations,
  getIntegrationBySlug,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  enableIntegration,
  disableIntegration,
  // Field mapping functions
  getAllFieldMappings,
  getFieldMappingById,
  createFieldMapping,
  updateFieldMapping,
  deleteFieldMapping,
  // Lead functions
  insertLeadEnhanced,
  getLeadById,
  getLeadByLeadId,
  getAllLeads,
  getLeadsCount,
  updateLeadStatus,
  updateLeadAssignment,
  checkDuplicateLead,
  updateLeadZohoId,
  updateLeadAisensyStatus,
  updateLeadTelegramStatus,
  // Timeline functions
  addTimelineEntry,
  getLeadTimeline,
  // User functions
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  // Audit log functions
  addAuditLog,
  getAuditLogs,
  // System settings functions
  getAllSettings,
  getSetting,
  setSetting,
  updateSetting,
  // Sync status functions
  createSyncStatus,
  getSyncStatusById,
  updateSyncStatus,
  getLeadSyncStatus,
  // Routing rules functions
  getAllRoutingRules,
  createRoutingRule,
  getRoutingRuleById,
  updateRoutingRule,
  deleteRoutingRule
};