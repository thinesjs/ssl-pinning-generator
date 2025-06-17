#!/bin/bash

JSON_FILE="ssl-pinning-config.json" # Your input JSON file
TMP_CERT_PREFIX="cert_"

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "❌ 'jq' is required but not installed. Install it first."
  exit 1
fi

DOMAINS=$(jq -r 'keys[]' "$JSON_FILE")

for DOMAIN in $DOMAINS; do
  echo "🔍 Checking: $DOMAIN"

  STORED_HASHES=($(jq -r --arg domain "$DOMAIN" '.[$domain].publicKeyHashes[]' "$JSON_FILE"))

  # Get cert chain
  openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null \
    | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' \
    | awk 'BEGIN {n=0} /BEGIN CERTIFICATE/ {n++} {print > ("'"$TMP_CERT_PREFIX"'" n ".pem")}'

  # Get live hashes
  LIVE_HASHES=()
  for CERT_FILE in ${TMP_CERT_PREFIX}*.pem; do
    HASH=$(openssl x509 -in "$CERT_FILE" -noout -pubkey \
      | openssl pkey -pubin -outform DER 2>/dev/null \
      | openssl dgst -sha256 -binary \
      | openssl enc -base64)
    LIVE_HASHES+=("$HASH")
  done

  # Compare stored vs live
  for STORED in "${STORED_HASHES[@]}"; do
    MATCHED=false
    for LIVE in "${LIVE_HASHES[@]}"; do
      if [[ "$STORED" == "$LIVE" ]]; then
        MATCHED=true
        break
      fi
    done
    if $MATCHED; then
      echo "  ✅ $STORED"
    else
      echo "  ❌ $STORED"
    fi
  done

  # Show new hashes not in stored list
  echo "  ➕ New (not stored):"
  for LIVE in "${LIVE_HASHES[@]}"; do
    FOUND=false
    for STORED in "${STORED_HASHES[@]}"; do
      if [[ "$LIVE" == "$STORED" ]]; then
        FOUND=true
        break
      fi
    done
    if ! $FOUND; then
      echo "    $LIVE"
    fi
  done

  rm -f ${TMP_CERT_PREFIX}*.pem
  echo ""
done
