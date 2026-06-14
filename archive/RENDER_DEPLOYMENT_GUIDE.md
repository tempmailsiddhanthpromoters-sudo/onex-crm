# Render Deployment Guide

**Date:** June 14, 2026  
**Project:** OneX CRM  
**Purpose:** Step-by-step guide for deploying Node backend to Render.com

---

## Prerequisites

### Before You Begin

1. **GitHub Account**
   - Create a GitHub account if you don't have one
   - Ensure your repository is pushed to GitHub

2. **Render Account**
   - Sign up at https://render.com
   - Verify your email address
   - Connect your GitHub account to Render

3. **Required Credentials**
   - Zoho CRM OAuth credentials (Client ID, Client Secret, Refresh Token)
   - AiSensy WhatsApp API key
   - Telegram Bot token (optional)
   - Admin email address

---

## Step 1: Push to GitHub

### Commit Your Changes

```bash
cd "c:\Users\works_ar\Documents\OneX CRM"
git add .
git commit -m "Phase 2 & 3: Production deployment fixes - Enhanced backend ready"
git push origin main
```

### Verify Repository

1. Go to https://github.com
2. Navigate to your repository
3. Verify all files are present:
   - `render.yaml`
   - `onex-webhook/package.json`
   - `onex-webhook/Dockerfile`
   - `onex-webhook/src/indexEnhanced.js`
   - `onex-webhook/.env.example`

---

## Step 2: Create Render Web Service

### 2.1 Log in to Render

1. Go to https://dashboard.render.com
2. Click "New" button
3. Select "Web Service"

### 2.2 Connect GitHub Repository

1. Under "Connect GitHub Repository", search for your repository
2. Click "Connect" next to your repository
3. Render will ask for authorization - approve it

### 2.3 Configure Build & Deploy

**Name:** `onex-crm-webhook`

**Region:** Singapore (or closest to your users)

**Branch:** `main`

**Runtime:** `Node`

**Build Command:** `npm install --prefix onex-webhook`

**Start Command:** `node onex-webhook/src/indexEnhanced.js`

### 2.4 Configure Environment Variables

Render will automatically detect environment variables from `render.yaml`. Verify these are set:

**Required Variables:**
```
NODE_ENV=production
PORT=3000
```

**Integration Variables (configure in Render dashboard):**
```
ZOHO_REFRESH_TOKEN=your_actual_refresh_token
ZOHO_CLIENT_ID=your_actual_client_id
ZOHO_CLIENT_SECRET=your_actual_client_secret
ZOHO_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token
ZOHO_API_URL=https://www.zohoapis.in/crm/v2/Leads
AISENSY_API_KEY=your_actual_api_key
AISENSY_CAMPAIGN_NAME=new_lead_welcome_notification
AISENSY_DESTINATION_PHONE=91XXXXXXXXXX
AISENSY_USER_NAME=Your Company Name
TELEGRAM_BOT_TOKEN=your_actual_bot_token
TELEGRAM_CHAT_ID=your_actual_chat_id
DB_PATH=./data/leads.db
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

**Important Notes:**
- Replace placeholder values with actual credentials
- Keep secrets secure - never commit them to GitHub
- Zoho region URLs may vary based on your account region

### 2.5 Advanced Settings

**Health Check Path:** `/api/admin/health`

**Instance Type:** Free (for testing) or Standard (for production)

**Auto-Deploy:** Enabled (default)

---

## Step 3: Deploy

### 3.1 Initiate Deployment

1. Click "Create Web Service" button
2. Render will start building your application
3. Monitor the build logs for any errors

### 3.2 Monitor Build Process

**Expected Build Steps:**
1. Clone repository
2. Install dependencies (`npm install`)
3. Build Docker image (if using Docker)
4. Start application
5. Health check

**Build Time:** 2-5 minutes (first build may take longer)

### 3.3 Verify Deployment

Once deployment is complete, you should see:
- ✅ Status: "Live"
- ✅ URL: https://onex-crm-webhook.onrender.com
- ✅ Health check passing

---

## Step 4: Verify Deployment

### 4.1 Test Health Check

```bash
curl https://onex-crm-webhook.onrender.com/api/admin/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-14T06:30:00.000Z",
  "uptime": 123.456,
  "database": {
    "status": "connected",
    "integrations": 6,
    "settings": 11
  },
  "integrations": [
    {
      "name": "99acres",
      "slug": "99acres",
      "enabled": true
    }
  ]
}
```

### 4.2 Test Webhook Endpoint

```bash
curl -X POST https://onex-crm-webhook.onrender.com/webhook/99acres \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "9876543210",
    "email": "test@example.com",
    "property": "Test Property",
    "budget": "50L",
    "location": "Mumbai"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "leadId": "lead_1234567890_abc123",
  "source": "99acres"
}
```

### 4.3 Test Admin API

```bash
curl https://onex-crm-webhook.onrender.com/api/admin/settings
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "zoho_clientId": "***",
    "zoho_clientSecret": "***",
    "zoho_refreshToken": "***",
    "aisensy_apiKey": "***",
    "telegram_botToken": "***"
  }
}
```

---

## Step 5: Configure Integrations

### 5.1 Get Render URL

Your Render service URL will be:
```
https://onex-crm-webhook.onrender.com
```

### 5.2 Update Google Apps Script

1. Open your Google Apps Script project
2. Go to Config.gs
3. Update `nodeApiUrl` property:
   ```javascript
   PropertiesService.getScriptProperties().setProperty('NODE_API_URL', 'https://onex-crm-webhook.onrender.com');
   ```

### 5.3 Configure Webhook URLs

Use these webhook URLs for your lead sources:

**99acres:** `https://onex-crm-webhook.onrender.com/webhook/99acres`
**Housing:** `https://onex-crm-webhook.onrender.com/webhook/housing`
**MagicBricks:** `https://onex-crm-webhook.onrender.com/webhook/magicbricks`
**Facebook:** `https://onex-crm-webhook.onrender.com/webhook/facebook`
**Google:** `https://onex-crm-webhook.onrender.com/webhook/google`
**Website:** `https://onex-crm-webhook.onrender.com/webhook/website`

---

## Step 6: Test End-to-End Flow

### 6.1 Deploy Google Apps Script

1. Open Google Apps Script project
2. Deploy as Web App
3. Set access to "Anyone"
4. Copy the Web App URL

### 6.2 Open CRM UI

1. Open the Web App URL in your browser
2. You should see the Admin Panel
3. Enter your Node backend URL: `https://onex-crm-webhook.onrender.com`

### 6.3 Configure Credentials in UI

1. Navigate to Settings screen
2. Enter Zoho credentials
3. Enter AiSensy credentials
4. Enter Telegram credentials
5. Click "Save Settings"

### 6.4 Test Lead Flow

1. Send a test webhook to Render
2. Check CRM UI - lead should appear
3. Check Zoho CRM - lead should be synced
4. Check WhatsApp - notification should be sent
5. Check Telegram - notification should be sent

---

## Troubleshooting

### Issue: Build Fails

**Symptoms:** Build process fails with error

**Solutions:**
1. Check build logs in Render dashboard
2. Verify `package.json` is correct
3. Verify `startCommand` points to `indexEnhanced.js`
4. Check for missing dependencies

### Issue: Health Check Fails

**Symptoms:** Service deployed but health check fails

**Solutions:**
1. Verify health check path: `/api/admin/health`
2. Check server logs for errors
3. Verify PORT environment variable is set to 3000
4. Verify database initialization succeeded

### Issue: Database Not Persisting

**Symptoms:** Database resets on redeploy

**Solutions:**
1. Render free tier doesn't have persistent disk
2. Upgrade to Standard tier for persistent disk
3. Or use external database (PostgreSQL) instead of SQLite

### Issue: Webhook Not Receiving Data

**Symptoms:** Webhook endpoint not receiving leads

**Solutions:**
1. Verify webhook URL is correct
2. Check lead source is sending to correct endpoint
3. Check rate limiting is not blocking requests
4. Verify webhook secret (if configured)

### Issue: Zoho Sync Fails

**Symptoms:** Leads not syncing to Zoho

**Solutions:**
1. Verify Zoho credentials are correct
2. Check Zoho region URLs match your account
3. Test Zoho connection in CRM UI
4. Check Zoho API logs

### Issue: WhatsApp Not Sending

**Symptoms:** WhatsApp notifications not sent

**Solutions:**
1. Verify AiSensy API key is correct
2. Verify campaign name matches in AiSensy dashboard
3. Check destination phone number format
4. Test AiSensy connection in CRM UI

---

## Render-Specific Considerations

### Free Tier Limitations

- **Sleeps after 15 minutes of inactivity**
- **Cold starts take 30-60 seconds**
- **No persistent disk storage**
- **512 MB RAM limit**
- **512 MB disk limit**

### Recommendations for Production

1. **Upgrade to Standard Tier**
   - Persistent disk storage
   - No sleep inactivity
   - More RAM and CPU
   - Better performance

2. **Use PostgreSQL instead of SQLite**
   - Render provides managed PostgreSQL
   - Better for production
   - Automatic backups
   - Better scaling

3. **Enable Monitoring**
   - Set up log aggregation
   - Configure error tracking
   - Set up uptime monitoring

### Environment Variables in Render

**How to Add:**
1. Go to your Web Service in Render dashboard
2. Scroll to "Environment" section
3. Click "Add Environment Variable"
4. Add key-value pairs
5. Click "Save Changes"
6. Redeploy service

**Secrets Management:**
- Never commit secrets to GitHub
- Use Render's environment variables for secrets
- Render encrypts secrets at rest
- Rotate secrets regularly

---

## Post-Deployment Checklist

- [ ] Service deployed successfully
- [ ] Health check passing
- [ ] Webhook endpoint accessible
- [ ] Admin API accessible
- [ ] Database initialized
- [ ] Environment variables configured
- [ ] Zoho credentials configured
- [ ] AiSensy credentials configured
- [ ] Telegram credentials configured
- [ ] Google Apps Script deployed
- [ ] CRM UI accessible
- [ ] Test lead received
- [ ] Zoho sync working
- [ ] WhatsApp sending
- [ ] Telegram sending
- [ ] Logs accessible

---

## Scaling Considerations

### When to Scale

- More than 100 leads per day
- Slow response times
- High CPU usage
- Memory errors

### Scaling Options

1. **Upgrade Instance Type**
   - Free → Standard → Pro
   - More RAM and CPU
   - Better performance

2. **Add Horizontal Scaling**
   - Multiple instances
   - Load balancer
   - Better availability

3. **Use External Services**
   - PostgreSQL instead of SQLite
   - Redis for caching
   - CDN for static assets

---

## Backup Strategy

### Database Backup

**For SQLite (Free Tier):**
- Manual backup via Render dashboard
- Download database file periodically
- Store backups securely

**For PostgreSQL (Standard Tier):**
- Automatic daily backups
- Point-in-time recovery
- 7-day retention

### Configuration Backup

- Export environment variables
- Save to secure location
- Document custom configurations

---

## Security Best Practices

1. **Use HTTPS**
   - Render provides SSL certificates automatically
   - Always use HTTPS in production

2. **Secure Secrets**
   - Never commit secrets to GitHub
   - Use Render environment variables
   - Rotate secrets regularly

3. **Rate Limiting**
   - Rate limiting is enabled by default
   - Configure appropriate limits
   - Monitor for abuse

4. **Input Validation**
   - All inputs are validated
   - Zod schema validation
   - SQL injection protection

5. **CORS Configuration**
   - CORS is currently open
   - Restrict to specific origins in production
   - Update CORS middleware

---

## Monitoring and Logs

### Access Logs

1. Go to Render dashboard
2. Select your Web Service
3. Click "Logs" tab
4. View real-time logs

### Log Levels

- **INFO:** Normal operations
- **WARN:** Non-critical issues
- **ERROR:** Errors requiring attention

### Common Log Patterns

```
[webhook] Received webhook for source: 99acres
[db-enhanced] SQLite database ready with full CRM schema
[zoho] OAuth successful - tokens received
[aisensy] WhatsApp message sent successfully
[telegram] Notification sent successfully
```

---

## Cost Estimation

### Free Tier

- **Cost:** $0/month
- **Limitations:** Sleeps after inactivity, no persistent disk
- **Suitable for:** Testing, development, low-volume usage

### Standard Tier

- **Cost:** ~$25/month
- **Features:** No sleep, persistent disk, better performance
- **Suitable for:** Production, moderate volume

### Pro Tier

- **Cost:** ~$50+/month
- **Features:** More resources, better performance
- **Suitable for:** High volume, enterprise

---

## Support Resources

### Render Documentation
- https://render.com/docs
- https://render.com/docs/native-runtime
- https://render.com/docs/env-vars

### OneX CRM Documentation
- `FINAL_AUDIT_REPORT.md`
- `DEPLOYMENT_VALIDATION.md`
- `API_DOCUMENTATION_V2.md`
- `ARCHITECTURE_V2.md`

### Troubleshooting Help
1. Check Render logs
2. Review this guide
3. Check audit reports
4. Contact support if needed

---

## Next Steps

After successful deployment:

1. **Phase 4:** Audit GAS files for deployment
2. **Phase 5:** Create configuration wizard
3. **Phase 6:** End-to-end testing
4. **Phase 7:** UI validation
5. **Phase 8:** Production hardening
6. **Phase 9:** Final handover

---

**Deployment Guide Completed:** June 14, 2026  
**Status:** Ready for Render Deployment  
**Next Phase:** Phase 4 - GAS File Audit
