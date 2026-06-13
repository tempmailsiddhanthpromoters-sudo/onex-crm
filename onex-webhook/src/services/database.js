/**
 * ─────────────────────────────────────────────────────────────────────
 * SQLite Database Service
 * ─────────────────────────────────────────────────────────────────────
 * Provides a local backup store for every lead received from 99acres.
 *
 * Uses `better-sqlite3` for synchronous, fast, single-file persistence
 * with WAL mode enabled for concurrent read performance.
 *
 * Schema (`leads` table):
 *   id              – auto-increment PK
 *   name            – lead name
 *   phone           – phone number
 *   email           – email address
 *   property        – property of interest
 *   budget          – stated budget
 *   location        – property / prospect location
 *   raw_payload     – full JSON payload from 99acres (for debugging)
 *   zoho_lead_id    – Zoho CRM record ID (populated after successful push)
 *   aisensy_status  – 'sent' | 'failed'
 *   created_at      – ISO timestamp
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
 * Creates the `data/` directory and the `leads` table if they don't exist.
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

    // Create table (idempotent)
    db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        source          TEXT,
        name            TEXT,
        phone           TEXT,
        email           TEXT,
        property        TEXT,
        budget          TEXT,
        location        TEXT,
        raw_payload     TEXT,
        zoho_lead_id    TEXT,
        aisensy_status  TEXT DEFAULT 'pending',
        created_at      TEXT DEFAULT (datetime('now'))
      )
    `);

    console.log('[db] SQLite database ready →', config.db.path);
  }

  return db;
}

/**
 * Inserts a new lead row and returns the auto-generated row ID.
 *
 * @param {Object} lead
 * @param {string} lead.name
 * @param {string} lead.phone
 * @param {string} lead.email
 * @param {string} lead.property
 * @param {string} lead.budget
 * @param {string} lead.location
 * @param {Object} lead.rawPayload - Original JSON from 99acres
 * @returns {number} Inserted row ID
 */
function insertLead({ source, name, phone, email, property, budget, location, rawPayload }) {
  const stmt = getDb().prepare(`
    INSERT INTO leads (source, name, phone, email, property, budget, location, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    source,
    name,
    phone,
    email,
    property,
    budget,
    location,
    JSON.stringify(rawPayload)
  );

  console.log(`[db] Lead inserted → row #${result.lastInsertRowid}`);
  return result.lastInsertRowid;
}

/**
 * Updates the Zoho CRM lead ID after a successful push.
 * @param {number} id - Local row ID
 * @param {string} zohoLeadId - Zoho record ID
 */
function updateLeadZohoId(id, zohoLeadId) {
  getDb().prepare('UPDATE leads SET zoho_lead_id = ? WHERE id = ?').run(zohoLeadId, id);
}

/**
 * Updates the AISensy notification status.
 * @param {number} id - Local row ID
 * @param {'sent'|'failed'} status
 */
function updateLeadAisensyStatus(id, status) {
  getDb().prepare('UPDATE leads SET aisensy_status = ? WHERE id = ?').run(status, id);
}

module.exports = { insertLead, updateLeadZohoId, updateLeadAisensyStatus };
