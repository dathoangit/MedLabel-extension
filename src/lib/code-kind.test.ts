import assert from 'node:assert/strict';
import test from 'node:test';
import { detectCodeKind } from './code-kind';

test('treats 10 digits with a valid YYMMDD prefix as mã hồ sơ', () => {
  assert.equal(detectCodeKind('2609230012').kind, 'ma-ho-so');
  assert.equal(detectCodeKind(' 2609230012 ').code, '2609230012');
});

test('falls back to mã bệnh án for other codes', () => {
  assert.equal(detectCodeKind('2641600').kind, 'ma-benh-an');
  assert.equal(detectCodeKind('2613990012').kind, 'ma-benh-an');
  assert.equal(detectCodeKind('2609320012').kind, 'ma-benh-an');
});

test('returns no kind for blank input', () => {
  assert.equal(detectCodeKind('   ').kind, null);
});
