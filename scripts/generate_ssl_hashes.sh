#!/bin/bash

set -e

CERTS_DIR="certs"
INCLUDE_BACKUPS=false  # Set to false to exclude intermediate hashes
OUTPUT_FILE="ssl-pinning-config.json"

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

# Use a temp file to build the JSON content
tmp_file=$(mktemp)

echo "{" >> "$tmp_file"

first_domain=true

# Loop through each domain folder
for domain_dir in "$CERTS_DIR"/*; do
  [[ -d "$domain_dir" ]] || continue

  basename=$(basename "$domain_dir")
  domain="${basename//_/.}" # Convert underscores to dots

  crt_file="$domain_dir/$basename.crt"
  bundle_file="$domain_dir/$basename.ca-bundle"

  if [[ ! -f "$crt_file" || ! -f "$bundle_file" ]]; then
    echo "  ⚠️ Skipping $domain (missing .crt or .ca-bundle)" >&2
    continue
  fi

  if [[ "$first_domain" == false ]]; then
    echo "," >> "$tmp_file"
  fi
  first_domain=false

  echo "  \"$domain\": {" >> "$tmp_file"
  echo "    \"includeSubdomains\": true," >> "$tmp_file"
  echo -n "    \"publicKeyHashes\": [" >> "$tmp_file"

  hashes=()
  hashes+=("$(get_hash "$crt_file")")

  if [[ "$INCLUDE_BACKUPS" == true ]]; then
    awk 'BEGIN {c=0;} /BEGIN CERTIFICATE/ {out=sprintf("intermediate_%02d.pem", c++);} {print > out}' "$bundle_file"
    for f in intermediate_*.pem; do
      hashes+=("$(get_hash "$f")")
    done
    rm intermediate_*.pem
  fi

  for i in "${!hashes[@]}"; do
    if [[ $i -gt 0 ]]; then
      echo -n "," >> "$tmp_file"
    fi
    echo -n $'\n      "'${hashes[$i]}'"' >> "$tmp_file"
  done

  echo -e "\n    ]" >> "$tmp_file"
  echo -n "  }" >> "$tmp_file"
done

echo -e "\n}" >> "$tmp_file"

mv "$tmp_file" "$OUTPUT_FILE"
echo "✅ Saved to $OUTPUT_FILE"
