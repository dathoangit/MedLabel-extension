import {
  DEFAULT_SERVER_ORIGIN,
  hostPattern,
  SERVER_ORIGIN_KEY
} from './config/server';

export function normalizeOrigin(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Địa chỉ server phải bắt đầu bằng http:// hoặc https://.');
  }
  if (url.username || url.password) {
    throw new Error('Địa chỉ server không được chứa tài khoản hay mật khẩu.');
  }
  return url.origin;
}

export async function getServerOrigin(): Promise<string> {
  const stored = await chrome.storage.sync.get(SERVER_ORIGIN_KEY);
  const value: unknown = stored[SERVER_ORIGIN_KEY];
  if (typeof value !== 'string' || !value.trim()) {
    return DEFAULT_SERVER_ORIGIN;
  }
  try {
    return normalizeOrigin(value);
  } catch {
    return DEFAULT_SERVER_ORIGIN;
  }
}

/**
 * Must run directly inside a click handler: chrome.permissions.request
 * needs a user gesture, so nothing may be awaited before it.
 */
export async function setServerOrigin(raw: string): Promise<string> {
  const origin = normalizeOrigin(raw);
  const granted = await chrome.permissions.request({
    origins: [hostPattern(origin)]
  });
  if (!granted) {
    throw new Error('Chrome chưa cho phép extension gọi tới địa chỉ này.');
  }
  await chrome.storage.sync.set({ [SERVER_ORIGIN_KEY]: origin });
  return origin;
}

export async function resetServerOrigin(): Promise<string> {
  await chrome.storage.sync.remove(SERVER_ORIGIN_KEY);
  return DEFAULT_SERVER_ORIGIN;
}
