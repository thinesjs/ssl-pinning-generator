#!/bin/bash

# List of domains
DOMAINS=(
  "accounts.moneymatch.co"
  "auth.moneymatch.co"
  "auth.moneymatch.co.nz"
  "auth.moneymatch.com.au"
  "auth.moneymatch.com.bn"
  "auth.moneymatch.sg"
  "compliance.moneymatch.co"
  "moneymatch.co.nz"
  "moneymatch.com.au"
  "moneymatch.com.bn"
  "moneymatch.sg"
  "transfer.moneymatch.co"
)

for DOMAIN in "${DOMAINS[@]}"; do
  echo "$DOMAIN:"

  # Fetch and split certs
  openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null \
    | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' \
    | awk 'BEGIN {n=0} /BEGIN CERTIFICATE/ {n++} {print > ("cert_" n ".pem")}'

  i=1
  for CERT_FILE in cert_*.pem; do
    HASH=$(openssl x509 -in "$CERT_FILE" -noout -pubkey \
      | openssl pkey -pubin -outform DER 2>/dev/null \
      | openssl dgst -sha256 -binary \
      | openssl enc -base64)

    if [ "$i" -eq 1 ]; then
      echo "  $i. $HASH"
    else
      echo "  $i. $HASH -> [BACKUP]"
    fi
    ((i++))
  done

  rm -f cert_*.pem
  echo ""
done
