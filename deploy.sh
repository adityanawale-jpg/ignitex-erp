#!/bin/bash
cd /var/www/ignitex_erp
cp api/.env .env
git pull
docker compose up -d --build
echo "=== Deploy complete ==="
docker compose ps
