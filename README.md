# MedLabel Extension

Chrome extension (Manifest V3, side panel) that prints medication labels during nursing drug preparation. The nurse scans a mã hồ sơ or mã bệnh án; the extension fetches patient and medication lines from the MedLabel server, then prints injection and infusion labels on a 52×22 mm roll, two slots per row.

Data comes from the `medlabel-server` repo (checked out next to this one as `../MedLabel`). Architecture and hospital rollout are documented there in `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md`.

## Setup

```bash
yarn
yarn dev      # HMR build into dist/
```

`chrome://extensions` → Developer mode → **Load unpacked** → `dist/`. Click the toolbar icon to open the side panel.

The default server is `http://medlabel.local:8080` (`src/config/server.ts`). For local development, run the server and set `http://localhost:8080` in the options page (**Cài đặt**); Chrome asks once for permission to reach it.

## Layout

| Path                                 | Purpose                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/sidepanel/`                     | Lookup form, patient + orders view. One dialog per phiếu previews both kinds and can print all of them, or only injections, or only infusions                                             |
| `src/options/`                       | Server address, connection check                                                                                                                                                          |
| `src/lib/labels.ts`                  | Roll geometry and label HTML. An injection is one drug per slot (the odd slot stays blank). An infusion is one drug per row: patient on 1/2, drug on 2/2, same pair number on both halves |
| `src/print/`, `src/lib/print-job.ts` | Print window. Chrome ignores `print()` inside a side panel, so each print opens a popup that prints and closes itself. A mixed job prints injection rows first, then infusion rows        |
| `src/lib/routes.ts`                  | Which routes are injections (starts with "Tiêm", no "truyền") or infusions (contains "truyền")                                                                                            |
| `src/lib/api.ts`                     | Lookup call; refuses any payload whose `apiVersion` differs                                                                                                                               |
| `src/contracts/lookup.v1.ts`         | **Generated.** Copied from the server repo                                                                                                                                                |

## API contract

Never edit `src/contracts/lookup.v1.ts` here. Change it in the server repo, then:

```bash
yarn sync:contract    # set MEDLABEL_SERVER_REPO if the server is not at ../MedLabel
```

The pre-commit hook runs `yarn check:contract`, which fails if the copy was edited by hand.

## Shared-folder rollout (nurse workstations)

Primary deploy path: **Load unpacked** from a network Share.

1. Build: `yarn build` (writes `dist/`, including `version.json` matching `package.json`).
2. Copy the entire `dist/` folder onto the Share (overwrite in place).
3. On each nurse PC once: `chrome://extensions` → Developer mode → **Load unpacked** → point at the Share path.

After that, bump the version (e.g. bump `package.json` then `yarn build`, or `yarn release`), copy `dist/` over the Share again. Within about an hour the background service worker reads the new `version.json`, sees a higher version than the loaded manifest, and calls `chrome.runtime.reload()` so Chrome picks up the new files without a manual browser restart.

## Releasing

### Signing key

`keys/extension.pem` signs every release and fixes the extension ID (`kmcaolgjiahblobhmnniihieggicjlkp`). It is git-ignored.

- **Back it up outside this repo** (password manager or offline storage). If it is lost, installed copies can never be updated again and every workstation needs a reinstall.
- `keys/public-key.txt` is public and committed; it pins the same ID for unpacked dev builds.
- `yarn keygen` is only for the very first setup and refuses to overwrite an existing key.

To release from another machine, restore `keys/extension.pem` from the backup. `yarn release` checks it matches `keys/public-key.txt`.

### Cutting a release (optional CRX channel)

```bash
yarn release          # 0.1.0 -> 0.1.1
yarn release minor    # 0.1.0 -> 0.2.0
```

This bumps `package.json`, builds, signs `release/medlabel-<version>.crx`, and writes `release/updates.xml`. Copy both into the server's `updates/` folder — the `.crx` first, then `updates.xml`. Commit the version bump.

Chrome installs a CRX update only if the version is higher than the installed one. Nurse machines on the shared-folder path use `version.json` auto-reload instead; keep this CRX flow only if you still need signed packages.

## Scripts

| Script                                       | Purpose                                                             |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `yarn dev` / `yarn build`                    | Dev build with HMR / production build into `dist/`                  |
| `yarn test`                                  | Unit tests (label layout, route filter, API guard, release helpers) |
| `yarn typecheck` / `yarn lint`               | Static checks                                                       |
| `yarn sync:contract` / `yarn check:contract` | Copy / verify the server API contract                               |
| `yarn keygen`                                | Create the signing key (first time only)                            |
| `yarn release [patch\|minor\|major]`         | Build, sign and write update files                                  |
