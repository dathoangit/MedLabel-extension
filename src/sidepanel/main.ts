import type {
  LookupSuccessResponse,
  MedicationLine,
  PatientInfo,
  TreatmentOrder
} from '../contracts/lookup.v1';
import { fetchLookup, LookupApiError } from '../lib/api';
import { detectCodeKind } from '../lib/code-kind';
import { buildDemoLookup, isDemoLookupCode } from '../lib/demo-lookup';
import { mustGet } from '../lib/dom';
import { formatTime, genderLabel } from '../lib/format';
import {
  buildInfusionRowHtml,
  buildRowHtml,
  chunkIntoRows,
  TEM_PER_ROW
} from '../lib/labels';
import { printAllLabels, printLabels, type PrintKind } from '../lib/print-job';
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
const demoBtn = mustGet<HTMLButtonElement>('demo-btn');
const statusEl = mustGet<HTMLParagraphElement>('status');
const patientCard = mustGet<HTMLElement>('patient-card');
const patientDl = mustGet<HTMLDListElement>('patient-dl');
const ordersCard = mustGet<HTMLElement>('orders-card');
const ordersCount = mustGet<HTMLSpanElement>('orders-count');
const ordersList = mustGet<HTMLDivElement>('orders-list');
const temDialog = mustGet<HTMLDialogElement>('tem-dialog');
const temDialogTitle = mustGet<HTMLHeadingElement>('tem-dialog-title');
const temDialogList = mustGet<HTMLDivElement>('tem-dialog-list');
const temPrintAllBtn = mustGet<HTMLButtonElement>('tem-print-all');
const serverOriginEl = mustGet<HTMLSpanElement>('server-origin');
const openSettingsBtn = mustGet<HTMLButtonElement>('open-settings');

const HINT_DEFAULT =
  'Tự nhận: 10 số YYMMDD+STT → mã hồ sơ; còn lại → mã bệnh án. Gõ demo để xem dữ liệu mẫu.';

type StatusKind = 'error' | 'ok' | null;

function orderLabel(order: TreatmentOrder): string {
  return order.toDieuTriId ? `Phiếu ${order.toDieuTriId}` : 'Không gắn phiếu';
}

function syncDetectHint(): void {
  if (isDemoLookupCode(codeInput.value)) {
    hint.textContent = 'Đang nhận là dữ liệu mẫu (không gọi server).';
    return;
  }
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

function reportPrintError(error: unknown): void {
  if (temDialog.open) {
    temDialog.close();
  }
  setStatus(
    `Không mở được cửa sổ in: ${error instanceof Error ? error.message : String(error)}`,
    'error'
  );
}

function printOrReport(
  patient: PatientInfo,
  meds: MedicationLine[],
  kind: PrintKind = 'injection',
  infusionPairStart?: number
): void {
  printLabels(patient, meds, kind, infusionPairStart).catch(reportPrintError);
}

function printAllOrReport(
  patient: PatientInfo,
  injectables: MedicationLine[],
  infusions: MedicationLine[]
): void {
  printAllLabels(patient, [
    { kind: 'injection', meds: injectables },
    { kind: 'infusion', meds: infusions }
  ]).catch(reportPrintError);
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

function setMarquee(host: HTMLElement, text: string): void {
  host.classList.add('marquee');
  const textEl = document.createElement('span');
  textEl.className = 'marquee-text';
  textEl.textContent = text;
  host.append(textEl);

  host.addEventListener('mouseenter', () => {
    const shift = textEl.scrollWidth - textEl.clientWidth;
    if (shift <= 1) {
      return;
    }
    textEl.style.setProperty('--marquee-shift', `${shift}px`);
    // ~20 px/s — slow enough to read a long drug name in one pass.
    textEl.style.setProperty(
      '--marquee-duration',
      `${Math.min(24, Math.max(5, shift / 20))}s`
    );
    // Retrigger if the user hovers again after a finished pass.
    textEl.classList.remove('is-scrolling');
    void textEl.offsetWidth;
    textEl.classList.add('is-scrolling');
  });
  host.addEventListener('mouseleave', () => {
    textEl.classList.remove('is-scrolling');
  });
}

function buildRowCard(
  patient: PatientInfo,
  rowMeds: MedicationLine[],
): HTMLElement {
  const card = document.createElement('article');
  card.className = 'label-card';

  const header = document.createElement('header');
  header.className = 'label-card-header';

  const title = document.createElement('p');
  title.className = 'label-card-route';
  setMarquee(
    title,
    ` ${rowMeds.length}/${TEM_PER_ROW} ô`
  );

  const printRowBtn = document.createElement('button');
  printRowBtn.type = 'button';
  printRowBtn.className = 'btn-print';
  printRowBtn.textContent = 'In tem';
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
    setMarquee(btn, `In riêng: ${med.tenThuoc || 'thuốc'}`);
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
  const pairNo = rowIndex + 1;

  const header = document.createElement('header');
  header.className = 'label-card-header';

  const title = document.createElement('p');
  title.className = 'label-card-route';
  setMarquee(
    title,
    `2/2 ô · ${med.tenThuoc || 'thuốc'}`
  );

  const printRowBtn = document.createElement('button');
  printRowBtn.type = 'button';
  printRowBtn.className = 'btn-print';
  printRowBtn.textContent = 'In tem';
  printRowBtn.addEventListener('click', () =>
    printOrReport(patient, [med], 'infusion', pairNo)
  );

  header.append(title, printRowBtn);

  const slot = document.createElement('div');
  slot.className = 'row-preview-slot';
  slot.innerHTML = `<div class="row-preview-scale">${buildInfusionRowHtml(
    patient,
    med,
    new Date(),
    pairNo
  )}</div>`;

  const reprints = document.createElement('div');
  reprints.className = 'row-card-reprints';
  const reprint = document.createElement('button');
  reprint.type = 'button';
  reprint.className = 'btn-secondary btn-reprint';
  setMarquee(reprint, `In riêng: ${med.tenThuoc || 'thuốc'}`);
  reprint.title = 'In lại cả cặp tem 1/2 và 2/2 của thuốc này';
  reprint.addEventListener('click', () =>
    printOrReport(patient, [med], 'infusion', pairNo)
  );
  reprints.append(reprint);

  card.append(header, slot, reprints);
  return card;
}

function buildKindSection(
  title: string,
  printLabel: string | null,
  onPrint: (() => void) | null,
  cards: HTMLElement[]
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'label-kind';

  const header = document.createElement('header');
  header.className = 'label-kind-header';

  const heading = document.createElement('h3');
  heading.textContent = title;
  header.append(heading);

  if (printLabel && onPrint) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-secondary';
    button.textContent = printLabel;
    button.addEventListener('click', onPrint);
    header.append(button);
  }

  section.append(header, ...cards);
  return section;
}

function openTemDialog(patient: PatientInfo, order: TreatmentOrder): void {
  const injectables = injectablesInOrder(order);
  const infusions = infusionsInOrder(order);
  const rows = chunkIntoRows(injectables);
  const total = injectables.length + infusions.length;
  const bothKinds = injectables.length > 0 && infusions.length > 0;

  temDialogTitle.textContent = `${orderLabel(order)} — tem thuốc`;

  temPrintAllBtn.hidden = total === 0;
  temPrintAllBtn.textContent = bothKinds
    ? `In tất cả (${total})`
    : `In cả phiếu (${total})`;
  temPrintAllBtn.onclick = () =>
    printAllOrReport(patient, injectables, infusions);

  const sections: HTMLElement[] = [];
  if (injectables.length > 0) {
    sections.push(
      buildKindSection(
        `Tem tiêm (${injectables.length})`,
        bothKinds ? 'Chỉ in tem tiêm' : null,
        bothKinds
          ? () => printOrReport(patient, injectables, 'injection')
          : null,
        rows.map((rowMeds) =>
          buildRowCard(patient, rowMeds)
        )
      )
    );
  }
  if (infusions.length > 0) {
    sections.push(
      buildKindSection(
        `Tem truyền (${infusions.length})`,
        bothKinds ? 'Chỉ in tem truyền' : null,
        bothKinds ? () => printOrReport(patient, infusions, 'infusion') : null,
        infusions.map((med, rowIndex) =>
          buildInfusionCard(patient, med, rowIndex)
        )
      )
    );
  }

  temDialogList.replaceChildren(...sections);
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
    injectables.length > 0 ? ` · ${injectables.length} thuốc tiêm` : '';
  const infNote =
    infusions.length > 0 ? ` · ${infusions.length} thuốc truyền` : '';
  meta.textContent = `Kê: ${formatTime(order.thoiGianKe)}${injNote}${infNote}`;
  titleBlock.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'order-print-actions';

  const printable = injectables.length + infusions.length;
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'btn-print';
  printBtn.textContent = printable > 0 ? `In tem (${printable})` : 'In tem';
  printBtn.disabled = printable === 0;
  printBtn.title =
    printable === 0
      ? 'Phiếu không có thuốc tiêm hoặc truyền'
      : 'In tất cả, hoặc chọn riêng tem tiêm / tem truyền';
  printBtn.addEventListener('click', () => openTemDialog(patient, order));

  actions.append(printBtn);
  titleRow.append(titleBlock, actions);
  header.append(titleRow);

  const printableMeds = [...injectables, ...infusions];
  if (printableMeds.length > 0) {
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
    tbody.append(...printableMeds.map((med) => medRow(med)));
    table.append(thead, tbody);
    wrap.append(table);
    block.append(header, wrap);
  } else {
    block.append(header);
  }
  return block;
}

function renderOrders(orders: TreatmentOrder[], patient: PatientInfo): void {
  const printableOrders = orders.filter(
    (order) =>
      injectablesInOrder(order).length + infusionsInOrder(order).length > 0
  );

  ordersCount.textContent = `${printableOrders.length} phiếu`;
  ordersList.replaceChildren(
    ...printableOrders.map((order) => buildOrderBlock(order, patient))
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

function showLookup(body: LookupSuccessResponse, label: string): void {
  renderPatient(body.patient);
  renderOrders(body.orders, body.patient);
  setStatus(summarize(body, label), 'ok');
}

function loadDemoLookup(): void {
  codeInput.value = 'demo';
  syncDetectHint();
  clearResults();
  showLookup(buildDemoLookup(), 'dữ liệu mẫu');
  codeInput.select();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isDemoLookupCode(codeInput.value)) {
    loadDemoLookup();
    return;
  }

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
    showLookup(body, detected.label);
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

demoBtn.addEventListener('click', () => {
  loadDemoLookup();
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
