# OpenNote Optimization Plan

Date: 2026-05-31

## Goal

Improve OpenNote in small, verifiable steps while keeping the current browser-extension workflow stable: open side panel, write notes by site, save selected web content, and search notes.

## Phase 1: Code Health Baseline

Priority: High

Scope:
- Make `npm run lint` pass.
- Keep `npm test -- --run` and `npm run build` passing.
- Replace lint-hostile React patterns with stable hooks patterns.
- Tighten loose `any` usage in storage and tests where practical.
- Remove unused template or stale files only when they are not referenced.

Why:
- The app builds and tests pass, but lint currently fails. A clean baseline makes later feature work safer.

Verification:
- `npm run lint`
- `npm test -- --run`
- `npm run build`

## Phase 2: Extension Permissions and Trust

Priority: High

Scope:
- Document why each Chrome permission is needed.
- Re-check whether `host_permissions: ["<all_urls>"]`, `scripting`, `notifications`, and `favicon` are all required.
- Prefer the smallest permission set that still supports rich selection capture and side-panel behavior.
- Update README with a clear privacy note: notes stay local unless a future sync/export feature is explicitly used.

Why:
- Browser note extensions are trust-sensitive. Clear permission rationale helps users and Chrome Web Store review.

Verification:
- `npm run build`
- Manual load of `dist/` extension
- Right-click selected text on normal pages still works
- Special pages still fail gracefully

## Phase 3: Source Context and Note Portability

Priority: High

Scope:
- Save source metadata for captured selections: page URL, page title, captured time, and hostname.
- Show source context in the note UI without cluttering the editor.
- Add JSON export/import as the first backup path.
- Consider Markdown export after JSON export is stable.

Why:
- Web notes are more useful when users can return to the exact source page and back up their data.

Verification:
- Unit tests for metadata creation and import/export helpers
- `npm test -- --run`
- `npm run build`
- Manual right-click capture verifies source URL/title are preserved

## Phase 4: Storage Resilience

Priority: Medium

Scope:
- Add a storage usage helper using `chrome.storage.local.getBytesInUse`.
- Surface storage quota warnings before writes start failing.
- Avoid full-store rewrites where possible, or document a migration path.
- Evaluate IndexedDB as the next storage backend when note volume grows.

Why:
- The current whole-store write model is simple, but it can become slow and quota-sensitive as notes grow.

Verification:
- Unit tests for quota/usage helpers
- `npm test -- --run`
- Manual high-volume note test

## Phase 5: Search, Filters, and Daily Workflow

Priority: Medium

Scope:
- Improve search as a global workflow across all sites.
- Add filters for pinned, favorite, tagged, and recent notes.
- Make note sorting controls functional instead of decorative.
- Consider keyboard shortcuts after the main flows are stable.

Why:
- The value of a notes app depends on retrieval as much as capture.

Verification:
- Store/search unit tests
- Component tests for filter controls
- Manual search across several sites

## Phase 6: UI Polish and Documentation

Priority: Medium

Scope:
- Implement or remove README claims for dark mode.
- Rename package metadata from `vite-temp` to OpenNote.
- Remove unused Vite template artifacts.
- Add screenshots and clearer install/use instructions.
- Keep the UI compact and side-panel friendly.

Why:
- This improves first impression, maintainability, and distribution readiness.

Verification:
- `npm run lint`
- `npm test -- --run`
- `npm run build`
- Manual visual check in the Chrome side panel

## Execution Rule

Work one phase at a time. For each phase:
1. Inspect the affected files.
2. Make the smallest useful change.
3. Run the phase verification commands.
4. Record what changed before moving to the next phase.
