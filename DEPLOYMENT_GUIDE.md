# 🚀 Production Deployment Guide

OneX CRM Webhook Server — Production-Ready Deployment

## 🌍 Quick Deployment Options

### Option 1: Railway.app (RECOMMENDED - Fastest)
**Pros:** Simple, fast, free tier generous, automatic SSL
**Time:** 5 minutes

```bash
# 1. Create account at https://railway.app
# 2. Install CLI
npm install -g @railway/cli

# 3. Login
railway login

# 4. Create .env.production with your credentials
# 5. Deploy
railway up

# 6. Get your URL
railway domain
```

**Then in GAS CRM:**
- Settings → Integration → Node API URL
- Paste your Railway URL (e.g., `https://onex-api-prod-xxxx.railway.app`)

---

### Option 2: Render.com
**Pros:** Free tier available, easy setup
**Time:** 10 minutes

```bash
# 1. Create account at https://render.com
# 2. Connect GitHub repo
# 3. Create New → Web Service
# 4. Select your repo
# 5. Configure:
#    - Build Command: npm install
#    - Start Command: node src/index.js
#    - Environment: Add .env variables from .env.example
# 6. Deploy
```

---

### Option 3: Oracle Cloud Free Tier VM (Full Control)
**Pros:** Full VM control, Docker support, long-term free
**Time:** 20-30 minutes

#### Prerequisites
- Oracle Cloud Free Account
- Domain with DNS access (optional but recommended)
- SSH key pair

#### Steps

```bash
# 1. Create Ubuntu 22.04 VM on Oracle Cloud
# 2. SSH into VM
ssh ubuntu@your-vm-ip

# 3. Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git

# 4. Start Docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 5. Clone/download your project
git clone <your-repo> onex-crm && cd onex-crm/onex-webhook

# 6. Create .env with your credentials
cp .env.example .env
nano .env  # Edit with your values

# 7. Start with Docker
docker-compose up -d

# 8. Verify health
curl http://localhost:3000/health

# 9. Setup Nginx + SSL (optional)
# Edit nginx/default.conf with your domain
# Run: sudo bash init-ssl.sh

# 10. Restart
docker-compose restart
```

---

## 📋 Required Credentials

Before deploying, gather:

1. **Zoho CRM**
   - Client ID: `1000.8N2NV1KRHLXAF5ETDAPFDKVDEKY4KG` ✓
   - Client Secret: `46f324f184d8c34acb60fa50bfb94e00c725284afd` ✓
   - Refresh Token: [Generate from Zoho Console]
   - Region: `.in` (India) or `.com` (Global)

2. **AISensy WhatsApp API**
   - API Key: [From AISensy Dashboard]
   - Campaign Name: `99acres_lead_alert`
   - Destination Phone: `91XXXXXXXXXX` (Sales team)
   - Username: `OneX CRM`

3. **Telegram Bot (Optional)**
   - Token: `8792849495:AAEEoUHlvtvECkwpUJ5Fem9UfmNUXSI7ozE` ✓
   - Chat ID: `5740904900` ✓

4. **Gmail Alerts (Optional)**
   - Admin Email: Your Gmail

---

## 🔑 Environment Variables

```ini
# Server
PORT=3000                    # Port for webhook server
NODE_ENV=production          # Node environment
BASE_URL=https://your-api.example.com  # Public base URL

# Zoho CRM (Required)
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REFRESH_TOKEN=...       # Generate from Zoho OAuth
ZOHO_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token  # India
ZOHO_API_URL=https://www.zohoapis.in/crm/v2/Leads

# AISensy (Required for WhatsApp)
AISENSY_API_KEY=...
AISENSY_CAMPAIGN_NAME=99acres_lead_alert
AISENSY_DESTINATION_PHONE=91XXXXXXXXXX
AISENSY_USER_NAME=OneX CRM

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Email (Optional)
EMAIL_ALERTS=true
ADMIN_EMAIL=...

# Database
DB_PATH=./data/leads.db

# Retry
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

---

## 🔗 Webhook URLs

After deployment, configure these in 99acres, Housing.com, etc:

```
99acres:     https://your-api.example.com/99acres-webhook
Housing:     https://your-api.example.com/housing-webhook
Generic:     https://your-api.example.com/webhook?source=PLATFORM_NAME
```

---

## 📱 Configure in GAS CRM

1. Open your GAS CRM
2. Go to **Settings** → **Integrations**
3. **Node Backend API URL**
   - Paste your Railway/Render/Oracle URL
   - Example: `https://onex-api-prod-xxxx.railway.app`
   - Click **Test Connection**

4. **Zoho Credentials**
   - Client ID: `1000.8N2NV1KRHLXAF5ETDAPFDKVDEKY4KG`
   - Client Secret: `46f324f184d8c34acb60fa50bfb94e00c725284afd`
   - Refresh Token: [Your generated token]
   - Zoho Region: `.in` (India) or `.com`
   - Click **Save & Sync to Backend**

5. **AISensy Settings**
   - API Key: [Your AISensy key]
   - Campaign: `99acres_lead_alert`
   - Destination: `91XXXXXXXXXX`
   - Click **Save & Test**

6. **Telegram Alerts**
   - Bot Token: `8792849495:AAEEoUHlvtvECkwpUJ5Fem9UfmNUXSI7ozE`
   - Chat ID: `5740904900`
   - Click **Save**

7. **Email Alerts**
   - Enable: Yes
   - Recipient: Your email
   - Click **Save**

---

## 🧪 Testing

### Via GAS CRM
1. Settings → Integration → **Test Connection**
2. Should show "✓ Connected"

### Via Command Line
```bash
# Get health status
curl https://your-api.example.com/api/admin/health

# Get settings (masked)
curl https://your-api.example.com/api/admin/settings

# Get leads
curl https://your-api.example.com/api/admin/leads?limit=10
```

### Manual Webhook Test
```bash
curl -X POST https://your-api.example.com/99acres-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "phone": "9876543210",
    "email": "test@example.com",
    "property": "2 BHK",
    "budget": "50L",
    "location": "Mumbai"
  }'
```

---

## 📊 Dashboard Endpoints

All responses masked for security. Accessible via GAS only.

- `GET  /api/admin/health`         → System status + last activity
- `GET  /api/admin/settings`       → Current masked configuration
- `POST /api/admin/settings`       → Update any setting
- `GET  /api/admin/leads`          → List leads (paginated, filterable)
- `GET  /api/admin/leads/:id`      → Lead details
- `GET  /api/admin/analytics`      → Dashboard data (graphs, counts)
- `GET  /api/admin/sources`        → Available webhook sources
- `GET  /api/admin/webhook-urls`   → Webhook URLs for setup

---

## 🛡️ Security Best Practices

1. ✅ Use HTTPS only (Railway/Render handle this)
2. ✅ Store secrets in environment variables, never in code
3. ✅ Use strong Zoho refresh token
4. ✅ Rotate AISensy API key periodically
5. ✅ Enable email/Telegram alerts for failures
6. ✅ Monitor `/api/admin/health` regularly
7. ✅ Keep Docker image updated: `docker pull node:20-alpine`

---

## 🐛 Troubleshooting

### "Backend URL not configured"
**Fix:** Set Node API URL in GAS Settings → Integrations

### "Zoho token expired"
**Fix:** Generate new refresh token from Zoho Console and update

### "AISensy send failed"
**Fix:** Verify campaign name and destination phone in AISensy dashboard

### "No leads appearing"
**Fix:** Check webhook source matches (99acres vs housing)

### Logs
```bash
# Railroad logs
railway logs

# Or local Docker logs
docker logs onex-99acres-webhook
```

---

## 📈 Scaling Tips

- Monitor database size: `du -sh data/leads.db`
- Archive old leads monthly
- Setup database backups
- Use CDN for static assets if adding frontend
- Consider PostgreSQL for 100k+ leads

---

## ❓ Questions?

Check:
1. `/api/admin/health` for integration status
2. `/api/admin/analytics` for lead stats
3. GAS Admin Panel → Settings for diagnostics
