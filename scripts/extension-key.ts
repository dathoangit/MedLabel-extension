import { createHash, createPublicKey } from 'node:crypto';

export const PRIVATE_KEY_PATH = 'keys/extension.pem';
export const PUBLIC_KEY_PATH = 'keys/public-key.txt';

/** Base64 SubjectPublicKeyInfo — the format manifest.json "key" expects. */
export function publicKeyBase64(privateKeyPem: string): string {
  return createPublicKey(privateKeyPem)
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
}

/**
 * Chrome derives the ID from the first 16 bytes of sha256(SPKI DER),
 * hex-encoded with digits 0-f mapped to letters a-p.
 */
export function extensionIdFromPublicKey(publicKeyB64: string): string {
  const digest = createHash('sha256')
    .update(Buffer.from(publicKeyB64, 'base64'))
    .digest('hex')
    .slice(0, 32);
  return [...digest]
    .map((char) => String.fromCharCode('a'.charCodeAt(0) + parseInt(char, 16)))
    .join('');
}
