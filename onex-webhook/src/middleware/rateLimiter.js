/**
 * ─────────────────────────────────────────────────────────────────────
 * Rate Limiting Middleware
 * ─────────────────────────────────────────────────────────────────────
 * Provides rate limiting for webhook and admin endpoints to prevent abuse.
 * 
 * Uses express-rate-limit with memory store for simplicity.
 * For production with multiple instances, consider using Redis store.
 * ─────────────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for webhook endpoints
 * Allows 100 requests per 15 minutes per IP
 */
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for requests with valid webhook secret
    const providedSecret = req.headers['x-webhook-secret'] || req.query.token;
    const expectedSecret = process.env.WEBHOOK_SECRET;
    
    // Only skip if both secrets exist and match
    if (expectedSecret && providedSecret && providedSecret === expectedSecret) {
      return true;
    }
    
    return false;
  }
});

/**
 * Rate limiter for admin API endpoints
 * Allows 200 requests per 15 minutes per IP
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: 'Too many admin requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Stricter rate limiter for sensitive admin operations
 * Allows 50 requests per 15 minutes per IP
 */
const strictAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    success: false,
    error: 'Too many sensitive operations, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  webhookLimiter,
  adminLimiter,
  strictAdminLimiter
};
