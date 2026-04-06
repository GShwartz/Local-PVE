#!/usr/bin/env bash

###############################################################################
# PostgreSQL Installation and Configuration Script (Debian)
# Refined: Bind PostgreSQL ONLY to WAN interface IP
# Best practices: strict mode, logging, error handling, idempotency
###############################################################################

set -Eeuo pipefail

############################
# Global Variables
############################
LOG_FILE="/var/log/postgresql_install.log"
PG_VERSION="15"
PG_CONF_DIR="/etc/postgresql/${PG_VERSION}/main"

DB_NAME="local_pve"
DB_USER="gil"
DB_PASS='Pass12344321!!'

# Optional: manually override WAN interface (e.g., eth0)
WAN_IFACE="${WAN_IFACE:-}"

############################
# Logging Functions
############################
log() {
    local level="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message" | tee -a "$LOG_FILE"
}

info() {
    log "INFO" "$1"
}

warn() {
    log "WARN" "$1"
}

error() {
    log "ERROR" "$1"
}

############################
# Error Handling
############################
trap 'error "Script failed at line $LINENO. Exit code: $?"; exit 1' ERR

############################
# Root Check
############################
if [[ "$EUID" -ne 0 ]]; then
    echo "This script must be run as root."
    exit 1
fi

############################
# Helper Functions
############################
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_wan_interface() {
    if [[ -n "$WAN_IFACE" ]]; then
        echo "$WAN_IFACE"
        return
    fi

    ip route | awk '/default/ {print $5; exit}'
}

get_ip_from_interface() {
    local iface="$1"
    ip -4 addr show "$iface" | awk '/inet / {print $2}' | cut -d/ -f1 | head -n1
}

############################
# Install PostgreSQL
############################
install_postgresql() {
    info "Updating package list..."
    apt-get update -y

    info "Installing PostgreSQL..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        postgresql-"${PG_VERSION}" \
        postgresql-client-"${PG_VERSION}" \
        postgresql-contrib

    info "PostgreSQL installation completed."
}

############################
# Configure PostgreSQL
############################
configure_postgresql() {
    info "Detecting WAN interface..."

    local iface
    iface="$(get_wan_interface)"

    if [[ -z "$iface" ]]; then
        error "Unable to detect WAN interface."
        exit 1
    fi

    info "WAN interface detected: $iface"

    local wan_ip
    wan_ip="$(get_ip_from_interface "$iface")"

    if [[ -z "$wan_ip" ]]; then
        error "Unable to determine IP for interface $iface"
        exit 1
    fi

    info "WAN IP detected: $wan_ip"

    info "Configuring PostgreSQL to bind ONLY to WAN IP..."

    sed -i "s/^#listen_addresses =.*/listen_addresses = '${wan_ip}'/" \
        "${PG_CONF_DIR}/postgresql.conf"

    # Clean previous generic rules (optional safety)
    sed -i '/0.0.0.0\/0/d' "${PG_CONF_DIR}/pg_hba.conf"

    # Allow only WAN subnet (calculated /24 by default)
    local subnet
    subnet="$(echo "$wan_ip" | awk -F. '{print $1"."$2"."$3".0/24"}')"

    if ! grep -q "$subnet" "${PG_CONF_DIR}/pg_hba.conf"; then
        echo "host    all             all             ${subnet}               md5" >> \
            "${PG_CONF_DIR}/pg_hba.conf"
    fi

    systemctl restart postgresql
    systemctl enable postgresql

    info "PostgreSQL configured to WAN interface only."
}

############################
# Create Database and User
############################
setup_database() {
    info "Setting up database and user..."

    # Ensure PostgreSQL is ready
    if ! pg_isready -q; then
        error "PostgreSQL is not ready"
        exit 1
    fi

    # Create role
    runuser -u postgres -- bash -c "cd /tmp && psql <<'EOF'
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}'
   ) THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
   END IF;
END
\$do\$;
EOF"

    # Create database
    if ! runuser -u postgres -- bash -c "cd /tmp && psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1; then
        runuser -u postgres -- bash -c "cd /tmp && createdb -O '${DB_USER}' '${DB_NAME}'"
        info "Database ${DB_NAME} created."
    else
        info "Database ${DB_NAME} already exists."
    fi

    info "Database and user setup completed."
}

############################
# Firewall (Optional)
############################
install_and_configure_firewall() {
    info "Installing and configuring UFW..."

    if ! command_exists ufw; then
        apt-get install -y ufw
    fi

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (critical — prevent lockout)
    ufw allow ssh || warn "SSH rule may already exist"

    # Allow PostgreSQL only on WAN interface
    local iface
    iface="$(get_wan_interface)"

    ufw allow in on "$iface" to any port 5432 proto tcp \
        || warn "PostgreSQL rule may already exist"

    # Enable UFW (non-interactive)
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi

    info "UFW configured and enabled."
}

############################
# Main Execution
############################
main() {
    info "Starting PostgreSQL installation (WAN-bound)..."

    install_postgresql
    configure_postgresql
    setup_database
    install_and_configure_firewall

    info "Completed successfully."
}

main "$@"
