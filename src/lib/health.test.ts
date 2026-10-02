import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOKUP_API_VERSION } from '../contracts/lookup.v1';
import { interpretHealth } from './health';

const healthy = {
  ok: true,
  apiVersion: LOOKUP_API_VERSION,
  service: 'medlabel',
  db: 'up'
};

test('accepts a healthy MedLabel server', () => {
  assert.deepEqual(interpretHealth(200, healthy), { ok: true });
});

test('flags a server that is not MedLabel', () => {
  const result = interpretHealth(200, { status: 'ok' });
  assert.equal(result.ok, false);
});

test('flags an API version mismatch', () => {
  const result = interpretHealth(200, { ...healthy, apiVersion: 2 });
  assert.equal(result.ok, false);
});

test('flags a server that cannot reach the HIS database', () => {
  const result = interpretHealth(503, { ...healthy, ok: false, db: 'down' });
  assert.equal(result.ok, false);
});
