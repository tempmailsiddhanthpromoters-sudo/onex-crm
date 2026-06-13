# OneX 99acres Webhook Server

Receives leads from 99acres portal and pushes them to **Zoho CRM** + sends **WhatsApp alerts** via AISensy — with a local SQLite backup of every lead.

## Architecture

```
99acres Portal
      │
      ▼  POST /99acres-webhook
┌─────────────┐
│   Nginx     │  ← SSL termination (Let's Encrypt)
│  (port 443) │
└──────┬──────┘
       │
       ▼  proxy_pass
┌─────────────┐      ┌──────────────┐
│  Express.js │─────►│  Zoho CRM    │  (OAuth2 + retry)
│  (port 3000)│      └──────────────┘
│             │      ┌──────────────┐
│             │─────►│  AISensy API │  (WhatsApp alert)
│             │      └──────────────┘
│             │      ┌──────────────┐
│             │─────►│  SQLite DB   │  (local backup)
└─────────────┘      └──────────────┘
```

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# → Fill in your Zoho + AISensy credentials

# 3. Start in watch mode
npm run dev

# 4. Test with a sample payload
npm test
```

---

## Deploy to Oracle Cloud Free Tier

### Prerequisites

| Item | Details |
|------|---------|
| **VM** | Oracle Cloud Always Free — ARM (Ampere A1) or AMD |
| **OS** | Ubuntu 22.04 or Oracle Linux 8+ |
| **Domain** | Point an A record to the VM's public IP |
| **Ports** | Open 80 + 443 in OCI Security List |

### Step-by-step

```bash
# ── 1. SSH into your VM ────────────────────────────────────────────
ssh ubuntu@<YOUR_VM_IP>

# ── 2. Install Docker + Docker Compose ─────────────────────────────
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out & back in for group changes

# ── 3. Clone the repo ─────────────────────────────────────────────
git clone https://github.com/your-org/onex-99acres-webhook.git
cd onex-99acres-webhook

# ── 4. Configure environment ──────────────────────────────────────
cp .env.example .env
nano .env
# Fill in: ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET
#          AISENSY_API_KEY, AISENSY_DESTINATION_PHONE

# ── 5. Update nginx config with your domain ───────────────────────
sed -i 's/YOUR_DOMAIN/webhook.yourdomain.com/g' nginx/default.conf

# ── 6. Get SSL certificate ────────────────────────────────────────
chmod +x init-ssl.sh
sudo ./init-ssl.sh webhook.yourdomain.com you@email.com

# ── 7. Start everything ───────────────────────────────────────────
docker compose up -d

# ── 8. Verify ──────────────────────────────────────────────────────
curl https://webhook.yourdomain.com/health
# → {"status":"ok","uptime":...,"timestamp":"..."}
```

### OCI Security List Rules

Open these ports in your VCN → Subnet → Security List:

| Direction | Protocol | Port | Source |
|-----------|----------|------|--------|
| Ingress   | TCP      | 80   | 0.0.0.0/0 |
| Ingress   | TCP      | 443  | 0.0.0.0/0 |

Also add iptables rules on the VM itself:

```bash
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## Zoho CRM Setup

1. Go to [Zoho API Console](https://api-console.zoho.in/)
2. Create a **Self Client** application
3. Generate a refresh token with scope: `ZohoCRM.modules.ALL`
4. Copy `Client ID`, `Client Secret`, and `Refresh Token` into `.env`

> **Indian DC users**: The defaults use `zoho.in` endpoints. If your Zoho org is on US/EU DC, set `ZOHO_TOKEN_URL` and `ZOHO_API_URL` in `.env`.

## AISensy Setup

1. Create a campaign template named `99acres_lead_alert` on your AISensy dashboard
2. The template should accept 5 parameters: `{{1}}` Name, `{{2}}` Phone, `{{3}}` Property, `{{4}}` Budget, `{{5}}` Location
3. Copy your API key to `AISENSY_API_KEY` in `.env`
4. Set `AISENSY_DESTINATION_PHONE` to your sales team's WhatsApp number (with country code)

---

## Project Structure

```
onex-99acres-webhook/
├── src/
│   ├── index.js            # Express server + webhook route
│   ├── config.js            # Centralised configuration
│   ├── services/
│   │   ├── zoho.js          # Zoho CRM OAuth2 + lead creation
│   │   ├── aisensy.js       # AISensy WhatsApp notification
│   │   └── database.js      # SQLite lead storage
│   └── middleware/
│       └── errorHandler.js  # Global error handler + file logger
├── test/
│   └── test-webhook.js      # Local integration test
├── nginx/
│   └── default.conf         # Nginx reverse proxy config
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Full stack (app + nginx + certbot)
├── init-ssl.sh              # First-time SSL certificate setup
├── .env.example             # Environment variable template
└── package.json
```

## Logs & Monitoring

- **Application logs**: `docker compose logs -f app`
- **Error log file**: `docker compose exec app cat /app/logs/errors.log`
- **SQLite backup**: `docker compose exec app sqlite3 /app/data/leads.db "SELECT * FROM leads ORDER BY id DESC LIMIT 10;"`
- **Health check**: `curl https://your-domain.com/health`

## License

Private — OneX CRM
