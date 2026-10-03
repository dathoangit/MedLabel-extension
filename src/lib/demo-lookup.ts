import {
  LOOKUP_API_VERSION,
  type LookupSuccessResponse
} from '../contracts/lookup.v1';

/** Type or click this to load {@link buildDemoLookup} without calling the server. */
export const DEMO_LOOKUP_CODE = 'demo';

export function isDemoLookupCode(raw: string): boolean {
  return raw.trim().toLowerCase() === DEMO_LOOKUP_CODE;
}

function med(opts: {
  id: string;
  tenThuoc: string;
  duongDung: string;
  lieuDung?: string | null;
  cachDung?: string | null;
  soLuong?: number | null;
  dvt?: string | null;
  laThuocDungKem?: boolean;
  thuocDungKem?: { hisServiceProductId: string; tenThuoc: string }[];
  thoiGianKe?: string | null;
}): LookupSuccessResponse['orders'][number]['medications'][number] {
  return {
    hisServiceProductId: opts.id,
    tenThuoc: opts.tenThuoc,
    lieuDung: opts.lieuDung ?? null,
    cachDung: opts.cachDung ?? null,
    duongDung: opts.duongDung,
    thoiGianKe: opts.thoiGianKe ?? '2026-10-03T08:30:00.000Z',
    thoiGianThucHien: null,
    soLuong: opts.soLuong ?? 1,
    dvt: opts.dvt ?? 'Ống',
    tocDoTruyen: null,
    donViTocDo: null,
    laThuocDungKem: opts.laThuocDungKem ?? false,
    thuocDungKem: opts.thuocDungKem ?? []
  };
}

/**
 * Offline sample payload for UI / print testing when HIS is unreachable.
 * Covers odd injection rows, long names (marquee), infusions with mix lines,
 * and an oral line that must not become a label.
 */
export function buildDemoLookup(): LookupSuccessResponse {
  const solvent = med({
    id: 'demo-sol-1',
    tenThuoc: 'Natri clorid 0,9% 100ml',
    duongDung: 'Truyền tĩnh mạch',
    lieuDung: null,
    dvt: 'Chai',
    laThuocDungKem: true
  });

  const orders = [
    {
      toDieuTriId: 'DEMO-TDT-001',
      thoiGianKe: '2026-10-03T08:30:00.000Z',
      medicationCount: 6,
      medications: [
        med({
          id: 'demo-inj-1',
          tenThuoc: 'Ceftriaxon 1g',
          duongDung: 'Tiêm tĩnh mạch',
          lieuDung: '1g × 2 lần/ngày',
          cachDung: 'Pha NaCl 0,9%',
          thuocDungKem: [
            {
              hisServiceProductId: 'demo-mix-1',
              tenThuoc: 'Natri clorid 0,9% 10ml'
            }
          ]
        }),
        med({
          id: 'demo-inj-2',
          tenThuoc:
            'Omeprazole 40mg bột pha tiêm — tên dài để thử chữ chạy trên preview',
          duongDung: 'Tiêm tĩnh mạch chậm',
          lieuDung: '40mg × 1 lần/ngày'
        }),
        med({
          id: 'demo-inj-3',
          tenThuoc: 'Metoclopramid 10mg/2ml',
          duongDung: 'Tiêm bắp',
          lieuDung: '10mg khi buồn nôn',
          dvt: 'Ống'
        }),
        med({
          id: 'demo-inf-1',
          tenThuoc: 'Cefoperazon/Sulbactam 2g',
          duongDung: 'Truyền tĩnh mạch',
          lieuDung: 'pha truyền 30 giọt/phút',
          cachDung: 'Truyền chậm',
          dvt: 'Lọ',
          thuocDungKem: [
            {
              hisServiceProductId: solvent.hisServiceProductId,
              tenThuoc: solvent.tenThuoc ?? ''
            }
          ]
        }),
        solvent,
        med({
          id: 'demo-oral-1',
          tenThuoc: 'Paracetamol 500mg',
          duongDung: 'Uống',
          lieuDung: '1 viên khi sốt',
          dvt: 'Viên',
          soLuong: 2
        })
      ]
    },
    {
      toDieuTriId: 'DEMO-TDT-002',
      thoiGianKe: '2026-10-02T14:00:00.000Z',
      medicationCount: 2,
      medications: [
        med({
          id: 'demo-inf-2',
          tenThuoc: 'Glucose 5% 500ml',
          duongDung: 'Truyền tĩnh mạch',
          lieuDung: '40 giọt/phút',
          dvt: 'Chai',
          thoiGianKe: '2026-10-02T14:00:00.000Z'
        }),
        med({
          id: 'demo-inf-3',
          tenThuoc:
            'Aminoplasmal B.Braun 10% E dung dịch tiêm truyền — tên dài kiểm tra marquee',
          duongDung: 'Truyền tĩnh mạch',
          lieuDung: 'pha truyền chậm 20 giọt/phút',
          dvt: 'Chai',
          thoiGianKe: '2026-10-02T14:00:00.000Z',
          thuocDungKem: [
            {
              hisServiceProductId: 'demo-mix-2',
              tenThuoc: 'Kalium clorid 10%'
            }
          ]
        })
      ]
    }
  ];

  const medicationCount = orders.reduce(
    (sum, order) => sum + order.medicationCount,
    0
  );

  return {
    apiVersion: LOOKUP_API_VERSION,
    lookupBy: 'maBenhAn',
    matchCount: 1,
    orderCount: orders.length,
    medicationCount,
    patient: {
      hisPatienthistoryId: 'demo-history-1',
      maHoSo: '2610030001',
      maNb: 'NB-DEMO-01',
      maBenhAn: 'DEMO01',
      tenNb: 'Nguyễn Thị Demo Kiểm Tra Tên Dài',
      tuoi: 42,
      ngaySinh: '1984-05-12',
      gioiTinh: 'F'
    },
    orders
  };
}
