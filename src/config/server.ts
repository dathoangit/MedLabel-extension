/**
 * Default intranet origin, baked into update_url and the initial settings.
 * Nurses' machines can override it in the options page without a release.
 */
export const DEFAULT_SERVER_ORIGIN = 'http://medlabel.local:8080';

export const UPDATE_MANIFEST_PATH = '/updates.xml';

export const SERVER_ORIGIN_KEY = 'serverOrigin';

/** Chrome match patterns reject ports and already match every port. */
export function hostPattern(origin: string): string {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}
