import type { MedicationLine, PatientInfo } from '../contracts/lookup.v1';
import { escapeHtml } from './format';

/**
 * Roll geometry, measured on the actual media.
 * Vertical gap between rows (2.5 mm) is configured in the printer driver,
 * not here — the browser only ever renders one row per page.
 */
export const TEM_WIDTH_MM = 52;
export const TEM_HEIGHT_MM = 22;
export const TEM_PER_ROW = 2;
const ROW_WIDTH_MM = TEM_WIDTH_MM * TEM_PER_ROW;

/**
 * Shift the whole printed row left so content aligns with the physical
 * stickers. Keeps the shared Rongta driver margins untouched for other apps.
 * Increase if print still sits too far right; decrease if it overshoots left.
 */
export const PRINT_OFFSET_LEFT_MM = 1.5;

export const LABEL_PRINT_STYLES = `
  @page { size: ${ROW_WIDTH_MM}mm ${TEM_HEIGHT_MM}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${ROW_WIDTH_MM}mm;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .tem-row {
    width: ${ROW_WIDTH_MM}mm;
    height: ${TEM_HEIGHT_MM}mm;
    display: flex;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    transform: translateX(-${PRINT_OFFSET_LEFT_MM}mm);
  }
  /* Avoid an extra blank label being fed after the last row. */
  .tem-row:last-of-type {
    page-break-after: auto;
    break-after: auto;
  }
  .tem-slot {
    width: ${TEM_WIDTH_MM}mm;
    height: ${TEM_HEIGHT_MM}mm;
    overflow: hidden;
  }
  .inj-label {
    width: ${TEM_WIDTH_MM}mm;
    height: ${TEM_HEIGHT_MM}mm;
    padding: 1mm 1.2mm;
    display: flex;
    flex-direction: column;
    /* Spare height is split evenly between all four lines, so a 2-line drug
       name only tightens the spacing instead of shifting the layout. */
    justify-content: space-between;
    gap: 0.2mm;
    overflow: hidden;
  }
  .inj-label-drug {
    font-size: 8pt;
    line-height: 1.05;
    max-height: 2.1em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    word-break: break-word;
  }
  .inj-label-qty {
    font-size: 7.5pt;
    line-height: 1.05;
    white-space: nowrap;
  }
  /* Wraps instead of truncating: a clipped patient name is a safety risk. */
  .inj-label-patient {
    font-size: 8pt;
    line-height: 1.05;
    max-height: 2.1em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    word-break: break-word;
  }
  .inj-label-k {
    font-weight: 400;
  }
  .inj-label-v {
    font-weight: 700;
  }
  .inj-label-meta {
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    font-size: 7.5pt;
    line-height: 1.05;
    white-space: nowrap;
  }
`;

/**
 * Infusion bag/bottle sticker — 5.5 cm wide × 6 cm tall, one label per page.
 * Different media from the injection roll, so it uses its own @page size.
 */
export const INF_WIDTH_MM = 55;
export const INF_HEIGHT_MM = 60;
/** Blank gap before the printed date so nurses can write HH:mm by hand. */
export const INF_TIME_GAP_MM = 15;

export const INFUSION_PRINT_STYLES = `
  @page { size: ${INF_WIDTH_MM}mm ${INF_HEIGHT_MM}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${INF_WIDTH_MM}mm;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .inf-page {
    width: ${INF_WIDTH_MM}mm;
    height: ${INF_HEIGHT_MM}mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .inf-page:last-of-type {
    page-break-after: auto;
    break-after: auto;
  }
  .inf-label {
    width: ${INF_WIDTH_MM}mm;
    height: ${INF_HEIGHT_MM}mm;
    padding: 1.5mm 2mm;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    font-size: 9pt;
    line-height: 1.25;
  }
  .inf-label-title {
    text-align: center;
    font-weight: 700;
    font-size: 9.5pt;
    line-height: 1.2;
    padding-bottom: 1.5mm;
    border-bottom: 0.3mm solid #000;
    flex-shrink: 0;
  }
  .inf-label-patient {
    padding: 1.5mm 0;
    border-bottom: 0.3mm solid #000;
    display: flex;
    flex-direction: column;
    gap: 0.8mm;
    flex-shrink: 0;
  }
  .inf-label-meta {
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    white-space: nowrap;
  }
  .inf-label-drug {
    padding-top: 1.5mm;
    display: flex;
    flex-direction: column;
    gap: 1.2mm;
    flex: 1;
    min-height: 0;
  }
  .inf-label-line {
    overflow: hidden;
    word-break: break-word;
  }
  .inf-label-drug-name {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    max-height: 3.8em;
    overflow: hidden;
  }
  .inf-label-time-gap {
    display: inline-block;
    min-width: ${INF_TIME_GAP_MM}mm;
  }
  .inj-label-k {
    font-weight: 400;
  }
  .inj-label-v {
    font-weight: 700;
  }
`;

export function buildLabelInnerHtml(
  patient: PatientInfo,
  med: MedicationLine
): string {
  const tenThuoc = med.tenThuoc ?? '';
  const tenNb = patient.tenNb ?? '';
  const tuoi = patient.tuoi != null ? String(patient.tuoi) : '';
  const maBa = patient.maBenhAn ?? '';
  const thuocPha = (med.thuocDungKem ?? [])
    .map((drug) => drug.tenThuoc ?? '')
    .filter(Boolean);
  const tenThuocLine = [tenThuoc, ...thuocPha].filter(Boolean).join(', ');

  return `
    <div class="inj-label">
      <div class="inj-label-drug">
        <span class="inj-label-k">Tên thuốc:</span>
        <span class="inj-label-v">${escapeHtml(tenThuocLine)}</span>
      </div>
      <div class="inj-label-qty">
        <span class="inj-label-k">SL:</span>
        <span class="inj-label-v"></span>
      </div>
      <div class="inj-label-patient">
        <span class="inj-label-k">Tên NB:</span>
        <span class="inj-label-v">${escapeHtml(tenNb)}</span>
      </div>
      <div class="inj-label-meta">
        <span>Tuổi: <span class="inj-label-v">${escapeHtml(tuoi)}</span></span>
        <span>Mã BA: <span class="inj-label-v">${escapeHtml(maBa)}</span></span>
      </div>
    </div>
  `;
}

export function chunkIntoRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += TEM_PER_ROW) {
    rows.push(items.slice(i, i + TEM_PER_ROW));
  }
  return rows;
}

/**
 * One printed page = one physical row of the roll.
 * Unused slots stay blank so a phiếu never shares a row with another patient.
 */
export function buildRowHtml(
  patient: PatientInfo,
  rowMeds: MedicationLine[],
  { forPreview = false }: { forPreview?: boolean } = {}
): string {
  let slots = '';
  for (let i = 0; i < TEM_PER_ROW; i += 1) {
    const med = rowMeds[i];
    if (med) {
      slots += `<div class="tem-slot">${buildLabelInnerHtml(patient, med)}</div>`;
    } else {
      slots += `<div class="tem-slot tem-slot-empty">${
        forPreview ? '<span>ô trống</span>' : ''
      }</div>`;
    }
  }
  return `<div class="tem-row">${slots}</div>`;
}

export function buildRowsHtml(
  patient: PatientInfo,
  meds: MedicationLine[]
): string {
  return chunkIntoRows(meds)
    .map((rowMeds) => buildRowHtml(patient, rowMeds))
    .join('');
}

export function buildPrintDocument(
  patient: PatientInfo,
  meds: MedicationLine[]
): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Tem thuốc tiêm</title>
  <style>${LABEL_PRINT_STYLES}</style>
</head>
<body>${buildRowsHtml(patient, meds)}</body>
</html>`;
}

/**
 * Mix date printed on an infusion label — date only. Nurses write the
 * clock time by hand in the blank gap before the date.
 */
export function formatPrintDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function drugAndSolvent(med: MedicationLine): string {
  const tenThuoc = med.tenThuoc ?? '';
  const solvents = (med.thuocDungKem ?? [])
    .map((drug) => drug.tenThuoc ?? '')
    .filter(Boolean);
  return [tenThuoc, ...solvents].filter(Boolean).join(', ');
}

/**
 * One infusion = one 5.5×6 cm sticker: title, patient block, drug block.
 */
export function buildInfusionRowHtml(
  patient: PatientInfo,
  med: MedicationLine,
  printedAt: Date
): string {
  const tenNb = patient.tenNb ?? '';
  const tuoi = patient.tuoi != null ? String(patient.tuoi) : '';
  const maBa = patient.maBenhAn ?? '';
  const thuoc = drugAndSolvent(med);
  const tocDo = med.lieuDung ?? '';

  return `
    <div class="inf-page">
      <div class="inf-label">
        <div class="inf-label-title">Nhãn túi/ chai dịch truyền, BTĐ</div>
        <div class="inf-label-patient">
          <div class="inf-label-line">
            <span class="inj-label-k">Tên:</span>
            <span class="inj-label-v">${escapeHtml(tenNb)}</span>
          </div>
          <div class="inf-label-meta">
            <span>Tuổi: <span class="inj-label-v">${escapeHtml(tuoi)}</span></span>
            <span>Mã BA: <span class="inj-label-v">${escapeHtml(maBa)}</span></span>
          </div>
        </div>
        <div class="inf-label-drug">
          <div class="inf-label-line inf-label-drug-name">
            <span class="inj-label-k">Thuốc, dung môi:</span>
            <span class="inj-label-v">${escapeHtml(thuoc)}</span>
          </div>
          <div class="inf-label-line">
            <span class="inj-label-k">SL:</span>
            <span class="inj-label-v"></span>
          </div>
          <div class="inf-label-line">
            <span class="inj-label-k">Tốc độ:</span>
            <span class="inj-label-v">${escapeHtml(tocDo)}</span>
          </div>
          <div class="inf-label-line">
            <span class="inj-label-k">Giờ pha:</span>
            <span class="inf-label-time-gap"></span>
            <span class="inj-label-v">${escapeHtml(formatPrintDate(printedAt))}</span>
          </div>
          <div class="inf-label-line">
            <span class="inj-label-k">Điều dưỡng:</span>
            <span class="inj-label-v"></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildInfusionRowsHtml(
  patient: PatientInfo,
  meds: MedicationLine[],
  printedAt: Date
): string {
  return meds
    .map((med) => buildInfusionRowHtml(patient, med, printedAt))
    .join('');
}

export type LabelPrintSection = {
  kind: 'injection' | 'infusion';
  meds: MedicationLine[];
};

export function printStylesForKind(kind: 'injection' | 'infusion'): string {
  return kind === 'infusion' ? INFUSION_PRINT_STYLES : LABEL_PRINT_STYLES;
}

export function buildInfusionPrintDocument(
  patient: PatientInfo,
  meds: MedicationLine[],
  printedAt: Date
): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Tem thuốc truyền</title>
  <style>${INFUSION_PRINT_STYLES}</style>
</head>
<body>${buildInfusionRowsHtml(patient, meds, printedAt)}</body>
</html>`;
}
