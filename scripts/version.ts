export type BumpKind = 'major' | 'minor' | 'patch';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function isBumpKind(value: string): value is BumpKind {
  return value === 'major' || value === 'minor' || value === 'patch';
}

/** Chrome extension versions allow only dot-separated integers. */
export function bumpVersion(version: string, kind: BumpKind): string {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Version "${version}" is not MAJOR.MINOR.PATCH.`);
  }
  const [major, minor, patch] = match.slice(1).map(Number);
  if (kind === 'major') {
    return `${major + 1}.0.0`;
  }
  if (kind === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

export function updateManifestXml(
  appId: string,
  version: string,
  crxUrl: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="${appId}">
    <updatecheck codebase="${crxUrl}" version="${version}" />
  </app>
</gupdate>
`;
}

/** Shared-folder auto-reload signal; kept in sync with package.json at build time. */
export function versionJsonContents(version: string): string {
  return `${JSON.stringify({ version }, null, 2)}\n`;
}
