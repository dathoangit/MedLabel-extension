import {
  buildInfusionRowsHtml,
  buildRowsHtml,
  buildSectionRowsHtml,
  LABEL_PRINT_STYLES
} from '../lib/labels';
import { takePrintJob } from '../lib/print-job';

function showMessage(message: string): void {
  document.body.textContent = message;
}

async function run(): Promise<void> {
  const jobId = new URLSearchParams(location.search).get('job');
  const job = jobId ? await takePrintJob(jobId) : null;
  if (!job) {
    showMessage('Không tìm thấy lệnh in. Đóng cửa sổ này và bấm in lại.');
    return;
  }

  const style = document.createElement('style');
  style.textContent = LABEL_PRINT_STYLES;
  document.head.append(style);

  const printedAt = new Date();
  const sections = job.sections?.filter((section) => section.meds.length > 0);
  if (sections && sections.length > 0) {
    document.title = 'Tem thuốc';
    document.body.innerHTML = buildSectionRowsHtml(
      job.patient,
      sections,
      printedAt
    );
  } else {
    document.title =
      job.kind === 'infusion' ? 'Tem thuốc truyền' : 'Tem thuốc tiêm';
    document.body.innerHTML =
      job.kind === 'infusion'
        ? buildInfusionRowsHtml(
            job.patient,
            job.meds,
            printedAt,
            job.infusionPairStart ?? 1
          )
        : buildRowsHtml(job.patient, job.meds);
  }

  await document.fonts.ready;
  window.addEventListener('afterprint', () => window.close());
  requestAnimationFrame(() => window.print());
}

run().catch((error: unknown) => {
  showMessage(
    `Không in được: ${error instanceof Error ? error.message : String(error)}`
  );
});
