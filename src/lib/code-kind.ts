export type LookupKind = 'ma-ho-so' | 'ma-benh-an';

export type DetectedCode =
  | { kind: null; code: ''; label: '' }
  | { kind: LookupKind; code: string; label: string };

/**
 * Same rule as the server's parseMaHoSo:
 * 10 digits + valid YYMMDD date prefix → mã hồ sơ; else mã bệnh án.
 */
export function detectCodeKind(raw: string): DetectedCode {
  const code = raw.trim();
  if (!code) {
    return { kind: null, code: '', label: '' };
  }

  if (/^\d{10}$/.test(code)) {
    const mm = Number(code.slice(2, 4));
    const dd = Number(code.slice(4, 6));
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return { kind: 'ma-ho-so', code, label: 'mã hồ sơ' };
    }
  }

  return { kind: 'ma-benh-an', code, label: 'mã bệnh án' };
}
