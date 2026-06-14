# Google Apps Script Deployment Guide

**Date:** June 14, 2026  
**Project:** OneX CRM  
**Purpose:** Step-by-step guide for deploying GAS CRM to Google Apps Script

---

## Prerequisites

### Before You Begin

1. **Google Account**
   - Active Google account with Google Drive access
   - Google Sheets access

2. **Node Backend Deployed**
   - Node backend must be deployed to Render first
   - Have the Render URL ready: `https://onex-crm-webhook.onrender.com`

3. **Required Credentials**
   - Zoho CRM OAuth credentials
   - AiSensy WhatsApp API key
   - Telegram Bot token (optional)
   - Admin email address

4. **Google Sheets Setup**
   - Create a new Google Sheet for CRM data
   - Name it "OneX CRM Leads"
   - Create required tabs (will be done automatically)

---

## Required Files

### Files to Deploy (7 total)

**Backend (.gs files):**
1. ✅ Code.gs
2. ✅ Config.gs
3. ✅ Modules.gs
4. ✅ AdminAPI_Enhanced.gs
5. ✅ NodeAPI.gs
6. ✅ Webhook.gs

**Frontend (.html files):**
1. ✅ AdminPanel_Enhanced_v2.html

### Files NOT to Deploy

- ❌ AdminAPI.gs (legacy)
- ❌ AdminPanel_Enhanced.html (legacy)
- ❌ AdminPanel.html (legacy)
- ❌ StitchUI.html (reference only)

---

## Step 1: Create Google Apps Script Project

### 1.1 Create New Project

1. Go to https://script.google.com
2. Click "New project"
3. Rename project to "OneX CRM"

### 1.2 Configure Project Settings

1. Click "Project Settings" (gear icon)
2. Under "General", check:
   - ✅ "Use Google Apps Script API"
   - ✅ "Show code completion suggestions"

---

## Step 2: Upload Files

### 2.1 Upload Order (Critical)

Upload files in this exact order to avoid dependency errors:

1. **Config.gs** (configuration foundation)
2. **Modules.gs** (utilities)
3. **NodeAPI.gs** (backend integration)
4. **Webhook.gs** (webhook processing)
5. **AdminAPI_Enhanced.gs** (API layer)
6. **Code.gs** (entry point)
7. **AdminPanel_Enhanced_v2.html** (UI)

### 2.2 Upload Instructions

For each file:

1. Click "+" button next to "Files"
2. Select "Script" for .gs files or "HTML" for .html files
3. Name the file exactly as shown above
4. Copy the content from the repository
5. Paste into the editor
6. Save (Ctrl+S or Cmd+S)

### 2.3 Verify Upload

After uploading all files:
- You should see 7 files in the editor
- No red error indicators
- All files saved successfully

---

## Step 3: Configure Script Properties

### 3.1 Access Script Properties

1. Click "Project Settings" (gear icon)
2. Scroll to "Script Properties"
3. Click "Add Script Property"

### 3.2 Add Required Properties

**NODE_API_URL** (Required)
- Key: `NODE_API_URL`
- Value: `https://onex-crm-webhook.onrender.com`
- Description: URL of deployed Node backend

**WEBHOOK_SECRET** (Optional)
- Key: `WEBHOOK_SECRET`
- Value: Generate a random secret (e.g., `your-secret-key-here`)
- Description: Secret for webhook verification
- Note: If not set, webhook verification is disabled

**DEDUPLICATION_ENABLED** (Required)
- Key: `DEDUPLICATION_ENABLED`
- Value: `true`
- Description: Enable duplicate lead checking

**WHATSAPP_ENABLED** (Required)
- Key: `WHATSAPP_ENABLED`
- Value: `true`
- Description: Enable WhatsApp notifications

**EMAIL_ALERTS** (Optional)
- Key: `EMAIL_ALERTS`
- Value: `true`
- Description: Enable email alerts for errors

### 3.3 Save Properties

1. Click "Save"
2. Verify all properties are listed

---

## Step 4: Create Google Sheet

### 4.1 Create New Sheet

1. Go to https://sheets.google.com
2. Click "Blank" to create new sheet
3. Name it "OneX CRM Leads"

### 4.2 Create Required Tabs

The GAS script will create these tabs automatically on first run:
- **Leads** - Main lead data
- **Duplicates** - Duplicate lead records
- **Logs** - Application logs
- **Timeline** - Lead activity timeline
- **Properties** - Property listings
- **Users** - User management
- **Audit** - Audit trail

### 4.3 Note Sheet ID

1. Copy the sheet ID from URL
2. URL format: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
3. Save the SHEET_ID for reference

---

## Step 5: Configure Sheet in GAS

### 5.1 Update Config.gs

Open Config.gs and verify sheet names match your sheet:

```javascript
var SHEETS = {
  LEADS: 'Leads',
  DUPLICATES: 'Duplicates',
  LOGS: 'Logs',
  TIMELINE: 'Timeline',
  PROPERTIES: 'Properties',
  USERS: 'Users',
  AUDIT: 'Audit'
};
```

### 5.2 Test Sheet Connection

1. Run `doGet` function
2. This will create tabs if they don't exist
3. Check your Google Sheet - tabs should be created

---

## Step 6: Deploy as Web App

### 6.1 Initiate Deployment

1. Click "Deploy" button (top right)
2. Select "New deployment"

### 6.2 Configure Deployment

**Select type:** Web app

**Description:** `Production deployment - v1.0`

**Execute as:** `Me` (your email)

**Who has access:** `Anyone`

**Important:** "Anyone" is required for:
- Webhook endpoints to receive data
- Public access to CRM UI
- Lead sources to send data

### 6.3 Deploy

1. Click "Deploy"
2. Authorize the script (first time only)
3. Grant permissions:
   - View and manage spreadsheets
   - Connect to external services
4. Wait for deployment to complete

### 6.4 Copy Web App URL

After deployment:
- Copy the Web App URL
- Format: `https://script.google.com/macros/s/[APP_ID]/exec`
- Save this URL for configuration

---

## Step 7: Configure CRM UI

### 7.1 Open CRM UI

1. Open the Web App URL in your browser
2. You should see the Admin Panel login screen
3. First-time setup wizard will appear

### 7.2 Enter Node Backend URL

1. Enter your Render URL: `https://onex-crm-webhook.onrender.com`
2. Click "Test Connection"
3. Verify connection is successful
4. Click "Save"

### 7.3 Configure Integrations

Navigate to each integration screen and configure:

**Zoho CRM:**
1. Go to Settings → Zoho
2. Enter Client ID
3. Enter Client Secret
4. Enter Refresh Token
5. Select region (India/US/EU)
6. Click "Test Connection"
7. Click "Save"

**AiSensy WhatsApp:**
1. Go to Settings → AiSensy
2. Enter API Key
3. Enter Campaign Name
4. Enter Destination Phone
5. Enter User Name
6. Click "Test Connection"
7. Click "Save"

**Telegram:**
1. Go to Settings → Telegram
2. Enter Bot Token
3. Enter Chat ID
4. Click "Test Connection"
5. Click "Save"

---

## Step 8: Configure Webhook URLs

### 8.1 Get Webhook URLs

The CRM UI will display webhook URLs for each source:

**Dynamic Webhook Pattern:**
```
https://script.google.com/macros/s/[APP_ID]/exec?token=[WEBHOOK_SECRET]
```

**Source-Specific Webhooks:**
- 99acres: `?source=99acres&token=[WEBHOOK_SECRET]`
- Housing: `?source=housing&token=[WEBHOOK_SECRET]`
- MagicBricks: `?source=magicbricks&token=[WEBHOOK_SECRET]`
- Facebook: `?source=facebook&token=[WEBHOOK_SECRET]`
- Google: `?source=google&token=[WEBHOOK_SECRET]`
- Website: `?source=website&token=[WEBHOOK_SECRET]`

### 8.2 Configure Lead Sources

For each lead source (99acres, Housing, MagicBricks, etc.):

1. Log in to the lead source platform
2. Navigate to webhook settings
3. Add the webhook URL
4. Configure to send POST requests
5. Save configuration

---

## Step 9: Test Deployment

### 9.1 Test Webhook Reception

Send a test webhook:

```bash
curl -X POST "https://script.google.com/macros/s/[APP_ID]/exec?source=99acres&token=[WEBHOOK_SECRET]" \
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
  "message": "Lead processed successfully"
}
```

### 9.2 Verify Lead in Sheet

1. Open your Google Sheet
2. Go to "Leads" tab
3. Verify test lead appears
4. Check all fields are populated

### 9.3 Verify Node Backend Sync

1. Check CRM UI → Leads screen
2. Verify lead appears there too
3. Check that Zoho sync worked (if configured)
4. Check that WhatsApp was sent (if configured)

### 9.4 Test All Screens

Navigate through CRM UI and test:
- ✅ Dashboard loads
- ✅ Leads screen loads
- ✅ Settings screen loads
- ✅ Integrations screen loads
- ✅ Can save settings
- ✅ Can view leads
- ✅ Can update lead status

---

## Troubleshooting

### Issue: "Script function not found"

**Cause:** Files uploaded in wrong order or missing

**Solution:**
1. Verify all 7 files are uploaded
2. Verify file names match exactly
3. Re-upload in correct order
4. Save all files

### Issue: "Authorization required"

**Cause:** Web app deployed with wrong access settings

**Solution:**
1. Redeploy web app
2. Set "Who has access" to "Anyone"
3. Save and redeploy

### Issue: "Cannot find script property"

**Cause:** Script properties not configured

**Solution:**
1. Go to Project Settings
2. Add required script properties
3. Save properties
4. Restart script

### Issue: "Sheet not found"

**Cause:** Sheet ID not configured or sheet doesn't exist

**Solution:**
1. Verify sheet exists in Google Drive
2. Verify sheet name matches Config.gs
3. Run doGet to create tabs
4. Check sheet permissions

### Issue: "Webhook not receiving data"

**Cause:** Webhook URL incorrect or token mismatch

**Solution:**
1. Verify webhook URL is correct
2. Verify WEBHOOK_SECRET matches
3. Check lead source webhook configuration
4. Test webhook manually

### Issue: "Node backend connection failed"

**Cause:** NODE_API_URL incorrect or Node backend not deployed

**Solution:**
1. Verify Render URL is correct
2. Test Render URL in browser
3. Check Render deployment status
4. Verify NODE_API_URL in script properties

---

## Security Best Practices

### 1. Webhook Secret

- Always use a webhook secret
- Generate a strong random secret
- Never commit secrets to GitHub
- Rotate secrets periodically

### 2. Access Control

- Set web app access to "Anyone" for webhooks
- Consider adding IP whitelisting
- Monitor webhook logs for abuse

### 3. Data Privacy

- Never log sensitive data
- Mask credentials in logs
- Use HTTPS for all communications
- Regularly audit access logs

### 4. Google Account Security

- Enable 2FA on Google account
- Use app-specific passwords if needed
- Regularly review connected apps
- Monitor for suspicious activity

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check webhook logs for errors
- Monitor lead volume
- Verify integrations are working

**Monthly:**
- Review and rotate secrets
- Check Google Sheets storage limits
- Verify backup of sheet data
- Review audit logs

**Quarterly:**
- Update dependencies
- Review and optimize code
- Test all integrations
- Update documentation

### Backup Strategy

**Google Sheets:**
- Google Sheets has automatic version history
- Export to CSV regularly
- Use Google Drive backup

**Script Code:**
- Code is stored in Google Drive
- Export to GitHub for version control
- Keep local backup of .gs files

---

## Updates and Redeployment

### When to Redeploy

- Code changes
- New features
- Bug fixes
- Configuration changes

### Redeployment Steps

1. Update code in GAS editor
2. Save all files
3. Click "Deploy" → "Manage deployments"
4. Create new deployment
5. Increment version number
6. Deploy
7. Test new version

### Version Management

- Use semantic versioning (v1.0, v1.1, v2.0)
- Keep previous deployments for rollback
- Document changes in deployment notes
- Test thoroughly before deploying

---

## Performance Optimization

### Reduce Execution Time

- Minimize API calls to external services
- Use batch operations where possible
- Cache frequently accessed data
- Optimize Google Sheets queries

### Handle Large Volumes

- Implement pagination for lead lists
- Use time-based filtering
- Archive old leads periodically
- Consider external database for scale

### Monitor Quotas

- Google Apps Script quotas:
  - Daily execution time: 90 minutes
  - Daily executions: 20,000
  - Concurrent executions: 30

- Monitor usage in GAS dashboard
- Implement rate limiting
- Queue heavy operations

---

## Integration with Node Backend

### Architecture

```
Lead Source → GAS Webhook → Node Backend → Zoho/AiSensy/Telegram
                ↓
            Google Sheet
```

### Data Flow

1. Lead source sends webhook to GAS
2. GAS validates and normalizes data
3. GAS saves to Google Sheet
4. GAS pushes to Node backend
5. Node backend processes integrations
6. Node backend returns status to GAS
7. GAS updates lead status in Sheet

### Benefits

- **Backup:** Google Sheet as backup
- **Visibility:** Direct access to data
- **Flexibility:** Easy to export/analyze
- **Reliability:** Sheet persists even if backend down

---

## Post-Deployment Checklist

- [ ] All 7 files uploaded
- [ ] Script properties configured
- [ ] Google Sheet created
- [ ] Web app deployed
- [ ] Web app URL accessible
- [ ] CRM UI loads
- [ ] Node backend connected
- [ ] Zoho configured
- [ ] AiSensy configured
- [ ] Telegram configured
- [ ] Webhook URLs configured
- [ ] Test webhook received
- [ ] Lead appears in Sheet
- [ ] Lead appears in CRM UI
- [ ] Zoho sync working
- [ ] WhatsApp sending
- [ ] Telegram sending
- [ ] All screens tested

---

## Next Steps

After successful GAS deployment:

1. **Phase 5:** Create FIRST_TIME_SETUP.md
2. **Phase 6:** End-to-end testing
3. **Phase 7:** UI validation
4. **Phase 8:** Production hardening
5. **Phase 9:** Final handover

---

## Support Resources

### Google Apps Script Documentation
- https://developers.google.com/apps-script
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/services

### OneX CRM Documentation
- `GAS_FILE_AUDIT.md`
- `FINAL_AUDIT_REPORT.md`
- `DEPLOYMENT_VALIDATION.md`
- `RENDER_DEPLOYMENT_GUIDE.md`

### Troubleshooting Help
1. Check GAS execution logs
2. Review this guide
3. Check audit reports
4. Contact support if needed

---

**Deployment Guide Completed:** June 14, 2026  
**Status:** Ready for GAS Deployment  
**Next Phase:** Phase 5 - First Time Setup Wizard
