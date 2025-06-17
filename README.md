# SSL Pinning Generator

A Node.js/TypeScript tool for generating encrypted SSL certificate pinning configurations. This tool helps secure mobile applications by encrypting SSL pinning data using RSA-OAEP-256 encryption.

## Overview

This tool reads SSL certificate pinning configurations from a JSON file, encrypts them using a public key, and outputs an encrypted file that can be securely distributed to client applications. It's particularly useful for mobile app developers implementing certificate pinning for enhanced security.

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenSSL (for hash extraction script)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/thinesjs/ssl-pinning-generator
cd ssl-pinning-generator
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### 1. Prepare Your Configuration

Create or modify the `ssl-pinning-config.json` file with your domain configurations, or run `npm run export:ssl-config`:

```json
{
  "example.com": {
    "includeSubdomains": true,
    "publicKeyHashes": [
      "primary-certificate-hash=",
      "backup-certificate-hash="
    ]
  }
}
```

### 2. Prepare Your Public Key

Ensure you have a `ssl-public.pem` file in the root directory containing the RSA public key for encryption.

### 3. Generate Encrypted Configuration

Run the generator:

```bash
npm run generate
```

Or use individual commands:

```bash
# Build TypeScript
npm run build

# Run the generator
npm start
```

This will create an encrypted `ssl-pinning` file containing your SSL pinning configuration.

### 4. Read Encrypted SSL Configuration from URL

To fetch and decrypt SSL pinning configuration from a remote URL:

```bash
npm run read:ssl
```

This will:
1. Fetch the encrypted SSL pinning configuration from `https://assets.moneymatch.co/certs/ssl-pinning`
2. Decrypt it using the RSA private key from `ssl-private.pem`
3. Display the decrypted JSON configuration in the console

**Note**: You need the corresponding private key (`ssl-private.json`) to decrypt the configuration.

### 5. Export SSL Configuration to Local File

To fetch, decrypt, and save the SSL pinning configuration from the remote URL to your local file:

```bash
npm run export:ssl
```

This will:
1. Fetch the encrypted SSL pinning configuration from `https://assets.moneymatch.co/certs/ssl-pinning`
2. Decrypt it using the RSA private key from `ssl-private.json`
3. Save the decrypted JSON configuration to `ssl-pinning-config.json`
4. Display the configuration in the console for verification

This is useful for updating your local configuration file with the latest remote configuration.

## Configuration Format

The `ssl-pinning-config.json` file should follow this structure:

```json
{
  "domain.com": {
    "includeSubdomains": boolean,
    "publicKeyHashes": [
      "base64-encoded-sha256-hash1",
      "base64-encoded-sha256-hash2"
    ]
  }
}
```

### Fields:
- **includeSubdomains**: Whether to apply pinning to subdomains
- **publicKeyHashes**: Array of base64-encoded SHA-256 hashes of public keys

## Utility Scripts

### SSL Hash Extraction

The project includes a utility script for extracting SSL certificate hashes from certificate files:

```bash
./scripts/generate_ssl_hashes.sh
```

#### Certificate Placement

Place your SSL certificates in the `/certs` directory following this structure:

```
certs/
├── accounts_moneymatch_co/
│   ├── accounts_moneymatch_co.crt        # Leaf/server certificate
│   └── accounts_moneymatch_co.ca-bundle  # Intermediate and root certificates
├── transfer_moneymatch_co/
│   ├── transfer_moneymatch_co.crt        # Leaf/server certificate
│   └── transfer_moneymatch_co.ca-bundle  # Intermediate and root certificates
└── {domain_with_underscores}/
    ├── {domain_with_underscores}.crt
    └── {domain_with_underscores}.ca-bundle
```

**Note**: Domain names should use underscores instead of dots in folder and file names (e.g., `accounts.moneymatch.co` becomes `accounts_moneymatch_co`).

#### How the Script Works

The script:
1. Scans the `/certs` directory for domain folders
2. For each domain folder, looks for `.crt` (leaf certificate) and `.ca-bundle` (certificate chain) files
3. Extracts the public key from the leaf certificate and generates a SHA-256 hash
4. Splits the certificate bundle and generates backup hashes from intermediate certificates
5. Outputs the primary hash and backup hashes in base64 format
6. Converts domain folder names back to proper domain format (underscores to dots)

#### Output Format

For each domain, the script outputs:
```
accounts.moneymatch.co:
1. qhTtMzlmLJregAc7uDRRNrcEsIAe1iYn2gb9brfCcmE= 
2. NYbU7PBwV4y9J67c4guWTki8FJ+uudrXL0a4V4aRcrg= [BACKUP]
3. 2qkGb+4ldSHX4Z6slboc9d8oF4g7jaAjClvNJARkiTE= [BACKUP]
```

The first hash is from the leaf certificate, while subsequent hashes marked as `[BACKUP]` are from intermediate certificates in the chain.

## Current Configuration

The tool is currently configured for MoneyMatch domains across different regions:

- `accounts.moneymatch.co`
- `auth.moneymatch.co`
- `auth.moneymatch.co.nz`
- `auth.moneymatch.com.au`
- `auth.moneymatch.com.bn`
- `auth.moneymatch.sg`
- `compliance.moneymatch.co`
- `moneymatch.co.nz`
- `moneymatch.com.au`
- `moneymatch.com.bn`
- `moneymatch.sg`
- `transfer.moneymatch.co`



## Output

The tool generates:
- **ssl-pinning**: Encrypted configuration file (JWE format)
- **dist/index.js**: Compiled JavaScript from TypeScript source

## Development

### Project Structure

```
ssl-pinning-generator/
├── src/
│   └── index.ts          # Main application logic
├── scripts/
│   └── get_ssl_hashes.sh # SSL hash extraction utility
├── dist/                 # Compiled JavaScript output
├── ssl-pinning-config.json # SSL pinning configuration
├── ssl-pinning          # Encrypted output file
├── package.json         # Project dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

### Available Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run the compiled application (encrypt mode)
- `npm run generate:ssl`: Build and run the generator (encrypt SSL config)
- `npm run read:ssl`: Build and read encrypted SSL config from URL
- `npm run export:ssl`: Build and export encrypted SSL config from URL to local file
- `npm test`: Run tests (placeholder)

### Dependencies

- **node-jose**: JSON Web Encryption/Signature library
- **typescript**: TypeScript compiler
- **@types/node**: Node.js type definitions
- **@types/node-jose**: Type definitions for node-jose

## Security Considerations

1. **Private Key Protection**: Keep your private key secure and never commit it to version control
2. **Certificate Rotation**: Regularly update certificate hashes when certificates are renewed
3. **Backup Certificates**: Always include backup certificate hashes to prevent application breakage
4. **Secure Distribution**: Use secure channels to distribute the encrypted configuration

## Error Handling

The tool includes comprehensive error handling for:
- Missing input files (`ssl-pinning-config.json`, `ssl-public.pem`)
- Invalid JSON configuration
- Encryption failures
- File I/O errors

## License

ISC

## Author

thinesjs 