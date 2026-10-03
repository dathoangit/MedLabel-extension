import type { MedicationLine, PatientInfo } from '../contracts/lookup.v1';
import type { LabelPrintSection } from './labels';

export type PrintKind = 'injection' | 'infusion';

export type PrintJob = {
  /** Missing on jobs saved before infusion labels existed. Treat as injection. */
  kind?: PrintKind;
  patient: PatientInfo;
  meds: MedicationLine[];
  /** Present when one print window contains more than one label kind. */
  sections?: LabelPrintSection[];
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
async function openPrintWindow(job: PrintJob): Promise<void> {
  const jobId = crypto.randomUUID();
  await chrome.storage.session.set({ [jobKey(jobId)]: job });
  await chrome.windows.create({
    url: chrome.runtime.getURL(`${PRINT_PAGE_PATH}?job=${jobId}`),
    type: 'popup',
    focused: true,
    ...PRINT_WINDOW_SIZE
  });
}

export async function printLabels(
  patient: PatientInfo,
  meds: MedicationLine[],
  kind: PrintKind = 'injection'
): Promise<void> {
  if (meds.length === 0) {
    return;
  }
  await openPrintWindow({ kind, patient, meds });
}

/** One print dialog. A single non-empty kind reuses the single-kind job. */
export async function printAllLabels(
  patient: PatientInfo,
  sections: LabelPrintSection[]
): Promise<void> {
  const filled = sections.filter((section) => section.meds.length > 0);
  if (filled.length === 0) {
    return;
  }
  const only = filled[0];
  if (filled.length === 1 && only) {
    await printLabels(patient, only.meds, only.kind);
    return;
  }
  await openPrintWindow({ patient, meds: [], sections: filled });
}

/** Reads a job once; a reloaded print window must not print twice. */
export async function takePrintJob(jobId: string): Promise<PrintJob | null> {
  const key = jobKey(jobId);
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  const job: unknown = stored[key];
  return job ? (job as PrintJob) : null;
}
