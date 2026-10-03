const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

function parseVersion(version: string): [number, number, number] | null {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True when remote is a valid Chrome-style version strictly greater than local. */
export function isNewerVersion(remote: string, local: string): boolean {
  const remoteParts = parseVersion(remote);
  const localParts = parseVersion(local);
  if (!remoteParts || !localParts) {
    return false;
  }
  for (let i = 0; i < 3; i += 1) {
    if (remoteParts[i] !== localParts[i]) {
      return remoteParts[i] > localParts[i];
    }
  }
  return false;
}
