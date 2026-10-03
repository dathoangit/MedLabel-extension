import { isNewerVersion } from './lib/version-compare';

const VERSION_CHECK_ALARM = 'version-check';
const VERSION_CHECK_PERIOD_MINUTES = 60;
const VERSION_CHECK_DELAY_MINUTES = 1;

function ensureSidePanel(): void {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

async function ensureVersionCheckAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(VERSION_CHECK_ALARM);
  if (existing) {
    return;
  }
  chrome.alarms.create(VERSION_CHECK_ALARM, {
    delayInMinutes: VERSION_CHECK_DELAY_MINUTES,
    periodInMinutes: VERSION_CHECK_PERIOD_MINUTES
  });
}

async function checkForSharedFolderUpdate(): Promise<void> {
  try {
    const response = await fetch(chrome.runtime.getURL('version.json'), {
      cache: 'no-store'
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { version?: unknown };
    if (typeof data.version !== 'string') {
      return;
    }
    const local = chrome.runtime.getManifest().version;
    if (isNewerVersion(data.version, local)) {
      console.log(
        `MedLabel: newer version ${data.version} (local ${local}), reloading`
      );
      chrome.runtime.reload();
    }
  } catch (error) {
    console.log('MedLabel: version check failed', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSidePanel();
  void ensureVersionCheckAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  ensureSidePanel();
  void ensureVersionCheckAlarm();
});

void ensureVersionCheckAlarm();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === VERSION_CHECK_ALARM) {
    void checkForSharedFolderUpdate();
  }
});
