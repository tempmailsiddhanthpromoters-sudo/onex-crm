#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# SETUP CHECKLIST - OneX CRM Production Automation
# ─────────────────────────────────────────────────────────────────────
# Step-by-step production setup (1-2 hours total)
# ─────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  OneX CRM - Production Setup Checklist                         ║"
echo "║  Follow steps 1-8 for complete automation                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Zoho Refresh Token
echo -e "${BLUE}STEP 1: Generate Zoho Refresh Token${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "You already have:"
echo "  ✓ Client ID:     1000.8N2NV1KRHLXAF5ETDAPFDKVDEKY4KG"
echo "  ✓ Client Secret: 46f324f184d8c34acb60fa50bfb94e00c725284afd"
echo ""
echo "Now generate Refresh Token:"
echo "  1. Go to: https://api-console.zoho.in/keys"
echo "  2. Select your client"
echo "  3. Click 'Generate Code'"
echo "  4. Use the code to get refresh token"
echo ""
echo "Save this Refresh Token: ___________________"
echo ""
read -p "Press Enter when ready with Refresh Token..."
echo ""

# Step 2: AISensy Setup
echo -e "${BLUE}STEP 2: Configure AISensy (WhatsApp)${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "  1. Go to: https://app.aisensy.com/settings/api"
echo "  2. Copy your API Key"
echo "  3. Create a template named: 99acres_lead_alert"
echo "  4. Get your sales team WhatsApp: +91XXXXXXXXXX"
echo ""
echo "Save these:"
echo "  - API Key: ___________________"
echo "  - WhatsApp: 91XXXXXXXXXX"
echo ""
read -p "Press Enter when ready..."
echo ""

# Step 3: Telegram Setup (Already Done)
echo -e "${BLUE}STEP 3: Telegram Bot (Already Set Up)${NC}"
echo "─────────────────────────────────────────"
echo "  ✓ Bot Token:  8792849495:AAEEoUHlvtvECkwpUJ5Fem9UfmNUXSI7ozE"
echo "  ✓ Chat ID:    5740904900"
echo ""
read -p "Press Enter..."
echo ""

# Step 4: Deployment Choice
echo -e "${BLUE}STEP 4: Choose Deployment Platform${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "  [1] Railway.app    (RECOMMENDED - 5 min) ⚡ FASTEST"
echo "  [2] Render.com     (10 min)"
echo "  [3] Oracle Cloud   (30 min - Full control)"
echo ""
read -p "Choose [1-3]: " DEPLOY_CHOICE
case $DEPLOY_CHOICE in
  1) PLATFORM="Railway.app"; echo "Selected: Railway.app"; sleep 1 ;;
  2) PLATFORM="Render.com"; echo "Selected: Render.com"; sleep 1 ;;
  3) PLATFORM="Oracle Cloud"; echo "Selected: Oracle Cloud"; sleep 1 ;;
  *) PLATFORM="Railway.app"; echo "Default: Railway.app"; sleep 1 ;;
esac
echo ""

# Step 5: Node Backend URL
echo -e "${BLUE}STEP 5: Deploy Backend${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "Follow guide: ./DEPLOYMENT_GUIDE.md"
echo "Platform: $PLATFORM"
echo ""
echo "After deployment, copy your URL:"
echo "Backend URL: ___________________"
echo ""
read -p "Press Enter when deployed..."
echo ""

# Step 6: GAS Settings
echo -e "${BLUE}STEP 6: Configure GAS CRM Settings${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "In Apps Script CRM:"
echo "  1. Open Admin Panel"
echo "  2. Go to Settings → Integrations"
echo "  3. Enter Node API URL (from Step 5)"
echo "  4. Enter Zoho credentials (from Step 1)"
echo "  5. Enter AISensy settings (from Step 2)"
echo "  6. Click 'Test Connection' → Should show ✓ Connected"
echo ""
read -p "Press Enter when configured..."
echo ""

# Step 7: Test Webhooks
echo -e "${BLUE}STEP 7: Test Webhook Sources${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "Configure these lead sources to send webhooks:"
echo ""
echo "  99acres.com:"
echo "    Webhook URL: https://your-backend-url/99acres-webhook"
echo ""
echo "  Housing.com:"
echo "    Webhook URL: https://your-backend-url/housing-webhook"
echo ""
echo "  Other platforms:"
echo "    Webhook URL: https://your-backend-url/webhook?source=PLATFORM"
echo ""
read -p "Press Enter when configured..."
echo ""

# Step 8: Final Verification
echo -e "${BLUE}STEP 8: Final Verification${NC}"
echo "─────────────────────────────────────────"
echo ""
echo "✓ Run health check:"
echo "  curl https://your-backend-url/api/admin/health"
echo ""
echo "✓ Check Settings (masked):"
echo "  curl https://your-backend-url/api/admin/settings"
echo ""
echo "✓ In GAS CRM Settings:"
echo "  - Click 'Test Connection' → Should see ✓"
echo "  - Click 'Test Zoho' → Should see connected status"
echo "  - Click 'Test AISensy' → Should see ✓"
echo ""
read -p "Press Enter when verified..."
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ SETUP COMPLETE                                             ║${NC}"
echo -e "${GREEN}║  Your automation is now LIVE and PRODUCTION-READY             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📊 DASHBOARD ACCESS"
echo "  - GAS CRM: Admin Panel"
echo "  - Analytics: Settings → Dashboard"
echo "  - API: /api/admin/analytics"
echo ""
echo "🔔 MONITORING"
echo "  - Telegram: Alerts sent to your bot"
echo "  - Email: Alerts (if enabled)"
echo "  - CRM: Last activity timestamps"
echo ""
echo "📝 NEXT STEPS"
echo "  1. Send test lead from 99acres"
echo "  2. Verify it appears in CRM within seconds"
echo "  3. Check Zoho CRM for new lead"
echo "  4. Verify WhatsApp sent to sales team"
echo ""
