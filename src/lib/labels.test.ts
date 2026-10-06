import assert from 'node:assert/strict';
import test from 'node:test';
import type { MedicationLine, PatientInfo } from '../contracts/lookup.v1';
import {
  buildInfusionPrintDocument,
  buildInfusionRowHtml,
  buildLabelInnerHtml,
  buildPrintDocument,
  buildRowHtml,
  chunkIntoRows,
  formatPrintDate,
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

test('prints age and medical record number in bold', () => {
  const html = buildLabelInnerHtml(patient, med('Omeprazole'));
  assert.match(
    html,
    /Tuổi: <span class="inj-label-v">7<\/span>/
  );
  assert.match(
    html,
    /Mã BA: <span class="inj-label-v">BA01<\/span>/
  );
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

test('appends accompanying drugs to the drug name, comma-separated', () => {
  const html = buildLabelInnerHtml(patient, {
    ...med('Omeprazole'),
    thuocDungKem: [
      { hisServiceProductId: '1', tenThuoc: 'Natri Clorid 0,9%' },
      { hisServiceProductId: '2', tenThuoc: 'Glucose 5%' }
    ]
  });
  assert.doesNotMatch(html, /Thuốc pha:/);
  assert.match(
    html,
    /Tên thuốc:<\/span>\s*<span class="inj-label-v">Omeprazole, Natri Clorid 0,9%, Glucose 5%<\/span>/
  );
});

test('leaves the SL line blank for handwritten quantity', () => {
  const html = buildLabelInnerHtml(patient, {
    ...med('Omeprazole'),
    soLuong: 2,
    dvt: 'Ống'
  });
  assert.match(html, /SL:<\/span>\s*<span class="inj-label-v"><\/span>/);
  assert.doesNotMatch(html, /2 Ống/);
});

test('escapes accompanying drug names on the drug line', () => {
  const html = buildLabelInnerHtml(patient, {
    ...med('Omeprazole'),
    thuocDungKem: [{ hisServiceProductId: '1', tenThuoc: 'A&B <x>' }]
  });
  assert.match(html, /Omeprazole, A&amp;B &lt;x&gt;/);
  assert.doesNotMatch(html, /<x>/);
});

test('prints one page per roll row', () => {
  const doc = buildPrintDocument(patient, [med('A'), med('B'), med('C')]);
  assert.equal((doc.match(/class="tem-row"/g) ?? []).length, 2);
  assert.match(doc, /@page \{ size: 104mm 22mm; margin: 0; \}/);
  assert.match(doc, /transform: translateX\(-1\.5mm\);/);
});

const printedAt = new Date(2026, 5, 22, 9, 5);

test('formats the mix date as dd/MM/yyyy without a clock time', () => {
  assert.equal(formatPrintDate(printedAt), '22/06/2026');
});

test('prints one infusion as a 5.5×6 cm three-part sticker', () => {
  const html = buildInfusionRowHtml(
    patient,
    {
      ...med('Axuka 1000mg+200mg'),
      lieuDung: 'pha truyền 30g/p',
      thuocDungKem: [
        { hisServiceProductId: 'k', tenThuoc: 'Natri clorid 0,9g/100ml' }
      ]
    },
    printedAt
  );
  assert.match(html, /class="inf-page"/);
  assert.match(html, /Nhãn túi\/ chai dịch truyền, BTĐ/);
  assert.match(html, /Tên:<\/span>\s*<span class="inj-label-v">Trần &lt;Thị&gt; B<\/span>/);
  assert.match(
    html,
    /Tuổi: <span class="inj-label-v">7<\/span>[\s\S]*Mã BA: <span class="inj-label-v">BA01<\/span>/
  );
  assert.match(
    html,
    /Thuốc, dung môi:<\/span>\s*<span class="inj-label-v">Axuka 1000mg\+200mg, Natri clorid 0,9g\/100ml<\/span>/
  );
  assert.match(html, /SL:<\/span>\s*<span class="inj-label-v"><\/span>/);
  assert.match(html, /Tốc độ:[\s\S]*pha truyền 30g\/p/);
  assert.match(html, /Giờ pha:[\s\S]*inf-label-time-gap[\s\S]*22\/06\/2026/);
  assert.doesNotMatch(html, /09:05/);
  assert.match(
    html,
    /Điều dưỡng:<\/span>\s*<span class="inj-label-v"><\/span>/
  );
  assert.doesNotMatch(html, /1\/2|2\/2|Thuốc pha:|Năm sinh:/);
});

test('keeps solvent blank and escapes HIS text on infusion labels', () => {
  const html = buildInfusionRowHtml(
    { ...patient, tenNb: 'A&B <x>' },
    { ...med('NaCl <5%>'), lieuDung: '40g/p & chậm' },
    printedAt
  );
  assert.match(
    html,
    /Thuốc, dung môi:<\/span>\s*<span class="inj-label-v">NaCl &lt;5%&gt;<\/span>/
  );
  assert.match(html, /A&amp;B &lt;x&gt;/);
  assert.match(html, /40g\/p &amp; chậm/);
  assert.doesNotMatch(html, /<x>|<5%>/);
});

test('prints one page per infusion on 55×60 mm media', () => {
  const doc = buildInfusionPrintDocument(
    patient,
    [med('A'), med('B')],
    printedAt
  );
  assert.equal((doc.match(/class="inf-page"/g) ?? []).length, 2);
  assert.match(doc, /@page \{ size: 55mm 60mm; margin: 0; \}/);
  assert.match(doc, /min-width: 15mm/);
});
