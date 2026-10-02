import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CONTRACT_FILE, hashBody, parseContract } from './contract-header';

async function main(): Promise<void> {
  const content = await readFile(resolve(process.cwd(), CONTRACT_FILE), 'utf8');
  const parsed = parseContract(content);
  if (!parsed.ok) {
    throw new Error(`${CONTRACT_FILE}: ${parsed.reason}`);
  }
  if (hashBody(parsed.body) !== parsed.recordedHash) {
    throw new Error(
      `${CONTRACT_FILE} was edited by hand. Change the contract in the server ` +
        'repo, then run `yarn sync:contract`.'
    );
  }
  console.log(`${CONTRACT_FILE} matches its synced hash.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`check:contract failed: ${message}`);
  process.exitCode = 1;
});
