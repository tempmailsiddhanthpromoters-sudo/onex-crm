/**
 * ─────────────────────────────────────────────────────────────────────
 * OneX 99acres Webhook Server — Entry Point
 * ─────────────────────────────────────────────────────────────────────
 *
 * This Express server:
 *
 *  1. Receives POST requests at `/99acres-webhook` with lead JSON
 *     from the 99acres portal.
 *  2. Immediately persists the lead in a local SQLite database.
 *  3. In parallel:
 *     a) Creates a Lead record in Zoho CRM (with OAuth2 refresh flow).
 *     b) Sends a WhatsApp alert to the sales team via AISensy API.
 *  4. Returns a JSON response with the processing status.
 *
 * Endpoints:
 *   POST /99acres-webhook  – Ingest a new 99acres lead
 *   GET  /health           – Health-check for uptime monitors
 * ─────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { createLeadWithRetry } = require('./services/zoho');
const { sendWhatsAppWithRetry } = require('./services/aisensy');
const {
  insertLead,
  updateLeadZohoId,
  updateLeadAisensyStatus,
} = require('./services/database');
const { errorHandler, logFailure } = require('./middleware/errorHandler');
const {
  router: adminRouter,
  updateLastWebhookStatus,
  updateLastZohoPushStatus,
  updateLastAisensyStatus,
} = require('./routes/admin');

/* ── Initialise Express ─────────────────────────────────────────────── */
const app = express();

// Security headers (CSP, HSTS, X-Frame, etc.)
app.use(helmet());

// Allow cross-origin requests (restrict in production if needed)
app.use(cors());

// HTTP request logging → stdout
app.use(morgan('combined'));

// Parse JSON bodies up to 1 MB (adjust if 99acres or other sources send larger payloads)
app.use(express.json({ limit: '1mb' }));

/* ── Admin API routes ────────────────────────────────────────────────── */
app.use('/api/admin', adminRouter);

function normalizeSource(source) {
  if (!source) return 'Unknown';
  const key = source.toString().trim().toLowerCase();
  const map = {
    '99acres': '99acres',
    'housing': 'Housing.com',
    'magicbricks': 'MagicBricks',
    'meta': 'Meta Ads',
    'facebook': 'Facebook Ads',
    'fb': 'Facebook Ads',
    'google': 'Google Ads',
    'website': 'Website Form',
  };
  return map[key] || source.toString().trim();
}

function extractLeadFields(body, defaultSource) {
  const source = normalizeSource(defaultSource || body.source || body.sourceName || body.source_key || 'unknown');
  const name = body.name || body.Name || body.buyer_name || body.contact_name || '';
  const phone = body.phone || body.Phone || body.mobile || body.buyer_mobile || body.phone_number || body.contact_number || '';
  const email = body.email || body.Email || body.buyer_email || body.emailId || '';
  const property = body.property || body.Property || body.project || body.property_title || body.project_name || '';
  const budget = body.budget || body.Budget || '';
  const location = body.location || body.Location || body.city || body.locality_title || '';

  return { source, name, phone, email, property, budget, location };
}

async function handleIncomingWebhook(req, res, defaultSource) {
  const body = req.body || {};
  const querySource = req.query?.source || req.query?.src || req.query?.platform || '';
  const leadPayload = extractLeadFields(body, querySource || defaultSource);

  console.log('[webhook] Incoming payload:', JSON.stringify(body).slice(0, 500));
  console.log('[webhook] Normalized lead:', JSON.stringify(leadPayload));

  // Track webhook received
  updateLastWebhookStatus(leadPayload.source);

  const leadId = insertLead({
    source: leadPayload.source,
    name: leadPayload.name,
    phone: leadPayload.phone,
    email: leadPayload.email,
    property: leadPayload.property,
    budget: leadPayload.budget,
    location: leadPayload.location,
    rawPayload: body,
  });

  const results = await Promise.allSettled([
    createLeadWithRetry(leadPayload),
    sendWhatsAppWithRetry(leadPayload),
  ]);

  const [zohoResult, aisensyResult] = results;

  if (zohoResult.status === 'fulfilled' && zohoResult.value) {
    updateLeadZohoId(leadId, zohoResult.value);
    updateLastZohoPushStatus('success');
  } else {
    logFailure(
      `Zoho CRM failure for lead #${leadId}: ${zohoResult.reason?.message || 'unknown'}`
    );
    updateLastZohoPushStatus('failed');
  }

  if (aisensyResult.status === 'fulfilled') {
    updateLeadAisensyStatus(leadId, 'sent');
    updateLastAisensyStatus('success');
  } else {
    logFailure(
      `AISensy failure for lead #${leadId}: ${aisensyResult.reason?.message || 'unknown'}`
    );
    updateLeadAisensyStatus(leadId, 'failed');
    updateLastAisensyStatus('failed');
  }

  const allOk =
    zohoResult.status === 'fulfilled' && aisensyResult.status === 'fulfilled';

  res.status(allOk ? 200 : 207).json({
    success: allOk,
    leadId,
    source: leadPayload.source,
    zoho:
      zohoResult.status === 'fulfilled'
        ? { id: zohoResult.value }
        : { error: zohoResult.reason?.message },
    whatsapp:
      aisensyResult.status === 'fulfilled'
        ? { status: 'sent' }
        : { error: aisensyResult.reason?.message },
  });
}

/* ── Webhook endpoints ───────────────────────────────────────────────── */
app.post('/99acres-webhook', async (req, res) => handleIncomingWebhook(req, res, '99acres'));
app.post('/housing-webhook', async (req, res) => handleIncomingWebhook(req, res, 'housing'));
app.post('/webhook', async (req, res) => handleIncomingWebhook(req, res));

/* ── Health check ───────────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

/* ── Global error handler (must be last) ────────────────────────────── */
app.use(errorHandler);

/* ── Start server ───────────────────────────────────────────────────── */
app.listen(config.port, () => {
  console.log(`\n🚀 OneX CRM Webhook Server listening on port ${config.port}`);
  console.log(`   Webhook Endpoints:`);
  console.log(`     POST /99acres-webhook`);
  console.log(`     POST /housing-webhook`);
  console.log(`     POST /webhook?source={source}`);
  console.log(`   Admin API:`);
  console.log(`     GET  /api/admin/health`);
  console.log(`     GET  /api/admin/settings`);
  console.log(`     POST /api/admin/settings`);
  console.log(`     GET  /api/admin/leads`);
  console.log(`     GET  /api/admin/analytics`);
  console.log(`     GET  /api/admin/sources`);
  console.log(`   Health Check:`);
  console.log(`     GET  /health\n`);
});
