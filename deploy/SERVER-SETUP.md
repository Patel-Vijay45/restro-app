# Putting the app on a server (about ₹500/month)

One small Linux server runs everything: the app, the database, HTTPS and daily backups.
Polling for new orders every few seconds costs nothing extra on your own server
(on "pay per request" hosting it would add up quickly).

## 1. Get a server
Any provider with a data centre in India and a **1 GB RAM Ubuntu** server, for example
DigitalOcean (Bangalore) or AWS Lightsail (Mumbai). Pick the plan around ₹400–600/month.

## 2. Get a web address
- Recommended: buy a domain (a `.in` is usually ₹500–900/year), then add an **A record** pointing to the server's IP.
- Free option for testing: `<server-ip-with-dashes>.sslip.io` (example: `203-0-113-5.sslip.io`) works without buying anything.

Decide this before printing table QR codes, because the QR codes contain the address.

## 3. Install (copy-paste on the server)

```bash
# a bit of swap so the build fits in 1 GB RAM
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker
curl -fsSL https://get.docker.com | sudo sh

# the app
git clone https://github.com/Patel-Vijay45/restro-app.git && cd restro-app
cp deploy/.env.server.example .env
nano .env        # fill DOMAIN, POSTGRES_PASSWORD, SESSION_SECRET
sudo docker compose up -d --build
```

First time only, add the sample data (outlets, 12 tables, sample menu, test logins):

```bash
sudo docker compose exec app tsx prisma/seed.ts
```

Open `https://<your DOMAIN>` and log in as Owner (PIN 1234). Change all PINs in Manage → Staff.

## Update to the latest version

```bash
cd restro-app && git pull && sudo docker compose up -d --build
```

## Backups
A copy of the database is saved every day in `restro-app/backups/` (last 14 days).
Once a week, download one to your computer as well, in case the server itself is lost:

```bash
scp root@<server-ip>:restro-app/backups/dfc-*.sql.gz .
```

Restore a backup (replaces current data):

```bash
gunzip -c backups/dfc-2026-11-01.sql.gz | sudo docker compose exec -T db psql -U restro restro
```
