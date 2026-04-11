#!/bin/bash
# Cloud-Init Phase 1: Nginx
set -euo pipefail

apt-get update -y
apt-get install -y nginx

systemctl enable --now nginx

echo "Nginx deployment complete" > /var/log/local-pve-deploy.log
