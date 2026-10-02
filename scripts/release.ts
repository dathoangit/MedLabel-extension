import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import crx3 from 'crx3';
import { DEFAULT_SERVER_ORIGIN } from '../src/config/server';
import {
  extensionIdFromPublicKey,
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
  publicKeyBase64
} from './extension-key';
import {
  bumpVersion,
  isBumpKind,
  updateManifestXml,
  type BumpKind
} from './version';

const PACKAGE_JSON = 'package.json';
const DIST_DIR = 'dist';
const RELEASE_DIR = 'release';

type PackageJson = { version: string } & Record<string, unknown>;

async function readPackage(): Promise<PackageJson> {
  return JSON.parse(await readFile(PACKAGE_JSON, 'utf8')) as PackageJson;
}

async function writePackage(pkg: PackageJson): Promise<void> {
  await writeFile(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * crx3 silently generates a new key when the file is missing, which would
 * ship an extension with a different ID. Fail loudly instead.
 */
async function loadSigningKey(): Promise<string> {
  if (!existsSync(PRIVATE_KEY_PATH)) {
    throw new Error(
      `${PRIVATE_KEY_PATH} is missing. Restore it from backup. Run ` +
        '`yarn keygen` only for the very first release.'
    );
  }
  const publicKey = publicKeyBase64(await readFile(PRIVATE_KEY_PATH, 'utf8'));
  const committed = existsSync(PUBLIC_KEY_PATH)
    ? (await readFile(PUBLIC_KEY_PATH, 'utf8')).trim()
    : '';
  if (committed !== publicKey) {
    throw new Error(
      `${PUBLIC_KEY_PATH} does not match ${PRIVATE_KEY_PATH}. ` +
        'Wrong key restored? The extension ID would change.'
    );
  }
  return publicKey;
}

async function main(): Promise<void> {
  const bumpArg = process.argv[2] ?? 'patch';
  if (!isBumpKind(bumpArg)) {
    throw new Error('Usage: yarn release [patch|minor|major]');
  }
  const bump: BumpKind = bumpArg;

  const publicKey = await loadSigningKey();
  const appId = extensionIdFromPublicKey(publicKey);

  const pkg = await readPackage();
  const previousVersion = pkg.version;
  const version = bumpVersion(previousVersion, bump);
  await writePackage({ ...pkg, version });

  try {
    execFileSync('yarn', ['build'], { stdio: 'inherit' });
  } catch (error) {
    await writePackage({ ...pkg, version: previousVersion });
    throw new Error(`Build failed; version restored to ${previousVersion}.`, {
      cause: error
    });
  }

  const builtManifest = JSON.parse(
    await readFile(resolve(DIST_DIR, 'manifest.json'), 'utf8')
  ) as { version: string };
  if (builtManifest.version !== version) {
    throw new Error(
      `dist/manifest.json has version ${builtManifest.version}, expected ${version}.`
    );
  }

  await mkdir(RELEASE_DIR, { recursive: true });
  const crxName = `medlabel-${version}.crx`;
  const crxPath = resolve(RELEASE_DIR, crxName);
  await crx3([resolve(DIST_DIR)], {
    keyPath: resolve(PRIVATE_KEY_PATH),
    crxPath
  });

  const crxUrl = `${DEFAULT_SERVER_ORIGIN}/${crxName}`;
  const xmlPath = resolve(RELEASE_DIR, 'updates.xml');
  await writeFile(xmlPath, updateManifestXml(appId, version, crxUrl));

  console.log(`\nReleased ${previousVersion} -> ${version}`);
  console.log(`Extension ID: ${appId}`);
  console.log(`  ${crxPath}`);
  console.log(`  ${xmlPath}`);
  console.log(
    '\nCopy both files into the server repo updates/ folder on the hospital ' +
      'server. Copy the .crx first, then updates.xml, so Chrome never sees a ' +
      'version it cannot download. Then commit package.json.'
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`release failed: ${message}`);
  process.exitCode = 1;
});
