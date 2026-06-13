/**
 * ─────────────────────────────────────────────────────────────────────
 * Error-Handling Middleware & Failure Logger
 * ─────────────────────────────────────────────────────────────────────
 * - `logFailure(msg)` — Appends timestamped error messages to
 *   `logs/errors.log` for post-mortem debugging.
 * - `errorHandler`    — Express global error handler that catches
 *   any unhandled errors from route handlers and returns a clean
 *   JSON response while logging the details to disk.
 * ─────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const config = require('../config');

/** Absolute path to the log directory */
const logDir = path.resolve(config.logs.dir);

/**
 * Creates the log directory if it doesn't already exist.
 * Called once lazily on first write.
 */
let logDirReady = false;
function ensureLogDir() {
  if (logDirReady) return;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logDirReady = true;
}

/**
 * Appends a timestamped failure message to `errors.log`.
 *
 * Example output:
 *   [2026-06-12T18:30:00.000Z] Zoho CRM failure for lead #42: token expired
 *
 * @param {string} message - Human-readable error description
 */
function logFailure(message) {
  ensureLogDir();
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(path.join(logDir, 'errors.log'), line);
  console.error('[error]', message);
}

/**
 * Express error-handling middleware.
 *
 * Must be registered **after** all routes. Express recognises it as an
 * error handler because of the 4-argument signature (err, req, res, next).
 */
function errorHandler(err, req, res, _next) {
  const summary = `${err.name}: ${err.message} | ${req.method} ${req.originalUrl}`;
  logFailure(summary);

  // Include Axios response body in logs if available
  if (err.response?.data) {
    console.error('[error] API response:', JSON.stringify(err.response.data));
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    // Only expose details in development
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
}

module.exports = { errorHandler, logFailure };
