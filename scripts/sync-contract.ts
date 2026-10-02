import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { CONTRACT_FILE, withHeader } from './contract-header';

const serverRepo = resolve(
  process.env.MEDLABEL_SERVER_REPO ?? resolve(process.cwd(), '../MedLabel')
);
const source = resolve(serverRepo, CONTRACT_FILE);
const target = resolve(process.cwd(), CONTRACT_FILE);

async function main(): Promise<void> {
  const body = await readFile(source, 'utf8');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, withHeader(body));
  console.log(`Synced ${source}\n    -> ${target}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `sync:contract failed: ${message}\n` +
      'Set MEDLABEL_SERVER_REPO to the server checkout if it is not at ../MedLabel.'
  );
  process.exitCode = 1;
});
