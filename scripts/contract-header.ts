import { createHash } from 'node:crypto';

export const CONTRACT_FILE = 'src/contracts/lookup.v1.ts';

const HEADER_PATTERN =
  /^\/\/ DO NOT EDIT\. Synced from medlabel-server by `yarn sync:contract`\.\n\/\/ sha256: ([0-9a-f]{64})\n\n/;

export function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export function withHeader(body: string): string {
  return (
    '// DO NOT EDIT. Synced from medlabel-server by `yarn sync:contract`.\n' +
    `// sha256: ${hashBody(body)}\n\n` +
    body
  );
}

export type ParsedContract =
  | { ok: true; body: string; recordedHash: string }
  | { ok: false; reason: string };

export function parseContract(content: string): ParsedContract {
  const match = HEADER_PATTERN.exec(content);
  if (!match) {
    return { ok: false, reason: 'missing DO NOT EDIT header' };
  }
  return {
    ok: true,
    body: content.slice(match[0].length),
    recordedHash: match[1]
  };
}
