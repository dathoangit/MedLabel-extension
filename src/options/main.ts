import { DEFAULT_SERVER_ORIGIN } from '../config/server';
import { mustGet } from '../lib/dom';
import { checkHealth } from '../lib/health';
import {
  getServerOrigin,
  resetServerOrigin,
  setServerOrigin
} from '../settings';

const form = mustGet<HTMLFormElement>('settings-form');
const originInput = mustGet<HTMLInputElement>('server-origin');
const defaultOriginEl = mustGet<HTMLElement>('default-origin');
const testBtn = mustGet<HTMLButtonElement>('test-btn');
const resetBtn = mustGet<HTMLButtonElement>('reset-btn');
const statusEl = mustGet<HTMLParagraphElement>('status');
const versionEl = mustGet<HTMLSpanElement>('version');

function setStatus(message: string, kind: 'ok' | 'error' | null): void {
  statusEl.hidden = !message;
  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error');
  if (kind) {
    statusEl.classList.add(kind);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Địa chỉ không hợp lệ. Ví dụ: http://medlabel.local:8080';
  }
  return error instanceof Error ? error.message : String(error);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  setServerOrigin(originInput.value)
    .then((origin) => {
      originInput.value = origin;
      setStatus(`Đã lưu: ${origin}`, 'ok');
    })
    .catch((error: unknown) => setStatus(errorMessage(error), 'error'));
});

testBtn.addEventListener('click', async () => {
  testBtn.disabled = true;
  setStatus('Đang kiểm tra…', null);
  const origin = await getServerOrigin();
  const result = await checkHealth(origin);
  setStatus(
    result.ok ? `Kết nối tốt tới ${origin}.` : result.message,
    result.ok ? 'ok' : 'error'
  );
  testBtn.disabled = false;
});

resetBtn.addEventListener('click', async () => {
  originInput.value = await resetServerOrigin();
  setStatus('Đã về địa chỉ mặc định.', 'ok');
});

async function init(): Promise<void> {
  defaultOriginEl.textContent = DEFAULT_SERVER_ORIGIN;
  versionEl.textContent = chrome.runtime.getManifest().version;
  originInput.value = await getServerOrigin();
}

void init();
