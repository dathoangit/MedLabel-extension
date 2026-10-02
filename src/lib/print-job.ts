import type { MedicationLine, PatientInfo } from '../contracts/lookup.v1';

export type PrintKind = 'injection' | 'infusion';

export type PrintJob = {
  /** Missing on jobs saved before infusion labels existed. Treat as injection. */
  kind?: PrintKind;
  patient: PatientInfo;
  meds: MedicationLine[];
};

const PRINT_PAGE_PATH = 'src/print/index.html';
const JOB_KEY_PREFIX = 'printJob:';

/** Large enough for Chrome's print preview when kiosk printing is off. */
const PRINT_WINDOW_SIZE = { width: 960, height: 720 };

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

/**
 * Chrome ignores window.print() inside a side panel, so printing happens in
 * a short-lived popup window that renders the labels and closes itself.
 */
export async function printLabels(
  patient: PatientInfo,
  meds: MedicationLine[],
  kind: PrintKind = 'injection'
): Promise<void> {
  if (meds.length === 0) {
    return;
  }
  const jobId = crypto.randomUUID();
  const job: PrintJob = { kind, patient, meds };
  await chrome.storage.session.set({ [jobKey(jobId)]: job });
  await chrome.windows.create({
    url: chrome.runtime.getURL(`${PRINT_PAGE_PATH}?job=${jobId}`),
    type: 'popup',
    focused: true,
    ...PRINT_WINDOW_SIZE
  });
}

/** Reads a job once; a reloaded print window must not print twice. */
export async function takePrintJob(jobId: string): Promise<PrintJob | null> {
  const key = jobKey(jobId);
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  const job: unknown = stored[key];
  return job ? (job as PrintJob) : null;
}
