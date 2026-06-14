# First-Time Setup Wizard

**Date:** June 14, 2026  
**Project:** OneX CRM  
**Purpose:** Step-by-step configuration wizard for first-time CRM setup

---

## Welcome to OneX CRM Setup

Congratulations on deploying OneX CRM! This wizard will guide you through the initial configuration to get your CRM operational.

**Estimated Time:** 15-20 minutes  
**Prerequisites:**
- ✅ Node backend deployed to Render
- ✅ Google Apps Script deployed
- ✅ CRM UI accessible

---

## Step 1: Access CRM UI

### 1.1 Open CRM URL

Open your Google Apps Script Web App URL in your browser:

```
https://script.google.com/macros/s/[APP_ID]/exec
```

### 1.2 Initial Load

On first load, you will see:
- **Welcome Screen** - Introduction to OneX CRM
- **Setup Wizard** - Guided configuration process

Click "Start Setup" to begin.

---

## Step 2: Connect to Node Backend

### 2.1 Enter Node Backend URL

**What you need:**
- Your Render deployment URL
- Example: `https://onex-crm-webhook.onrender.com`

**Steps:**
1. Enter the Node backend URL in the input field
2. Click "Test Connection"
3. Wait for connection verification

**Expected Result:**
```
✅ Connection Successful
- Server responding
- Database connected
- API endpoints accessible
```

**If Connection Fails:**
- Verify the URL is correct
- Check Render deployment status
- Ensure Render service is "Live"
- Try accessing the URL directly in browser

### 2.2 Save Configuration

Once connection is successful:
1. Click "Save & Continue"
2. The URL will be saved to GAS script properties
3. Proceed to next step

---

## Step 3: Configure Zoho CRM

### 3.1 Get Zoho Credentials

**Required Credentials:**

**Client ID:**
1. Go to https://api-console.zoho.in/
2. Create a Server-based Client
3. Copy the Client ID

**Client Secret:**
1. From the same Client page
2. Copy the Client Secret

**Refresh Token:**
1. Use the OAuth flow to get authorization code
2. Exchange code for refresh token
3. Copy the refresh token

**Region URLs:**
- **India:** accounts.zoho.in / www.zohoapis.in
- **US:** accounts.zoho.com / www.zohoapis.com
- **EU:** accounts.zoho.eu / www.zohoapis.eu

### 3.2 Enter Zoho Configuration

**Steps:**
1. Navigate to Settings → Zoho
2. Enter Client ID
3. Enter Client Secret
4. Enter Refresh Token
5. Select your region (India/US/EU)
6. Token URL and API URL will auto-fill based on region

### 3.3 Test Zoho Connection

Click "Test Connection" to verify:

**Expected Result:**
```
✅ Zoho Connection Successful
- OAuth token valid
- API accessible
- Lead module accessible
```

**If Connection Fails:**
- Verify credentials are correct
- Check region selection
- Ensure refresh token is valid
- Check Zoho account status

### 3.4 Save Zoho Configuration

Click "Save & Continue" to proceed.

---

## Step 4: Configure AiSensy WhatsApp

### 4.1 Get AiSensy Credentials

**Required Credentials:**

**API Key:**
1. Go to https://app.aisensy.com/
2. Log in to your account
3. Navigate to API Settings
4. Copy the API Key

**Campaign Name:**
1. In AiSensy dashboard
2. Navigate to Campaigns
3. Find or create your welcome campaign
4. Copy the campaign name

**Destination Phone:**
1. Your sales team WhatsApp number
2. Format: 91XXXXXXXXXX (with country code)
3. This is where notifications will be sent

**User Name:**
1. Your company name
2. This appears as the sender name

### 4.2 Enter AiSensy Configuration

**Steps:**
1. Navigate to Settings → AiSensy
2. Enter API Key
3. Enter Campaign Name
4. Enter Destination Phone
5. Enter User Name

### 4.3 Test AiSensy Connection

Click "Test Connection" to verify:

**Expected Result:**
```
✅ AiSensy Connection Successful
- API key valid
- Campaign exists
- Destination phone valid
```

### 4.4 Send Test Message

Click "Send Test Message" to verify WhatsApp delivery:

1. Enter a test phone number
2. Click "Send Test"
3. Check WhatsApp for test message

**Expected Result:**
```
✅ Test Message Sent
- Message delivered to WhatsApp
- Campaign working correctly
```

### 4.5 Save AiSensy Configuration

Click "Save & Continue" to proceed.

---

## Step 5: Configure Telegram (Optional)

### 5.1 Get Telegram Credentials

**Required Credentials:**

**Bot Token:**
1. Open Telegram app
2. Search for @BotFather
3. Send /newbot command
4. Follow instructions to create bot
5. Copy the bot token

**Chat ID:**
1. Search for @userinfobot on Telegram
2. Send any message to the bot
3. Copy the chat ID from response
4. This is where notifications will be sent

### 5.2 Enter Telegram Configuration

**Steps:**
1. Navigate to Settings → Telegram
2. Enter Bot Token
3. Enter Chat ID

### 5.3 Test Telegram Connection

Click "Test Connection" to verify:

**Expected Result:**
```
✅ Telegram Connection Successful
- Bot token valid
- Chat ID valid
- Bot accessible
```

### 5.4 Send Test Message

Click "Send Test Message" to verify Telegram delivery:

**Expected Result:**
```
✅ Test Message Sent
- Message delivered to Telegram
- Bot working correctly
```

### 5.5 Save Telegram Configuration

Click "Save & Continue" to proceed.

**Note:** If you don't want to use Telegram, click "Skip" to continue.

---

## Step 6: Configure Webhook URLs

### 6.1 Get Webhook URLs

The CRM will display webhook URLs for each lead source:

**Dynamic Webhook Pattern:**
```
https://script.google.com/macros/s/[APP_ID]/exec?token=[WEBHOOK_SECRET]
```

**Source-Specific Webhooks:**
- **99acres:** `?source=99acres&token=[WEBHOOK_SECRET]`
- **Housing:** `?source=housing&token=[WEBHOOK_SECRET]`
- **MagicBricks:** `?source=magicbricks&token=[WEBHOOK_SECRET]`
- **Facebook:** `?source=facebook&token=[WEBHOOK_SECRET]`
- **Google:** `?source=google&token=[WEBHOOK_SECRET]`
- **Website:** `?source=website&token=[WEBHOOK_SECRET]`

### 6.2 Configure Lead Sources

For each lead source you use:

**99acres:**
1. Log in to 99acres portal
2. Navigate to Webhook Settings
3. Add the webhook URL
4. Configure to send POST requests
5. Save configuration

**Housing.com:**
1. Log in to Housing.com portal
2. Navigate to Integration Settings
3. Add the webhook URL
4. Configure to send POST requests
5. Save configuration

**MagicBricks:**
1. Log in to MagicBricks portal
2. Navigate to Webhook Settings
3. Add the webhook URL
4. Configure to send POST requests
5. Save configuration

**Facebook Ads:**
1. Go to Facebook Ads Manager
2. Navigate to Lead Forms
3. Select your lead form
4. Add webhook URL in Integrations
5. Save configuration

**Google Ads:**
1. Go to Google Ads
2. Navigate to Lead Forms
3. Select your lead form
4. Add webhook URL in Integrations
5. Save configuration

**Website Form:**
1. Edit your website form
2. Add webhook URL as form action
3. Configure to send POST requests
4. Save configuration

### 6.3 Generate Webhook Secret

If you haven't set a webhook secret:

1. Go to Settings → Security
2. Click "Generate Secret"
3. Copy the generated secret
4. Add this secret to your webhook URLs: `&token=[SECRET]`

### 6.4 Save Webhook Configuration

Click "Save & Continue" to proceed.

---

## Step 7: Configure Integrations

### 7.1 Enable Required Integrations

Navigate to Integrations screen:

**Default Integrations:**
- ✅ 99acres
- ✅ Housing
- ✅ MagicBricks
- ✅ Facebook
- ✅ Google
- ✅ Website

**Steps:**
1. Toggle integrations ON/OFF based on your needs
2. Set priority order (lower number = higher priority)
3. Configure field mappings for each integration
4. Click "Save"

### 7.2 Configure Field Mappings

For each integration, configure field mappings:

**Common Mappings:**
- `name` → `name`
- `phone` → `phone`
- `mobile` → `phone`
- `email` → `email`
- `email_id` → `email`
- `property` → `property_title`
- `budget` → `budget`
- `location` → `location`

**Steps:**
1. Navigate to Field Mappings
2. Select integration
3. Add field mappings
4. Choose transformations (title, lower, upper, trim, clean)
5. Click "Save"

### 7.3 Save Integration Configuration

Click "Save & Continue" to proceed.

---

## Step 8: Configure Routing Rules

### 8.1 Create Routing Rules (Optional)

Routing rules determine how leads are distributed:

**Example Rules:**
- Leads from 99acres → Assign to Agent A
- Leads with budget > 1Cr → Assign to Agent B
- Leads from Mumbai → Assign to Agent C

**Steps:**
1. Navigate to Routing Rules
2. Click "Add Rule"
3. Set rule name
4. Define conditions (source, budget, location)
5. Define actions (assign to, set status)
6. Set priority
7. Click "Save"

### 8.2 Enable Rules

Toggle rules ON/OFF as needed.

### 8.3 Save Routing Configuration

Click "Save & Continue" to proceed.

**Note:** If you don't need routing rules, click "Skip" to continue.

---

## Step 9: Test Setup

### 9.1 Send Test Webhook

**Manual Test:**

Use curl to send a test webhook:

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

### 9.2 Verify Lead in CRM UI

1. Navigate to Leads screen
2. Search for "Test User"
3. Verify lead appears
4. Check all fields are populated

### 9.3 Verify Lead in Google Sheet

1. Open your Google Sheet
2. Go to "Leads" tab
3. Verify test lead appears
4. Check all columns are populated

### 9.4 Verify Zoho Sync

1. Log in to Zoho CRM
2. Navigate to Leads module
3. Search for "Test User"
4. Verify lead appears in Zoho

### 9.5 Verify WhatsApp Notification

1. Check your WhatsApp
2. Verify test message received
3. Check message content is correct

### 9.6 Verify Telegram Notification (if configured)

1. Check your Telegram
2. Verify test message received
3. Check message content is correct

---

## Step 10: Complete Setup

### 10.1 Setup Summary

Review your configuration:

**Node Backend:**
- ✅ Connected
- ✅ URL: [your-render-url]

**Zoho CRM:**
- ✅ Configured
- ✅ Region: [your-region]

**AiSensy WhatsApp:**
- ✅ Configured
- ✅ Campaign: [your-campaign]

**Telegram:**
- ✅ Configured (or Skipped)

**Webhooks:**
- ✅ Configured for [number] sources

**Integrations:**
- ✅ [number] integrations enabled

### 10.2 Final Verification

Click "Complete Setup" to:

1. Save all configurations
2. Enable all integrations
3. Start receiving leads
4. Redirect to Dashboard

### 10.3 Dashboard Access

You will now be on the Dashboard screen showing:
- Total leads
- Leads by source
- Leads by status
- Recent activity
- Integration status

---

## Post-Setup Checklist

### Immediate Actions

- [ ] Test webhook from each configured source
- [ ] Verify leads appear in CRM UI
- [ ] Verify leads appear in Google Sheet
- [ ] Verify Zoho sync working
- [ ] Verify WhatsApp notifications
- [ ] Verify Telegram notifications (if configured)
- [ ] Check all screens are accessible
- [ ] Verify settings are saved

### First Week

- [ ] Monitor incoming leads
- [ ] Check for any errors in logs
- [ ] Verify all integrations working
- [ ] Adjust field mappings if needed
- [ ] Fine-tune routing rules
- [ ] Train team on CRM usage

### First Month

- [ ] Review lead volume
- [ ] Optimize integration settings
- [ ] Review and update routing rules
- [ ] Check for any performance issues
- [ ] Back up Google Sheet data
- [ ] Review audit logs

---

## Troubleshooting

### Issue: Cannot connect to Node backend

**Solution:**
1. Verify Render URL is correct
2. Check Render deployment status
3. Ensure Render service is "Live"
4. Try accessing URL directly in browser
5. Check Render logs for errors

### Issue: Zoho connection fails

**Solution:**
1. Verify credentials are correct
2. Check region selection
3. Ensure refresh token is valid
4. Test Zoho API directly
5. Check Zoho account status

### Issue: WhatsApp not sending

**Solution:**
1. Verify AiSensy API key
2. Check campaign name matches
3. Verify destination phone format
4. Test with AiSensy dashboard
5. Check AiSensy account credits

### Issue: Telegram not sending

**Solution:**
1. Verify bot token is correct
2. Check chat ID is correct
3. Start conversation with bot
4. Test with @userinfobot
5. Check bot permissions

### Issue: Webhook not receiving data

**Solution:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Verify lead source configuration
4. Test webhook manually
5. Check GAS execution logs

### Issue: Leads not appearing in CRM UI

**Solution:**
1. Check GAS execution logs
2. Verify Node backend connection
3. Check database status
4. Refresh CRM UI
5. Clear browser cache

---

## Configuration Reference

### Node Backend URL

**Format:** `https://onex-crm-webhook.onrender.com`

**Used for:**
- API calls from GAS CRM
- Health checks
- Settings sync
- Lead sync

### Zoho Credentials

**Client ID:** From Zoho API Console  
**Client Secret:** From Zoho API Console  
**Refresh Token:** From OAuth flow  
**Region:** India/US/EU

### AiSensy Credentials

**API Key:** From AiSensy dashboard  
**Campaign Name:** From AiSensy campaigns  
**Destination Phone:** Sales team WhatsApp number  
**User Name:** Company name

### Telegram Credentials

**Bot Token:** From @BotFather  
**Chat ID:** From @userinfobot

### Webhook URLs

**Pattern:** `https://script.google.com/macros/s/[APP_ID]/exec?source=[SOURCE]&token=[SECRET]`

**Sources:** 99acres, housing, magicbricks, facebook, google, website

---

## Security Best Practices

### 1. Protect Your Credentials

- Never share credentials
- Store securely
- Rotate regularly
- Use strong secrets

### 2. Webhook Security

- Always use webhook secret
- Keep secret confidential
- Rotate secret periodically
- Monitor webhook logs

### 3. Access Control

- Limit CRM UI access
- Use strong passwords
- Enable 2FA where available
- Monitor access logs

### 4. Data Privacy

- Comply with data regulations
- Secure lead data
- Regular backups
- Audit access

---

## Support Resources

### Documentation

- `FINAL_AUDIT_REPORT.md`
- `DEPLOYMENT_VALIDATION.md`
- `RENDER_DEPLOYMENT_GUIDE.md`
- `GAS_DEPLOYMENT_GUIDE.md`
- `API_DOCUMENTATION_V2.md`

### Getting Help

1. Check this guide
2. Review documentation
3. Check execution logs
4. Contact support if needed

---

## What's Next?

After completing setup:

1. **Start Receiving Leads** - Your CRM is now operational
2. **Monitor Performance** - Check dashboard regularly
3. **Optimize Settings** - Fine-tune based on usage
4. **Train Team** - Get your team familiar with CRM
5. **Scale as Needed** - Add more integrations as you grow

---

**Setup Wizard Completed:** June 14, 2026  
**Status:** Ready for Production Use  
**Next Phase:** Phase 6 - End-to-End Testing
