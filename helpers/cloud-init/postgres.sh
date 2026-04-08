#!/bin/bash
# Cloud-Init Phase 1: PostgreSQL 16
set -euo pipefail

apt-get update -y
apt-get install -y postgresql-16

systemctl enable --now postgresql

# Set default password — change immediately after deployment
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'changeme';"

echo "PostgreSQL deployment complete" > /var/log/local-pve-deploy.log
