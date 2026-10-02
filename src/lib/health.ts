import {
  LOOKUP_API_VERSION,
  type HealthResponse
} from '../contracts/lookup.v1';

export type HealthCheck = { ok: true } | { ok: false; message: string };

export function interpretHealth(status: number, body: unknown): HealthCheck {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, message: `Server trả dữ liệu lạ (HTTP ${status}).` };
  }
  const health = body as Partial<HealthResponse>;
  if (health.service !== 'medlabel') {
    return {
      ok: false,
      message: 'Địa chỉ này không phải server MedLabel.'
    };
  }
  if (health.apiVersion !== LOOKUP_API_VERSION) {
    return {
      ok: false,
      message: `Server dùng API v${String(health.apiVersion)}, extension cần v${LOOKUP_API_VERSION}.`
    };
  }
  if (health.db !== 'up') {
    return {
      ok: false,
      message: 'Server chạy nhưng không kết nối được cơ sở dữ liệu HIS.'
    };
  }
  return { ok: true };
}

export async function checkHealth(
  serverOrigin: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthCheck> {
  try {
    const res = await fetchImpl(new URL('/health', serverOrigin), {
      cache: 'no-store'
    });
    return interpretHealth(res.status, await res.json());
  } catch {
    return {
      ok: false,
      message: `Không kết nối được ${serverOrigin}.`
    };
  }
}
