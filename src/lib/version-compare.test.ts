import assert from 'node:assert/strict';
import test from 'node:test';
import { isNewerVersion } from './version-compare';

test('detects a higher patch, minor, or major', () => {
  assert.equal(isNewerVersion('0.1.3', '0.1.2'), true);
  assert.equal(isNewerVersion('0.2.0', '0.1.9'), true);
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true);
});

test('rejects equal, older, or invalid versions', () => {
  assert.equal(isNewerVersion('0.1.2', '0.1.2'), false);
  assert.equal(isNewerVersion('0.1.1', '0.1.2'), false);
  assert.equal(isNewerVersion('0.1.10', '0.1.9'), true);
  assert.equal(isNewerVersion('0.1.0-beta', '0.1.0'), false);
  assert.equal(isNewerVersion('0.1.0', '0.1.0-beta'), false);
});
