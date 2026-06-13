#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# init-ssl.sh — First-time SSL certificate setup
# ─────────────────────────────────────────────────────────────────────
# Run this ONCE on your Oracle Cloud VM before starting the full stack.
# It obtains a Let's Encrypt certificate using certbot standalone mode.
#
# Usage:
#   chmod +x init-ssl.sh
#   sudo ./init-ssl.sh your-domain.com your@email.com
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"

echo "──────────────────────────────────────────────────"
echo " Obtaining Let's Encrypt certificate for: $DOMAIN"
echo "──────────────────────────────────────────────────"

# Stop anything using port 80
docker compose down 2>/dev/null || true

# Run certbot in standalone mode (it starts its own HTTP server on :80)
docker run --rm -it \
  -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email

echo ""
echo "✅ Certificate obtained! Now update nginx/default.conf:"
echo "   Replace 'YOUR_DOMAIN' with '$DOMAIN'"
echo ""
echo "Then start the full stack:"
echo "   docker compose up -d"
