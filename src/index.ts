import * as fs from 'fs/promises';
import * as jose from 'node-jose';
import * as https from 'https';

async function fetchUrlContent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function decryptSslPinning(
  encryptedData: string,
  privateKeyPath: string,
): Promise<any> {
  try {
    // Read the private key
    const privateKeyData = await fs.readFile(privateKeyPath, 'utf-8');

    // Create keystore and import the private key
    const keystore = jose.JWK.createKeyStore();
    let key;
    
    // Check if the key is in JWK format (JSON) or PEM format
    if (privateKeyPath.endsWith('.json')) {
      // JWK format
      const jwkData = JSON.parse(privateKeyData);
      key = await keystore.add(jwkData);
    } else {
      // PEM format
      key = await keystore.add(privateKeyData, "pem");
    }

    // Decrypt the JWE data
    const decrypted = await jose.JWE.createDecrypt(key).decrypt(encryptedData);

    // Parse and return the JSON
    const decryptedString = decrypted.payload.toString('utf-8');
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error occurred during decryption:', error);
    throw error;
  }
}

async function readSslPinningFromUrl(
  url: string,
  privateKeyPath: string,
): Promise<void> {
  try {
    console.log(`Fetching SSL pinning config from: ${url}`);
    
    // Fetch the encrypted data from the URL
    const encryptedData = await fetchUrlContent(url);
    
    console.log('Decrypting SSL pinning configuration...');
    
    // Decrypt the data
    const decryptedConfig = await decryptSslPinning(encryptedData.trim(), privateKeyPath);
    
    // Output the result
    console.log('Decrypted SSL Pinning Configuration:');
    console.log(JSON.stringify(decryptedConfig, null, 2));
    
    return decryptedConfig;
  } catch (error) {
    console.error('Error occurred while reading SSL pinning from URL:', error);
    throw error;
  }
}

async function encryptSslPinning(
  jsonFilePath: string,
  publicKeyPath: string,
  outputPath: string,
): Promise<void> {
  try {
    // Read the SSL pinning JSON configuration
    const sslPinningConfig = await fs.readFile(jsonFilePath, 'utf-8');
    const sslPinningData = JSON.parse(sslPinningConfig);
    
    // reading pubkek
    const publicKeyData = await fs.readFile(publicKeyPath, 'utf-8');

    // Create keystore and import the public key
    const keystore = jose.JWK.createKeyStore();
    const key = await keystore.add(publicKeyData, "pem"); // pubKey

    // Convert SSL pinning config to string
    const sslPinningStr = JSON.stringify(sslPinningData);

    // Encrypt the data using RSA-OAEP-256
    const encrypted = await jose.JWE.createEncrypt(
      {format: "compact", fields: {
        alg: "RSA-OAEP-256"
      }},
      key,
    )
      .update(Buffer.from(sslPinningStr))
      .final();
      

    // Write the encrypted data to file
    await fs.writeFile(outputPath, encrypted);

    console.log(
      `Successfully encrypted SSL pinning configuration to: ${outputPath}`,
    );
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  }
}

async function exportSslPinningFromUrl(
  url: string,
  privateKeyPath: string,
  outputPath: string,
): Promise<void> {
  try {
    console.log(`Fetching SSL pinning config from: ${url}`);
    
    // Fetch the encrypted data from the URL
    const encryptedData = await fetchUrlContent(url);
    
    console.log('Decrypting SSL pinning configuration...');
    
    // Decrypt the data
    const decryptedConfig = await decryptSslPinning(encryptedData.trim(), privateKeyPath);
    
    // Save to file
    const jsonString = JSON.stringify(decryptedConfig, null, 2);
    await fs.writeFile(outputPath, jsonString, 'utf-8');
    
    console.log(`Successfully exported decrypted SSL pinning configuration to: ${outputPath}`);
    console.log('Configuration preview:');
    console.log(JSON.stringify(decryptedConfig, null, 2));
    
    return decryptedConfig;
  } catch (error) {
    console.error('Error occurred while exporting SSL pinning from URL:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const operation = args[0];

  if (operation === 'read') {
    // Read and decrypt SSL pinning config from URL
    const url = 'https://assets.moneymatch.co/certs/ssl-pinning';
    const privateKeyPath = 'ssl-private.json';

    try {
      try {
        await fs.access(privateKeyPath);
      } catch (error) {
        console.error(`Private key file not found: ${privateKeyPath}. Please ensure this file exists for decryption.`);
        process.exit(1);
      }

      await readSslPinningFromUrl(url, privateKeyPath);
    } catch (error) {
      console.error('Failed to read and decrypt SSL pinning configuration:', error);
      process.exit(1);
    }
  } else if (operation === 'export') {
    // Export and save decrypted SSL pinning config from URL to local file
    const url = 'https://assets.moneymatch.co/certs/ssl-pinning';
    const privateKeyPath = 'ssl-private.json';
    const outputPath = 'ssl-pinning-config.json';

    try {
      try {
        await fs.access(privateKeyPath);
      } catch (error) {
        console.error(`Private key file not found: ${privateKeyPath}. Please ensure this file exists for decryption.`);
        process.exit(1);
      }

      await exportSslPinningFromUrl(url, privateKeyPath, outputPath);
    } catch (error) {
      console.error('Failed to export SSL pinning configuration:', error);
      process.exit(1);
    }
  } else {
    // Default: Encrypt SSL pinning config (existing functionality)
    const jsonFilePath = 'ssl-pinning-config.json';
    const publicKeyPath = 'ssl-public.pem';
    const outputPath = 'ssl-pinning';

    try {
      try {
        await fs.access(jsonFilePath);
        await fs.access(publicKeyPath);
      } catch (error) {
        console.error('Input files not found. Please check the file paths.');
        process.exit(1);
      }

      await encryptSslPinning(jsonFilePath, publicKeyPath, outputPath);
    } catch (error) {
      console.error('Failed to encrypt SSL pinning configuration:', error);
      process.exit(1);
    }
  }
}

// Run the script
main();
