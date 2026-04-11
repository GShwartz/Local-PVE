#!/bin/bash
# Cloud-Init Phase 1: Step-CA ACME Server
set -euo pipefail

apt-get update -y
apt-get install -y curl wget gnupg2

STEP_CA_VERSION="0.26.1"
curl -LO "https://dl.step.sm/gh-release/certificates/gh-release-header/v${STEP_CA_VERSION}/step-ca_linux_${STEP_CA_VERSION}_amd64.deb"
dpkg -i "step-ca_linux_${STEP_CA_VERSION}_amd64.deb"
rm -f "step-ca_linux_${STEP_CA_VERSION}_amd64.deb"

systemctl enable step-ca
echo "ACME Server (Step-CA) deployment complete" > /var/log/local-pve-deploy.log
