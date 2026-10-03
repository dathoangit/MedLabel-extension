import assert from 'node:assert/strict';
import test from 'node:test';
import type { MedicationLine, PatientInfo } from '../contracts/lookup.v1';
import {
  buildInfusionPrintDocument,
  buildInfusionRowHtml,
  buildLabelInnerHtml,
  buildPrintDocument,
  buildRowHtml,
  buildSectionRowsHtml,
  chunkIntoRows,
  formatPrintClock,
  TEM_PER_ROW
} from './labels';

const patient: PatientInfo = {
  hisPatienthistoryId: '1',
  maHoSo: '2609230012',
  maNb: null,
  maBenhAn: 'BA01',
  tenNb: 'Trần <Thị> B',
  tuoi: 7,
  ngaySinh: null,
  gioiTinh: 'F'
};

function med(tenThuoc: string): MedicationLine {
  return {
    hisServiceProductId: tenThuoc,
    tenThuoc,
    lieuDung: null,
    cachDung: null,
    duongDung: 'Tiêm bắp',
    thoiGianKe: null,
    thoiGianThucHien: null,
    soLuong: null,
    dvt: null,
    tocDoTruyen: null,
    donViTocDo: null,
    laThuocDungKem: false,
    thuocDungKem: []
  };
}

test('splits labels into rows of two', () => {
  assert.equal(TEM_PER_ROW, 2);
  assert.deepEqual(chunkIntoRows([1, 2, 3]), [[1, 2], [3]]);
  assert.deepEqual(chunkIntoRows([]), []);
});

test('escapes HIS text so it cannot inject markup into the label', () => {
  const html = buildLabelInnerHtml(patient, med('A&B "x"'));
  assert.match(html, /Trần &lt;Thị&gt; B/);
  assert.match(html, /A&amp;B &quot;x&quot;/);
  assert.doesNotMatch(html, /<Thị>/);
});

test('leaves the odd slot of a row blank when printing', () => {
  const html = buildRowHtml(patient, [med('A')]);
  assert.equal((html.match(/class="tem-slot/g) ?? []).length, 2);
  assert.doesNotMatch(html, /ô trống/);
  assert.match(
    buildRowHtml(patient, [med('A')], { forPreview: true }),
    /ô trống/
  );
});

test('prints accompanying drug names on the mix line', () => {
  const html = buildLabelInnerHtml(patient, {
    ...med('Omeprazole'),
    thuocDungKem: [
      { hisServiceProductId: '1', tenThuoc: 'Natri Clorid 0,9%' },
      { hisServiceProductId: '2', tenThuoc: 'Glucose 5%' }
    ]
  });
  assert.match(html, /Thuốc pha:/);
  assert.match(html, /Natri Clorid 0,9% \+ Glucose 5%/);
});

test('keeps the mix label blank when there is no accompanying drug', () => {
  const html = buildLabelInnerHtml(patient, med('Omeprazole'));
  assert.match(html, /Thuốc pha:<\/span>\s*<span class="inj-label-v"><\/span>/);
});

test('escapes accompanying drug names', () => {
  const html = buildLabelInnerHtml(patient, {
    ...med('Omeprazole'),
    thuocDungKem: [{ hisServiceProductId: '1', tenThuoc: 'A&B <x>' }]
  });
  assert.match(html, /A&amp;B &lt;x&gt;/);
  assert.doesNotMatch(html, /<x>/);
});

test('prints one page per roll row', () => {
  const doc = buildPrintDocument(patient, [med('A'), med('B'), med('C')]);
  assert.equal((doc.match(/class="tem-row"/g) ?? []).length, 2);
  assert.match(doc, /@page \{ size: 104mm 22mm; margin: 0; \}/);
});

const printedAt = new Date(2026, 5, 22, 9, 5);

test('formats the print clock as HH:mm dd/MM/yyyy', () => {
  assert.equal(formatPrintClock(printedAt), '09:05 22/06/2026');
});

test('prints one infusion as a paired 1/2 and 2/2 row', () => {
  const html = buildInfusionRowHtml(
    { ...patient, ngaySinh: '1958-03-04T00:00:00.000Z' },
    {
      ...med('Axuka 1000mg+200mg'),
      lieuDung: 'pha truyền 30g/p',
      thuocDungKem: [
        { hisServiceProductId: 'k', tenThuoc: 'Natri clorid 0,9g/100ml' }
      ]
    },
    printedAt,
    3
  );
  assert.equal((html.match(/class="tem-slot/g) ?? []).length, 2);
  assert.match(html, /Tên NB:/);
  assert.match(html, /Năm sinh:[\s\S]*1958/);
  assert.match(
    html,
    /Điều dưỡng:<\/span>\s*<span class="inj-label-v"><\/span>/
  );
  assert.match(html, /09:05 22\/06\/2026/);
  assert.match(html, /Mã BA: BA01 - 1\/2/);
  assert.match(html, /Mã BA: BA01 - 2\/2/);
  assert.equal((html.match(/class="inf-label-pair">3</g) ?? []).length, 2);
  assert.match(html, /Thuốc pha:[\s\S]*Natri clorid 0,9g\/100ml/);
  assert.match(html, /Tốc độ:[\s\S]*pha truyền 30g\/p/);
  assert.doesNotMatch(html, /ô trống/);
});

test('keeps the infusion mix line blank and escapes HIS text', () => {
  const html = buildInfusionRowHtml(
    { ...patient, tenNb: 'A&B <x>', ngaySinh: null },
    { ...med('NaCl <5%>'), lieuDung: '40g/p & chậm' },
    printedAt,
    1
  );
  assert.match(html, /Thuốc pha:<\/span>\s*<span class="inj-label-v"><\/span>/);
  assert.match(html, /Năm sinh:<\/span>\s*<span class="inj-label-v"><\/span>/);
  assert.match(html, /A&amp;B &lt;x&gt;/);
  assert.match(html, /NaCl &lt;5%&gt;/);
  assert.match(html, /40g\/p &amp; chậm/);
  assert.doesNotMatch(html, /<x>|<5%>/);
});

test('prints injection rows before infusion rows in one job', () => {
  const html = buildSectionRowsHtml(
    patient,
    [
      { kind: 'injection', meds: [med('Tiêm A')] },
      { kind: 'infusion', meds: [] },
      { kind: 'infusion', meds: [med('Truyền B')] }
    ],
    printedAt
  );
  const injectionAt = html.indexOf('Tiêm A');
  const infusionAt = html.indexOf('Truyền B');
  assert.ok(injectionAt >= 0 && infusionAt > injectionAt);
  assert.equal((html.match(/class="tem-row"/g) ?? []).length, 2);
  assert.match(html, /class="inj-label"/);
  assert.match(html, /class="inf-label"/);
});

test('prints one page per infusion', () => {
  const doc = buildInfusionPrintDocument(
    patient,
    [med('A'), med('B')],
    printedAt
  );
  assert.equal((doc.match(/class="tem-row"/g) ?? []).length, 2);
  assert.equal((doc.match(/- 1\/2/g) ?? []).length, 2);
  assert.equal((doc.match(/- 2\/2/g) ?? []).length, 2);
  assert.equal((doc.match(/class="inf-label-pair">1</g) ?? []).length, 2);
  assert.equal((doc.match(/class="inf-label-pair">2</g) ?? []).length, 2);
});
