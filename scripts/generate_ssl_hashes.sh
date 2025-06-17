#!/bin/bash

set -e

CERTS_DIR="certs"

if [[ ! -d "$CERTS_DIR" ]]; then
  echo "❌ Directory 'certs/' not found."
  exit 1
fi

function get_hash() {
  openssl x509 -in "$1" -noout -pubkey \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | openssl enc -base64
}

# Loop through each domain folder
for domain_dir in "$CERTS_DIR"/*; do
  [[ -d "$domain_dir" ]] || continue

  basename=$(basename "$domain_dir")                      # accounts_moneymatch_co
  domain="${basename//_/.}"                               # accounts.moneymatch.co

  crt_file="$domain_dir/$basename.crt"
  bundle_file="$domain_dir/$basename.ca-bundle"

  if [[ ! -f "$crt_file" || ! -f "$bundle_file" ]]; then
    echo "⚠️ Skipping $domain (missing .crt or .ca-bundle)"
    continue
  fi

  echo "$domain:"

  # Leaf
  leaf_hash=$(get_hash "$crt_file")
  echo "1. $leaf_hash"

  # Split intermediate bundle
  awk 'BEGIN {c=0;} /BEGIN CERTIFICATE/ {out=sprintf("intermediate_%02d.pem", c++);} {print > out}' "$bundle_file"

  i=2
  for f in intermediate_*.pem; do
    hash=$(get_hash "$f")
    echo "$i. $hash [BACKUP]"
    ((i++))
  done

  # Clean up
  rm intermediate_*.pem
  echo ""
done
