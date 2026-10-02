import {
  LOOKUP_API_VERSION,
  type LookupSuccessResponse
} from '../contracts/lookup.v1';
import type { LookupKind } from './code-kind';

export class LookupApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null
  ) {
    super(message);
    this.name = 'LookupApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Rejects anything that is not a v1 payload. Rendering a label from a
 * payload with a different shape could print the wrong drug or patient,
 * so a mismatch must stop the flow instead of degrading gracefully.
 */
export function parseLookupResponse(
  status: number,
  body: unknown
): LookupSuccessResponse {
  if (!isRecord(body)) {
    throw new LookupApiError(
      `Server trả dữ liệu không hợp lệ (HTTP ${status}).`,
      status
    );
  }

  if (body.apiVersion !== LOOKUP_API_VERSION) {
    throw new LookupApiError(
      `Phiên bản API server (${String(body.apiVersion ?? 'không rõ')}) ` +
        `không khớp extension (${LOOKUP_API_VERSION}). ` +
        'Không in tem. Báo IT cập nhật extension hoặc server.',
      status
    );
  }

  if (status < 200 || status >= 300) {
    const message =
      typeof body.error === 'string' ? body.error : `Lỗi HTTP ${status}`;
    throw new LookupApiError(message, status);
  }

  if (!isRecord(body.patient) || !Array.isArray(body.orders)) {
    throw new LookupApiError('Server trả thiếu thông tin người bệnh.', status);
  }

  return body as LookupSuccessResponse;
}

export async function fetchLookup(
  serverOrigin: string,
  kind: LookupKind,
  code: string,
  fetchImpl: typeof fetch = fetch
): Promise<LookupSuccessResponse> {
  const url = new URL('/api/lookup', serverOrigin);
  url.searchParams.set(kind, code);

  let res: Response;
  try {
    res = await fetchImpl(url, { cache: 'no-store' });
  } catch {
    throw new LookupApiError(
      `Không kết nối được server ${serverOrigin}. Kiểm tra mạng hoặc cài đặt địa chỉ server.`,
      null
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new LookupApiError(
      `Server trả dữ liệu không phải JSON (HTTP ${res.status}).`,
      res.status
    );
  }

  return parseLookupResponse(res.status, body);
}
