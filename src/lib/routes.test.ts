import assert from 'node:assert/strict';
import test from 'node:test';
import type { MedicationLine, TreatmentOrder } from '../contracts/lookup.v1';
import {
  countInfusions,
  countInjectables,
  infusionsInOrder,
  injectablesInOrder,
  isInfusionRoute,
  isInjectableRoute
} from './routes';

test('accepts plain injection routes', () => {
  assert.equal(isInjectableRoute('Tiêm tĩnh mạch'), true);
  assert.equal(isInjectableRoute('tiêm bắp'), true);
  assert.equal(isInjectableRoute('  Tiêm dưới da '), true);
});

test('rejects infusions, oral routes and missing routes', () => {
  assert.equal(isInjectableRoute('Tiêm truyền tĩnh mạch'), false);
  assert.equal(isInjectableRoute('Uống'), false);
  assert.equal(isInjectableRoute('Truyền tĩnh mạch'), false);
  assert.equal(isInjectableRoute(null), false);
  assert.equal(isInjectableRoute(''), false);
});

function med(duongDung: string | null): MedicationLine {
  return {
    hisServiceProductId: duongDung ?? 'none',
    tenThuoc: 'X',
    lieuDung: null,
    cachDung: null,
    duongDung,
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

function order(routes: (string | null)[]): TreatmentOrder {
  const medications = routes.map(med);
  return {
    toDieuTriId: '1',
    thoiGianKe: null,
    medicationCount: medications.length,
    medications
  };
}

test('keeps only injectable lines of an order', () => {
  const picked = injectablesInOrder(
    order(['Tiêm bắp', 'Uống', 'Tiêm truyền', 'Tiêm tĩnh mạch'])
  );
  assert.deepEqual(
    picked.map((line) => line.duongDung),
    ['Tiêm bắp', 'Tiêm tĩnh mạch']
  );
});

test('drops accompanying drugs even when their route is injectable', () => {
  const solvent = { ...med('Tiêm tĩnh mạch'), laThuocDungKem: true };
  const picked = injectablesInOrder(order(['Tiêm bắp']));
  const withSolvent = injectablesInOrder({
    toDieuTriId: '1',
    thoiGianKe: null,
    medicationCount: 2,
    medications: [...order(['Tiêm bắp']).medications, solvent]
  });
  assert.equal(picked.length, 1);
  assert.equal(withSolvent.length, 1);
  assert.equal(withSolvent[0]?.laThuocDungKem, false);
});

test('counts injectables across orders', () => {
  assert.equal(
    countInjectables([order(['Tiêm bắp', 'Uống']), order(['Tiêm bắp'])]),
    2
  );
});

test('accepts every route whose name contains truyền', () => {
  assert.equal(isInfusionRoute('Truyền tĩnh mạch'), true);
  assert.equal(isInfusionRoute('Tiêm truyền'), true);
  assert.equal(isInfusionRoute('  Tiêm truyền tĩnh mạch '), true);
  assert.equal(isInfusionRoute('Tiêm tĩnh mạch'), false);
  assert.equal(isInfusionRoute('Uống'), false);
  assert.equal(isInfusionRoute(null), false);
  assert.equal(isInfusionRoute(''), false);
});

test('injection and infusion filters do not overlap', () => {
  for (const route of [
    'Tiêm bắp',
    'Tiêm tĩnh mạch',
    'Truyền tĩnh mạch',
    'Tiêm truyền',
    'Uống'
  ]) {
    assert.equal(isInjectableRoute(route) && isInfusionRoute(route), false);
  }
});

test('keeps infusion lines and drops accompanying solvents', () => {
  const solvent = { ...med('Truyền tĩnh mạch'), laThuocDungKem: true };
  const picked = infusionsInOrder({
    toDieuTriId: '1',
    thoiGianKe: null,
    medicationCount: 3,
    medications: [
      ...order(['Truyền tĩnh mạch', 'Tiêm bắp']).medications,
      solvent
    ]
  });
  assert.deepEqual(
    picked.map((line) => line.duongDung),
    ['Truyền tĩnh mạch']
  );
  assert.equal(picked[0]?.laThuocDungKem, false);
});

test('counts infusions across orders', () => {
  assert.equal(
    countInfusions([
      order(['Truyền tĩnh mạch', 'Tiêm truyền']),
      order(['Tiêm bắp'])
    ]),
    2
  );
});
