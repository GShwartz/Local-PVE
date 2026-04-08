#!/bin/bash
# Cloud-Init Phase 1: Grafana
# Installs Grafana OSS on Debian/Ubuntu-based images.
set -euo pipefail

apt-get update -y
apt-get install -y apt-transport-https software-properties-common wget gnupg2

wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" \
  | tee /etc/apt/sources.list.d/grafana.list

apt-get update -y
apt-get install -y grafana

systemctl daemon-reload
systemctl enable --now grafana-server

echo "Grafana deployment complete" > /var/log/local-pve-deploy.log
