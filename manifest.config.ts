import { existsSync, readFileSync } from 'node:fs';
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';
import {
  DEFAULT_SERVER_ORIGIN,
  hostPattern,
  UPDATE_MANIFEST_PATH
} from './src/config/server';

const PUBLIC_KEY_PATH = 'keys/public-key.txt';

/** Pins the extension ID for unpacked dev builds to match the signed .crx. */
function readPublicKey(): string | undefined {
  if (!existsSync(PUBLIC_KEY_PATH)) {
    return undefined;
  }
  const key = readFileSync(PUBLIC_KEY_PATH, 'utf8').trim();
  return key || undefined;
}

const publicKey = readPublicKey();

export default defineManifest({
  manifest_version: 3,
  name: 'MedLabel',
  description:
    'Print medication infusion labels for nursing preparation from HIS patient data.',
  version: pkg.version,
  ...(publicKey ? { key: publicKey } : {}),
  update_url: `${DEFAULT_SERVER_ORIGIN}${UPDATE_MANIFEST_PATH}`,
  action: {
    default_title: 'MedLabel',
    default_icon: {
      '16': 'public/icons/icon-16.png',
      '32': 'public/icons/icon-32.png',
      '48': 'public/icons/icon-48.png',
      '128': 'public/icons/icon-128.png'
    }
  },
  icons: {
    '16': 'public/icons/icon-16.png',
    '32': 'public/icons/icon-32.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png'
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html'
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true
  },
  permissions: ['storage', 'sidePanel', 'alarms'],
  host_permissions: [hostPattern(DEFAULT_SERVER_ORIGIN)],
  optional_host_permissions: ['http://*/*', 'https://*/*']
});
