#!/bin/bash
# Cloud-Init Phase 1: Prometheus + Node Exporter
set -euo pipefail

apt-get update -y
apt-get install -y prometheus prometheus-node-exporter

systemctl enable --now prometheus prometheus-node-exporter

echo "Prometheus deployment complete" > /var/log/local-pve-deploy.log
