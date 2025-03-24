import * as fs from 'fs/promises';
import * as jose from 'node-jose';

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

async function main() {
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

// Run the script
main();
