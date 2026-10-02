import { generateKeyPairSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  extensionIdFromPublicKey,
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
  publicKeyBase64
} from './extension-key';

const RSA_MODULUS_BITS = 2048;

async function main(): Promise<void> {
  if (existsSync(PRIVATE_KEY_PATH)) {
    throw new Error(
      `${PRIVATE_KEY_PATH} already exists. Replacing it changes the extension ID ` +
        'and breaks auto-update on every workstation. Refusing to overwrite.'
    );
  }

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_BITS,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  const publicKey = publicKeyBase64(privateKey);

  await mkdir(dirname(PRIVATE_KEY_PATH), { recursive: true });
  await writeFile(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  await writeFile(PUBLIC_KEY_PATH, `${publicKey}\n`);

  console.log(`Private key: ${PRIVATE_KEY_PATH} (git-ignored)`);
  console.log(`Public key:  ${PUBLIC_KEY_PATH} (commit this)`);
  console.log(`Extension ID: ${extensionIdFromPublicKey(publicKey)}`);
  console.log(
    '\nBack up the private key outside this repo now (password manager or ' +
      'offline storage). Without it, no future release can update installed copies.'
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`keygen failed: ${message}`);
  process.exitCode = 1;
});
