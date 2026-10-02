import type {
  LookupSuccessResponse,
  MedicationLine,
  PatientInfo,
  TreatmentOrder
} from '../contracts/lookup.v1';
import { fetchLookup, LookupApiError } from '../lib/api';
import { detectCodeKind } from '../lib/code-kind';
import { mustGet } from '../lib/dom';
import { formatTime, genderLabel } from '../lib/format';
import {
  buildInfusionRowHtml,
  buildRowHtml,
  chunkIntoRows,
  TEM_HEIGHT_MM,
  TEM_PER_ROW,
  TEM_WIDTH_MM
} from '../lib/labels';
import { printLabels, type PrintKind } from '../lib/print-job';
import {
  countInfusions,
  countInjectables,
  infusionsInOrder,
  injectablesInOrder,
  isInfusionRoute,
  isInjectableRoute
} from '../lib/routes';
import { getServerOrigin } from '../settings';

const form = mustGet<HTMLFormElement>('lookup-form');
const codeInput = mustGet<HTMLInputElement>('code-input');
const hint = mustGet<HTMLParagraphElement>('hint');
const submitBtn = mustGet<HTMLButtonElement>('submit-btn');
const statusEl = mustGet<HTMLParagraphElement>('status');
const patientCard = mustGet<HTMLElement>('patient-card');
const patientDl = mustGet<HTMLDListElement>('patient-dl');
const ordersCard = mustGet<HTMLElement>('orders-card');
const ordersCount = mustGet<HTMLSpanElement>('orders-count');
const medsTotal = mustGet<HTMLSpanElement>('meds-total');
const ordersList = mustGet<HTMLDivElement>('orders-list');
const temDialog = mustGet<HTMLDialogElement>('tem-dialog');
const temDialogTitle = mustGet<HTMLHeadingElement>('tem-dialog-title');
const temDialogHint = mustGet<HTMLParagraphElement>('tem-dialog-hint');
const temDialogList = mustGet<HTMLDivElement>('tem-dialog-list');
const temPrintAllBtn = mustGet<HTMLButtonElement>('tem-print-all');
const serverOriginEl = mustGet<HTMLSpanElement>('server-origin');
const openSettingsBtn = mustGet<HTMLButtonElement>('open-settings');

const HINT_DEFAULT =
  'Tự nhận: 10 số YYMMDD+STT → mã hồ sơ; còn lại → mã bệnh án.';

type StatusKind = 'error' | 'ok' | null;

function orderLabel(order: TreatmentOrder): string {
  return order.toDieuTriId ? `Phiếu ${order.toDieuTriId}` : 'Không gắn phiếu';
}

function syncDetectHint(): void {
  const detected = detectCodeKind(codeInput.value);
  hint.textContent = detected.kind
    ? `Đang nhận là ${detected.label}: ${detected.code}`
    : HINT_DEFAULT;
}

function setStatus(message: string, kind: StatusKind): void {
  statusEl.hidden = !message;
  statusEl.textContent = message;
  statusEl.classList.remove('error', 'ok');
  if (kind) {
    statusEl.classList.add(kind);
  }
}

function printOrReport(
  patient: PatientInfo,
  meds: MedicationLine[],
  kind: PrintKind = 'injection'
): void {
  printLabels(patient, meds, kind).catch((error: unknown) => {
    if (temDialog.open) {
      temDialog.close();
    }
    setStatus(
      `Không mở được cửa sổ in: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    );
  });
}

function renderPatient(patient: PatientInfo): void {
  const rows: [string, string][] = [
    ['Họ tên', patient.tenNb],
    ['Tuổi', patient.tuoi != null ? String(patient.tuoi) : '—'],
    ['Giới tính', genderLabel(patient.gioiTinh)],
    ['Mã hồ sơ', patient.maHoSo],
    ['Mã NB', patient.maNb || '—'],
    ['Mã bệnh án', patient.maBenhAn || '—']
  ];

  patientDl.replaceChildren(
    ...rows.flatMap(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      return [dt, dd];
    })
  );
  patientCard.hidden = false;
}

function medRow(med: MedicationLine): HTMLTableRowElement {
  const tr = document.createElement('tr');
  if (isInjectableRoute(med.duongDung)) {
    tr.classList.add('row-injectable');
  } else if (isInfusionRoute(med.duongDung)) {
    tr.classList.add('row-infusion');
  }

  const cells = [
    med.tenThuoc || '—',
    med.lieuDung || '—',
    med.duongDung || '—',
    med.cachDung || '—',
    med.soLuong != null ? String(med.soLuong) : '—',
    med.dvt || '—',
    formatTime(med.thoiGianKe)
  ];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  return tr;
}

function buildRowCard(
  patient: PatientInfo,
  rowMeds: MedicationLine[],
  rowIndex: number
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'label-card';

  const header = document.createElement('header');
  header.className = 'label-card-header';

  const title = document.createElement('p');
  title.className = 'label-card-route';
  title.textContent = `Hàng ${rowIndex + 1} · ${rowMeds.length}/${TEM_PER_ROW} ô`;

  const printRowBtn = document.createElement('button');
  printRowBtn.type = 'button';
  printRowBtn.className = 'btn-print';
  printRowBtn.textContent = 'In hàng';
  printRowBtn.addEventListener('click', () => printOrReport(patient, rowMeds));

  header.append(title, printRowBtn);

  const slot = document.createElement('div');
  slot.className = 'row-preview-slot';
  slot.innerHTML = `<div class="row-preview-scale">${buildRowHtml(
    patient,
    rowMeds,
    { forPreview: true }
  )}</div>`;

  const reprints = document.createElement('div');
  reprints.className = 'row-card-reprints';
  for (const med of rowMeds) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-secondary btn-reprint';
    btn.textContent = `In riêng: ${med.tenThuoc || 'thuốc'}`;
    btn.title = 'In lại một tem — ô còn lại của hàng sẽ để trống';
    btn.addEventListener('click', () => printOrReport(patient, [med]));
    reprints.append(btn);
  }

  card.append(header, slot, reprints);
  return card;
}

function buildInfusionCard(
  patient: PatientInfo,
  med: MedicationLine,
  rowIndex: number
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'label-card';

  const header = document.createElement('header');
  header.className = 'label-card-header';

  const title = document.createElement('p');
  title.className = 'label-card-route';
  title.textContent = `Hàng ${rowIndex + 1} · 2/2 ô · ${med.tenThuoc || 'thuốc'}`;

  const printRowBtn = document.createElement('button');
  printRowBtn.type = 'button';
  printRowBtn.className = 'btn-print';
  printRowBtn.textContent = 'In hàng';
  printRowBtn.addEventListener('click', () =>
    printOrReport(patient, [med], 'infusion')
  );

  header.append(title, printRowBtn);

  const slot = document.createElement('div');
  slot.className = 'row-preview-slot';
  slot.innerHTML = `<div class="row-preview-scale">${buildInfusionRowHtml(
    patient,
    med,
    new Date()
  )}</div>`;

  const reprints = document.createElement('div');
  reprints.className = 'row-card-reprints';
  const reprint = document.createElement('button');
  reprint.type = 'button';
  reprint.className = 'btn-secondary btn-reprint';
  reprint.textContent = `In riêng: ${med.tenThuoc || 'thuốc'}`;
  reprint.title = 'In lại cả cặp tem 1/2 và 2/2 của thuốc này';
  reprint.addEventListener('click', () =>
    printOrReport(patient, [med], 'infusion')
  );
  reprints.append(reprint);

  card.append(header, slot, reprints);
  return card;
}

function openTemDialog(
  patient: PatientInfo,
  order: TreatmentOrder,
  kind: PrintKind
): void {
  if (kind === 'infusion') {
    const meds = infusionsInOrder(order);
    temDialogTitle.textContent = `${orderLabel(order)} — tem truyền`;
    temDialogHint.textContent =
      meds.length === 0
        ? 'Phiếu này không có thuốc truyền (đường dùng chứa «truyền»).'
        : `${meds.length} hàng giấy · mỗi hàng 2 ô ${TEM_WIDTH_MM}×${TEM_HEIGHT_MM} mm (bệnh nhân 1/2, thuốc 2/2).`;
    temPrintAllBtn.hidden = meds.length === 0;
    temPrintAllBtn.textContent = `In cả phiếu (${meds.length} hàng)`;
    temPrintAllBtn.onclick = () => printOrReport(patient, meds, 'infusion');
    temDialogList.replaceChildren(
      ...meds.map((med, rowIndex) => buildInfusionCard(patient, med, rowIndex))
    );
    temDialog.showModal();
    return;
  }

  const meds = injectablesInOrder(order);
  const rows = chunkIntoRows(meds);

  temDialogTitle.textContent = `${orderLabel(order)} — tem tiêm`;
  temDialogHint.textContent =
    meds.length === 0
      ? 'Phiếu này không có thuốc tiêm thuần (đường dùng bắt đầu «Tiêm», không chứa «truyền»).'
      : `${meds.length} tem · ${rows.length} hàng giấy (${TEM_PER_ROW} ô ${TEM_WIDTH_MM}×${TEM_HEIGHT_MM} mm mỗi hàng).`;

  temPrintAllBtn.hidden = meds.length === 0;
  temPrintAllBtn.textContent = `In cả phiếu (${meds.length} tem)`;
  temPrintAllBtn.onclick = () => printOrReport(patient, meds, 'injection');

  temDialogList.replaceChildren(
    ...rows.map((rowMeds, rowIndex) => buildRowCard(patient, rowMeds, rowIndex))
  );
  temDialog.showModal();
}

function buildOrderBlock(
  order: TreatmentOrder,
  patient: PatientInfo
): HTMLElement {
  const injectables = injectablesInOrder(order);
  const infusions = infusionsInOrder(order);
  const block = document.createElement('article');
  block.className = 'order-block';

  const header = document.createElement('header');
  header.className = 'order-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'order-title-row';

  const titleBlock = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = orderLabel(order);

  const meta = document.createElement('p');
  meta.className = 'order-meta';
  const injNote =
    injectables.length > 0
      ? ` · ${injectables.length} thuốc tiêm`
      : ' · không có thuốc tiêm';
  const infNote =
    infusions.length > 0
      ? ` · ${infusions.length} thuốc truyền`
      : ' · không có thuốc truyền';
  meta.textContent = `Kê: ${formatTime(order.thoiGianKe)} · ${order.medicationCount} dòng${injNote}${infNote}`;
  titleBlock.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'order-print-actions';

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'btn-print';
  printBtn.textContent =
    injectables.length > 0
      ? `In tem tiêm (${injectables.length})`
      : 'In tem tiêm';
  printBtn.disabled = injectables.length === 0;
  printBtn.title =
    injectables.length === 0
      ? 'Phiếu không có thuốc tiêm thuần'
      : 'Mở tem thuốc tiêm của phiếu này';
  printBtn.addEventListener('click', () =>
    openTemDialog(patient, order, 'injection')
  );

  const infusionBtn = document.createElement('button');
  infusionBtn.type = 'button';
  infusionBtn.className = 'btn-print';
  infusionBtn.textContent =
    infusions.length > 0
      ? `In tem truyền (${infusions.length})`
      : 'In tem truyền';
  infusionBtn.disabled = infusions.length === 0;
  infusionBtn.title =
    infusions.length === 0
      ? 'Phiếu không có thuốc truyền'
      : 'Mở tem thuốc truyền của phiếu này';
  infusionBtn.addEventListener('click', () =>
    openTemDialog(patient, order, 'infusion')
  );

  actions.append(printBtn, infusionBtn);
  titleRow.append(titleBlock, actions);
  header.append(titleRow);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Tên thuốc</th>
      <th>Liều dùng</th>
      <th>Đường dùng</th>
      <th>Cách dùng</th>
      <th>SL</th>
      <th>ĐVT</th>
      <th>Thời gian kê</th>
    </tr>
  `;
  const tbody = document.createElement('tbody');
  tbody.append(...order.medications.map((med) => medRow(med)));
  table.append(thead, tbody);
  wrap.append(table);

  block.append(header, wrap);
  return block;
}

function renderOrders(orders: TreatmentOrder[], patient: PatientInfo): void {
  const totalLines = orders.reduce(
    (sum, order) => sum + order.medicationCount,
    0
  );
  ordersCount.textContent = `${orders.length} phiếu`;
  medsTotal.textContent = `${totalLines} dòng`;
  ordersList.replaceChildren(
    ...orders.map((order) => buildOrderBlock(order, patient))
  );
  ordersCard.hidden = false;
}

function clearResults(): void {
  patientCard.hidden = true;
  ordersCard.hidden = true;
  patientDl.replaceChildren();
  ordersList.replaceChildren();
  if (temDialog.open) {
    temDialog.close();
  }
  temDialogList.replaceChildren();
}

function summarize(body: LookupSuccessResponse, label: string): string {
  const matchNote =
    body.matchCount > 1
      ? ` · ${body.matchCount} đợt trùng mã, đã lấy đợt mới nhất`
      : '';
  return `OK (${label}) — ${body.orderCount} phiếu / ${body.medicationCount} dòng · ${countInjectables(body.orders)} tem tiêm · ${countInfusions(body.orders)} tem truyền${matchNote}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const detected = detectCodeKind(codeInput.value);
  if (!detected.kind) {
    setStatus('Nhập mã hồ sơ hoặc mã bệnh án.', 'error');
    return;
  }

  clearResults();
  setStatus(`Đang tra cứu (${detected.label})…`, null);
  submitBtn.disabled = true;

  try {
    const body = await fetchLookup(
      await getServerOrigin(),
      detected.kind,
      detected.code
    );
    renderPatient(body.patient);
    renderOrders(body.orders, body.patient);
    setStatus(summarize(body, detected.label), 'ok');
  } catch (error) {
    const message =
      error instanceof LookupApiError
        ? error.message
        : `Lỗi không xác định: ${error instanceof Error ? error.message : String(error)}`;
    setStatus(message, 'error');
  } finally {
    submitBtn.disabled = false;
    codeInput.select();
  }
});

codeInput.addEventListener('input', syncDetectHint);
openSettingsBtn.addEventListener('click', () => {
  void chrome.runtime.openOptionsPage();
});
chrome.storage.onChanged.addListener(() => {
  void showServerOrigin();
});

async function showServerOrigin(): Promise<void> {
  serverOriginEl.textContent = await getServerOrigin();
}

syncDetectHint();
void showServerOrigin();
