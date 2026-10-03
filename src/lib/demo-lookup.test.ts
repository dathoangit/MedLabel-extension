import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOKUP_API_VERSION } from '../contracts/lookup.v1';
import {
  buildDemoLookup,
  DEMO_LOOKUP_CODE,
  isDemoLookupCode
} from './demo-lookup';
import {
  countInfusions,
  countInjectables,
  infusionsInOrder,
  injectablesInOrder
} from './routes';

test('recognises the demo code case-insensitively', () => {
  assert.equal(DEMO_LOOKUP_CODE, 'demo');
  assert.equal(isDemoLookupCode('demo'), true);
  assert.equal(isDemoLookupCode(' DEMO '), true);
  assert.equal(isDemoLookupCode('2609230012'), false);
});

test('demo payload is a valid v1 lookup with both label kinds', () => {
  const body = buildDemoLookup();
  assert.equal(body.apiVersion, LOOKUP_API_VERSION);
  assert.ok(body.patient.tenNb);
  assert.ok(body.orders.length >= 2);
  assert.equal(countInjectables(body.orders), 3);
  assert.equal(countInfusions(body.orders), 3);

  const first = body.orders[0];
  assert.ok(first);
  assert.equal(injectablesInOrder(first).length, 3);
  assert.equal(infusionsInOrder(first).length, 1);
  assert.ok(
    first.medications.some((med) => med.duongDung === 'Uống'),
    'includes an oral line that must not print'
  );
});
