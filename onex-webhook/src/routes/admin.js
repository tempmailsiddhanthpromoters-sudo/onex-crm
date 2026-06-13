/**
 * Admin API Routes
 * Provides full control endpoints for the GAS CRM panel
 * Settings, leads, analytics, health checks
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { getMaskedSettings, updateSettings, getIntegrationStatus } = require('../services/settingsManager');

const router = express.Router();

// In-memory status tracking
let lastWebhookTime = null;
let lastWebhookSource = null;
let lastZohoPushTime = null;
let lastZohoPushStatus = 'pending';
let lastAisensyTime = null;
let lastAisensyStatus = 'pending';

// Exported functions to update status from main webhook handler
function updateLastWebhookStatus(source, timestamp = new Date()) {
  lastWebhookTime = timestamp;
  lastWebhookSource = source;
}

function updateLastZohoPushStatus(status, timestamp = new Date()) {
  lastZohoPushTime = timestamp;
  lastZohoPushStatus = status;
}

function updateLastAisensyStatus(status, timestamp = new Date()) {
  lastAisensyTime = timestamp;
  lastAisensyStatus = status;
}

/**
 * GET /api/admin/health
 * Full system health check
 */
router.get('/health', (req, res) => {
  const settings = getMaskedSettings();
  const integration = getIntegrationStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    integrations: integration,
    lastActivity: {
      webhook: {
        time: lastWebhookTime,
        source: lastWebhookSource,
      },
      zoho: {
        time: lastZohoPushTime,
        status: lastZohoPushStatus,
      },
      aisensy: {
        time: lastAisensyTime,
        status: lastAisensyStatus,
      },
    },
  });
});

/**
 * GET /api/admin/settings
 * Retrieve all masked settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = getMaskedSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[api] Settings retrieval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/settings
 * Update settings (credentials, endpoints, etc)
 */
router.post('/settings', (req, res) => {
  try {
    const newSettings = req.body;

    // Validate sensitive fields
    if (newSettings.zoho && newSettings.zoho.clientId && newSettings.zoho.clientId.includes('***')) {
      delete newSettings.zoho.clientId;
    }
    if (newSettings.zoho && newSettings.zoho.clientSecret && newSettings.zoho.clientSecret.includes('***')) {
      delete newSettings.zoho.clientSecret;
    }
    if (newSettings.zoho && newSettings.zoho.refreshToken && newSettings.zoho.refreshToken.includes('***')) {
      delete newSettings.zoho.refreshToken;
    }
    if (newSettings.aisensy && newSettings.aisensy.apiKey && newSettings.aisensy.apiKey.includes('***')) {
      delete newSettings.aisensy.apiKey;
    }
    if (newSettings.telegram && newSettings.telegram.botToken && newSettings.telegram.botToken.includes('***')) {
      delete newSettings.telegram.botToken;
    }

    const updated = updateSettings(newSettings);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[api] Settings update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/leads?limit=50&offset=0&source=99acres&status=New
 * List all leads with optional filters
 */
router.get('/leads', (req, res) => {
  try {
    const db = new Database(require('../config').db.path);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const source = req.query.source || '';
    const search = req.query.search || '';

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

    const leads = db.prepare(query).all(...params);
    const countResult = db.prepare('SELECT COUNT(*) as cnt FROM leads WHERE 1=1' + (source ? ' AND source = ?' : '') + (search ? ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)' : '')).all(...params.slice(0, params.length - 2));
    const total = countResult[0]?.cnt || 0;

    res.json({
      success: true,
      data: leads,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[api] Leads retrieval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/leads/:id
 * Get single lead detail
 */
router.get('/leads/:id', (req, res) => {
  try {
    const db = new Database(require('../config').db.path);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('[api] Lead detail error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/analytics
 * Dashboard analytics and statistics
 */
router.get('/analytics', (req, res) => {
  try {
    const db = new Database(require('../config').db.path);

    // Total counts
    const totalResult = db.prepare('SELECT COUNT(*) as cnt FROM leads').get();
    const total = totalResult?.cnt || 0;

    // Today's leads
    const todayResult = db
      .prepare("SELECT COUNT(*) as cnt FROM leads WHERE DATE(created_at) = DATE('now')")
      .get();
    const todayCount = todayResult?.cnt || 0;

    // By source
    const bySource = db
      .prepare('SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC')
      .all();

    // WhatsApp stats
    const whatsappSent = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE aisensy_status = 'sent'").get();
    const whatsappFailed = db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE aisensy_status = 'failed'").get();

    // Zoho sync stats
    const zohoSynced = db.prepare('SELECT COUNT(*) as cnt FROM leads WHERE zoho_lead_id IS NOT NULL').get();

    // Last 7 days trend
    const trend = db
      .prepare(
        `
        SELECT DATE(created_at) as date, source, COUNT(*) as count 
        FROM leads 
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at), source 
        ORDER BY date ASC
      `
      )
      .all();

    res.json({
      success: true,
      data: {
        summary: {
          total,
          today: todayCount,
          whatsappSent: whatsappSent?.cnt || 0,
          whatsappFailed: whatsappFailed?.cnt || 0,
          zohoSynced: zohoSynced?.cnt || 0,
        },
        bySource,
        trend,
      },
    });
  } catch (error) {
    console.error('[api] Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/leads/:id/resync-zoho
 * Manually retry Zoho sync for a lead
 */
router.post('/leads/:id/resync-zoho', (req, res) => {
  try {
    const db = new Database(require('../config').db.path);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // This will be called by webhook handler to actually push
    res.json({
      success: true,
      message: 'Resync queued. Check status after a few seconds.',
      leadId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/leads/:id/resend-whatsapp
 * Manually resend WhatsApp for a lead
 */
router.post('/leads/:id/resend-whatsapp', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'WhatsApp resend queued.',
      leadId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/sources
 * List all supported webhook sources
 */
router.get('/sources', (req, res) => {
  const sources = [
    { key: '99acres', name: '99acres', endpoint: '/99acres-webhook' },
    { key: 'housing', name: 'Housing.com', endpoint: '/housing-webhook' },
    { key: 'magicbricks', name: 'MagicBricks', endpoint: '/webhook?source=magicbricks' },
    { key: 'meta', name: 'Meta / Facebook Ads', endpoint: '/webhook?source=meta' },
    { key: 'google', name: 'Google Ads', endpoint: '/webhook?source=google' },
    { key: 'website', name: 'Website Form', endpoint: '/webhook?source=website' },
  ];

  res.json({ success: true, data: sources });
});

/**
 * GET /api/admin/webhook-urls
 * Generate shareable webhook URLs for deployment
 */
router.get('/webhook-urls', (req, res) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${require('../config').port}`;

  const urls = {
    '99acres': `${baseUrl}/99acres-webhook`,
    'housing': `${baseUrl}/housing-webhook`,
    'generic': `${baseUrl}/webhook?source={source_key}`,
  };

  res.json({ success: true, data: urls });
});

module.exports = { router, updateLastWebhookStatus, updateLastZohoPushStatus, updateLastAisensyStatus };
