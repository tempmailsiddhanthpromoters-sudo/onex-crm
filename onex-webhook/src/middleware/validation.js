/**
 * ─────────────────────────────────────────────────────────────────────
 * Request Validation Middleware using Zod
 * ─────────────────────────────────────────────────────────────────────
 * Provides schema validation for webhook payloads and admin requests.
 * 
 * Validates:
 * - name, phone, email, source, project
 * - webhook payloads
 * ─────────────────────────────────────────────────────────────────────
 */

const { z } = require('zod');

/**
 * Lead payload schema for webhook validation
 */
const leadPayloadSchema = z.object({
  leadId: z.string().optional(),
  source: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone too long'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  property: z.string().max(200, 'Property name too long').optional(),
  budget: z.string().max(50, 'Budget too long').optional(),
  location: z.string().max(100, 'Location too long').optional(),
  message: z.string().max(500, 'Message too long').optional(),
  requirements: z.string().max(500, 'Requirements too long').optional(),
  timeline: z.string().max(50, 'Timeline too long').optional(),
}).refine(data => {
  // Custom phone validation: must contain only digits
  const phoneDigits = data.phone.replace(/\D/g, '');
  return phoneDigits.length >= 10;
}, {
  message: 'Phone must contain at least 10 digits',
  path: ['phone']
});

/**
 * Generic webhook payload schema (more flexible)
 */
const webhookPayloadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().optional(),
  property: z.string().optional(),
  budget: z.string().optional(),
  location: z.string().optional(),
  message: z.string().optional(),
  requirements: z.string().optional(),
  timeline: z.string().optional(),
}).passthrough(); // Allow additional fields

/**
 * Admin settings update schema
 */
const settingsUpdateSchema = z.object({
  zoho: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenUrl: z.string().url().optional(),
    apiUrl: z.string().url().optional(),
  }).optional(),
  aisensy: z.object({
    apiKey: z.string().optional(),
    campaignName: z.string().optional(),
    destination: z.string().optional(),
    userName: z.string().optional(),
  }).optional(),
  telegram: z.object({
    botToken: z.string().optional(),
    chatId: z.string().optional(),
  }).optional(),
  email: z.object({
    enabled: z.boolean().optional(),
    recipient: z.string().email().optional(),
  }).optional(),
}).passthrough();

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} errorMessage - Custom error message
 */
const validate = (schema, errorMessage = 'Validation failed') => {
  return (req, res, next) => {
    try {
      // Handle both wrapped and unwrapped payloads
      const dataToValidate = req.body.data || req.body;
      
      const result = schema.safeParse(dataToValidate);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(422).json({
          success: false,
          error: errorMessage,
          details: errors
        });
      }
      
      // Replace body with validated data (unwrap if needed)
      if (req.body.data) {
        req.body.data = result.data;
      } else {
        req.body = result.data;
      }
      
      next();
    } catch (error) {
      console.error('[validation] Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: 'Validation error occurred'
      });
    }
  };
};

module.exports = {
  leadPayloadSchema,
  webhookPayloadSchema,
  settingsUpdateSchema,
  validate
};
