import assert from 'node:assert/strict';
import test from 'node:test';
import { extensionIdFromPublicKey } from './extension-key';
import { bumpVersion, updateManifestXml } from './version';

test('bumps each version part and resets lower parts', () => {
  assert.equal(bumpVersion('0.1.9', 'patch'), '0.1.10');
  assert.equal(bumpVersion('0.1.9', 'minor'), '0.2.0');
  assert.equal(bumpVersion('0.1.9', 'major'), '1.0.0');
});

test('rejects versions Chrome would not accept', () => {
  assert.throws(() => bumpVersion('0.1.0-beta', 'patch'));
});

test('writes an update manifest pointing at the crx', () => {
  const xml = updateManifestXml(
    'abcdefghijklmnopabcdefghijklmnop',
    '0.2.0',
    'http://medlabel.local:8080/medlabel-0.2.0.crx'
  );
  assert.match(xml, /appid="abcdefghijklmnopabcdefghijklmnop"/);
  assert.match(xml, /version="0.2.0"/);
  assert.match(
    xml,
    /codebase="http:\/\/medlabel.local:8080\/medlabel-0.2.0.crx"/
  );
});

test('derives a 32-char a-p extension ID', () => {
  const id = extensionIdFromPublicKey(
    Buffer.from('fixed key').toString('base64')
  );
  assert.match(id, /^[a-p]{32}$/);
});
