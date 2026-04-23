#!/bin/bash
set -euo pipefail

CERT_DIR="${POSTGRES_TLS_CERT_DIR:-/certs/postgres}"

generate_tls_assets() {
  mkdir -p "$CERT_DIR"

  if [[ -f "$CERT_DIR/ca.crt" && -f "$CERT_DIR/server.crt" && -f "$CERT_DIR/server.key" ]]; then
    return
  fi

  openssl genrsa -out "$CERT_DIR/ca.key" 4096
  openssl req -x509 -new -nodes -key "$CERT_DIR/ca.key" -sha256 -days 3650 \
    -out "$CERT_DIR/ca.crt" -subj "/CN=medical-chart-dev-ca"

  cat > "$CERT_DIR/server.cnf" <<'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = req_ext
prompt = no

[req_distinguished_name]
CN = db

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = db
DNS.2 = localhost
EOF

  openssl genrsa -out "$CERT_DIR/server.key" 4096
  openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -config "$CERT_DIR/server.cnf"
  openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
    -CAcreateserial -out "$CERT_DIR/server.crt" -days 3650 -sha256 \
    -extensions req_ext -extfile "$CERT_DIR/server.cnf"

  chmod 600 "$CERT_DIR/server.key"
}

if [[ "$(printf '%s' "${POSTGRES_ENABLE_TLS:-true}" | tr '[:upper:]' '[:lower:]')" == "true" ]]; then
  generate_tls_assets
  chown -R postgres:postgres "$CERT_DIR"
fi

exec docker-entrypoint.sh "$@"
