import assert from 'node:assert/strict';
import test from 'node:test';
import { LOOKUP_API_VERSION } from '../contracts/lookup.v1';
import { fetchLookup, LookupApiError, parseLookupResponse } from './api';

const validBody = {
  apiVersion: LOOKUP_API_VERSION,
  lookupBy: 'maHoSo',
  orderCount: 0,
  medicationCount: 0,
  matchCount: 1,
  patient: {
    hisPatienthistoryId: '1',
    maHoSo: '2609230012',
    maNb: null,
    maBenhAn: null,
    tenNb: 'Nguyễn Văn A',
    tuoi: 40,
    ngaySinh: null,
    gioiTinh: 'M'
  },
  orders: []
};

test('accepts a v1 success payload', () => {
  const body = parseLookupResponse(200, validBody);
  assert.equal(body.patient.tenNb, 'Nguyễn Văn A');
});

test('refuses a payload from a different API version', () => {
  assert.throws(
    () => parseLookupResponse(200, { ...validBody, apiVersion: 2 }),
    (error: unknown) =>
      error instanceof LookupApiError && /Không in tem/.test(error.message)
  );
});

test('refuses a payload with no apiVersion (pre-contract server)', () => {
  const { apiVersion: _omit, ...legacy } = validBody;
  assert.throws(() => parseLookupResponse(200, legacy), LookupApiError);
});

test('surfaces the server error message for 4xx responses', () => {
  assert.throws(
    () =>
      parseLookupResponse(404, {
        apiVersion: LOOKUP_API_VERSION,
        error: 'Không tìm thấy mã hồ sơ',
        code: 'NOT_FOUND'
      }),
    (error: unknown) =>
      error instanceof LookupApiError &&
      error.status === 404 &&
      error.message === 'Không tìm thấy mã hồ sơ'
  );
});

test('refuses a success payload without patient data', () => {
  assert.throws(
    () => parseLookupResponse(200, { ...validBody, patient: null }),
    LookupApiError
  );
});

test('builds the query from the server origin and code kind', async () => {
  let requested = '';
  const fakeFetch = (async (input: URL | RequestInfo) => {
    requested = String(input);
    return new Response(JSON.stringify(validBody), { status: 200 });
  }) as typeof fetch;

  await fetchLookup(
    'http://medlabel.local:8080',
    'ma-benh-an',
    'BA 01',
    fakeFetch
  );
  assert.equal(
    requested,
    'http://medlabel.local:8080/api/lookup?ma-benh-an=BA+01'
  );
});

test('reports an unreachable server clearly', async () => {
  const failingFetch = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;

  await assert.rejects(
    fetchLookup(
      'http://medlabel.local:8080',
      'ma-ho-so',
      '2609230012',
      failingFetch
    ),
    (error: unknown) =>
      error instanceof LookupApiError &&
      error.status === null &&
      /Không kết nối được/.test(error.message)
  );
});
