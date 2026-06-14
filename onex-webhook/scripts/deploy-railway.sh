#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Deploy to Railway.app (RECOMMENDED FOR QUICK START)
# ─────────────────────────────────────────────────────────────────────

echo "🚀 Deploying OneX CRM Webhook to Railway.app"
echo ""
echo "Prerequisites:"
echo "  1. Create a free account at https://railway.app"
echo "  2. Install Railway CLI: npm i -g @railway/cli"
echo "  3. Run: railway login"
echo ""

# Create .env file for Railway
cat > .env.production << 'EOF'
PORT=3000
NODE_ENV=production
BASE_URL=https://$RAILWAY_DOMAIN

# Zoho credentials
ZOHO_CLIENT_ID=PASTE_YOUR_CLIENT_ID_HERE
ZOHO_CLIENT_SECRET=PASTE_YOUR_CLIENT_SECRET_HERE
ZOHO_REFRESH_TOKEN=PASTE_YOUR_REFRESH_TOKEN_HERE
ZOHO_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token
ZOHO_API_URL=https://www.zohoapis.in/crm/v2/Leads

# AISensy config
AISENSY_API_KEY=PASTE_YOUR_AISENSY_API_KEY
AISENSY_CAMPAIGN_NAME=99acres_lead_alert
AISENSY_DESTINATION_PHONE=PASTE_YOUR_SALES_TEAM_PHONE
AISENSY_USER_NAME=OneX CRM

# Telegram (optional)
TELEGRAM_BOT_TOKEN=PASTE_YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=PASTE_YOUR_CHAT_ID_HERE

# Email (optional)
EMAIL_ALERTS=true
ADMIN_EMAIL=your-email@gmail.com

# Database
DB_PATH=/data/leads.db

# Retry
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY_MS=1000

# Logging
LOG_DIR=/app/logs
EOF

echo "✅ Created .env.production"
echo ""
echo "Next steps:"
echo "  1. Edit .env.production with your actual credentials"
echo "  2. Run: railway up"
echo "  3. Your app will be deployed and assigned a URL"
echo "  4. Copy the Railway URL and save in GAS: nodeApiUrl"
echo ""
