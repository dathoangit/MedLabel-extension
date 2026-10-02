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
  .inj-label-mix {
    font-size: 7pt;
    line-height: 1.05;
    max-height: 2.1em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    word-break: break-word;
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
  .inf-label {
    width: ${TEM_WIDTH_MM}mm;
    height: ${TEM_HEIGHT_MM}mm;
    padding: 0.8mm 1.2mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.15mm;
    overflow: hidden;
    font-size: 7pt;
    line-height: 1.05;
  }
  .inf-label-line {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    word-break: break-word;
  }
  .inf-label-rate {
    -webkit-line-clamp: 2;
    max-height: 2.1em;
  }
  .inf-label-ba {
    text-align: right;
    white-space: nowrap;
    font-size: 7pt;
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
    .filter(Boolean)
    .join(' + ');

  return `
    <div class="inj-label">
      <div class="inj-label-drug">
        <span class="inj-label-k">Tên thuốc:</span>
        <span class="inj-label-v">${escapeHtml(tenThuoc)}</span>
      </div>
      <div class="inj-label-mix">
        <span class="inj-label-k">Thuốc pha:</span>
        <span class="inj-label-v">${escapeHtml(thuocPha)}</span>
      </div>
      <div class="inj-label-patient">
        <span class="inj-label-k">Tên NB:</span>
        <span class="inj-label-v">${escapeHtml(tenNb)}</span>
      </div>
      <div class="inj-label-meta">
        <span>Tuổi: ${escapeHtml(tuoi)}</span>
        <span>Mã BA: ${escapeHtml(maBa)}</span>
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

/** Clock printed on an infusion label. Fixed format so tests can pin it. */
export function formatPrintClock(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Four-digit birth year from an ISO date. Empty when the date is missing. */
export function birthYear(ngaySinh: string | null): string {
  if (!ngaySinh) {
    return '';
  }
  const match = /^(\d{4})/.exec(ngaySinh);
  return match?.[1] ?? '';
}

function mixNames(med: MedicationLine): string {
  return (med.thuocDungKem ?? [])
    .map((drug) => drug.tenThuoc ?? '')
    .filter(Boolean)
    .join(' + ');
}

function infusionSlot(inner: string): string {
  return `<div class="tem-slot"><div class="inf-label">${inner}</div></div>`;
}

/**
 * One infusion occupies a whole roll row: patient on the left (1/2),
 * drug on the right (2/2). Neither slot is left blank.
 */
export function buildInfusionRowHtml(
  patient: PatientInfo,
  med: MedicationLine,
  printedAt: Date
): string {
  const tenNb = patient.tenNb ?? '';
  const namSinh = birthYear(patient.ngaySinh);
  const maBa = patient.maBenhAn ?? '';
  const tenThuoc = med.tenThuoc ?? '';
  const tocDo = med.lieuDung ?? '';

  const left = `
    <div class="inf-label-line">
      <span class="inj-label-k">Tên NB:</span>
      <span class="inj-label-v">${escapeHtml(tenNb)}</span>
    </div>
    <div class="inf-label-line">
      <span class="inj-label-k">Năm sinh:</span>
      <span class="inj-label-v">${escapeHtml(namSinh)}</span>
    </div>
    <div class="inf-label-line">
      <span class="inj-label-k">Điều dưỡng:</span>
      <span class="inj-label-v"></span>
    </div>
    <div class="inf-label-line">
      <span class="inj-label-k">Thời gian:</span>
      <span class="inj-label-v">${escapeHtml(formatPrintClock(printedAt))}</span>
    </div>
    <div class="inf-label-ba">Mã BA: ${escapeHtml(maBa)} - 1/2</div>
  `;

  const right = `
    <div class="inf-label-line">
      <span class="inj-label-k">Tên thuốc:</span>
      <span class="inj-label-v">${escapeHtml(tenThuoc)}</span>
    </div>
    <div class="inf-label-line">
      <span class="inj-label-k">Thuốc pha:</span>
      <span class="inj-label-v">${escapeHtml(mixNames(med))}</span>
    </div>
    <div class="inf-label-line inf-label-rate">
      <span class="inj-label-k">Tốc độ:</span>
      <span class="inj-label-v">${escapeHtml(tocDo)}</span>
    </div>
    <div class="inf-label-ba">Mã BA: ${escapeHtml(maBa)} - 2/2</div>
  `;

  return `<div class="tem-row">${infusionSlot(left)}${infusionSlot(right)}</div>`;
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
  <style>${LABEL_PRINT_STYLES}</style>
</head>
<body>${buildInfusionRowsHtml(patient, meds, printedAt)}</body>
</html>`;
}
