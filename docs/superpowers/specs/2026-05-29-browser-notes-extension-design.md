# Browser Notes Extension Design

**Date**: 2026-05-29
**Status**: Approved
**Project**: Chrome browser extension for website-specific note taking with right sidebar panel

---

## Overview

A Chrome Manifest V3 side panel extension that allows users to store rich-text notes organized by website hostname. The panel opens on the right side of the browser, displays notes categorized by site, supports adding/editing notes for the current site or switching to other sites, and includes search/filter functionality.

**Key Requirements**:
- Chrome only (Manifest V3)
- Local storage only (no Chrome Sync)
- Rich text / Markdown support via TipTap editor
- Search and filter existing notes
- Right-click context menu to quickly save selected text as a note
- Dark mode follows system/browser theme
- Click toolbar icon opens side panel directly

---

## Architecture

### High-Level Structure

- **Background Service Worker**: Handles context menu registration, side panel open requests, storage change listeners
- **Side Panel UI** (React 18 application): Main interface with site list + editor panel
- **Content Script** (optional): Only if page-level text selection capture is needed beyond context menu
- **Storage**: `chrome.storage.local` with key structure `{ [hostname]: Note[] }`
- **State Management**: Zustand store for current site, notes, search query
- **Rich Text Editor**: TipTap (ProseMirror-based) with Markdown extension

### Data Flow

1. User action (toolbar click / context menu) → Background worker receives event
2. Background calls `chrome.sidePanel.open({tabId})`
3. Side panel loads React app, queries active tab hostname
4. Zustand store initializes from `chrome.storage.local`
5. User edits → debounced auto-save to storage → store update → UI refresh
6. Storage change listener syncs state across multiple open side panels

### Storage Schema

```json
{
  "notes": {
    "github.com": [
      {
        "id": "uuid-1",
        "content": { "type": "doc", "content": [...] },
        "createdAt": 1710000000000,
        "updatedAt": 1710000100000
      }
    ],
    "stackoverflow.com": [...]
  },
  "meta": {
    "lastActiveSite": "github.com",
    "version": 1
  }
}
```

**Note object**:
- `id`: UUID v4
- `content`: TipTap/ProseMirror JSON document
- `createdAt`, `updatedAt`: timestamps in milliseconds

**Why this structure**:
- Flat `notes[hostname]` enables O(1) lookup and simple CRUD
- ProseMirror JSON preserves rich text structure (paragraphs, lists, bold, etc.)
- TipTap provides `editor.getMarkdown()` for export view
- Meta stores last active site for auto-focus on open

---

## UI Components

### Layout (Left → Right)

```
┌─────────────────────────────────────────────────────────┐
│ [Site List]              │ [Editor Panel]               │
│                          │                              │
│ 🔍 Search...             │ 📝 github.com                │
│                          │                              │
│ github.com (12)          │ [TipTap Editor]              │
│ stackoverflow.com (5)    │                              │
│ ...                      │                              │
│                          │                              │
│ + Add site               │ [Auto-save indicator]        │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy

1. `App` (root container)
   - `Sidebar` (left panel)
     - `SearchInput`
     - `SiteList` (clickable site switcher)
       - `SiteItem` (hostname + note count)
     - `AddSiteButton` (manually add other sites)
   - `EditorPanel` (right panel)
     - `SiteHeader` (current site + switcher dropdown)
     - `TipTapEditor`
     - `NoteList` (collapsible list of notes for current site)
       - `NoteCard` (timestamp + preview + delete)

### Key User Flows

**1. Open via toolbar icon**
- Background receives `chrome.action.onClicked`
- Calls `chrome.sidePanel.open({tabId})`
- Side panel loads, queries active tab hostname via `chrome.tabs.query`
- Auto-selects current site if notes exist; otherwise creates empty note

**2. Right-click to save note**
- Background registers `chrome.contextMenus.create({id: 'save-note', title: '保存为笔记'})`
- Listens to `onClicked`; if text selected, opens side panel with pre-filled content
- If no selection, opens empty editor

**3. Switch site**
- Click `SiteItem` → `setCurrentSite(hostname)`
- Editor panel switches to that site's notes
- Dropdown in editor header allows switching to other sites

**4. Add/edit note**
- TipTap editor supports real-time editing
- On blur or 2s debounce, calls `updateNote` → writes to `chrome.storage.local`
- Zustand store updates → UI re-renders

**5. Search/filter**
- Search input → `setSearchQuery`
- `filteredNotes(site)` matches content (simple string contains or regex)

---

## Technical Implementation

### Tech Stack

- **Build**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Editor**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, Markdown extension)
- **State**: Zustand
- **Utilities**: `lodash.debounce` or native `setTimeout` for auto-save

### Build Output

- `dist/manifest.json`
- `dist/background.js` (service worker)
- `dist/sidepanel.html` + `dist/sidepanel.js`
- `dist/content.js` (if needed)

### Key Implementation Details

- **Side panel lifecycle**: `chrome.sidePanel.setOptions({path: 'sidepanel.html'})` called once in background on install
- **Storage sync**: `chrome.storage.onChanged.addListener` to sync state across multiple open panels
- **Debounced save**: Wrap `updateNote` with 2s debounce to avoid excessive writes
- **Markdown toggle**: TipTap configured with Markdown extension; `Cmd/Ctrl+Shift+M` switches source/Markdown view

### Error Handling

- **Storage quota exceeded** (~5MB `QUOTA_BYTES`): Catch `chrome.runtime.lastError`, show toast prompting user to delete old notes
- **Invalid hostname** (e.g., `chrome://` pages): Disable editor, show message "此页面不支持笔记"
- **Concurrent write conflicts**: Serialize storage operations via Promise chain to avoid race conditions
- **TipTap init failure**: Fallback to plain `<textarea>`, preserve basic functionality

### Manifest Permissions

```json
{
  "permissions": ["storage", "contextMenus", "sidePanel", "activeTab", "tabs"],
  "host_permissions": ["<all_urls>"]
}
```

**Rationale**:
- `storage`: Persist notes
- `contextMenus`: Right-click save
- `sidePanel`: Open panel UI
- `activeTab` + `tabs`: Get current tab hostname

---

## Testing Strategy

### Test Pyramid

**1. Unit Tests** (Vitest + React Testing Library)
- `SiteItem`, `NoteCard` render and click handlers
- Zustand store methods: `addNote`, `updateNote`, `filteredNotes`
- Utility functions: UUID generation, debounce, hostname extraction

**2. Integration Tests**
- Side panel open flow: Mock `chrome.tabs.query` returns hostname, verify auto-select
- Storage read/write: Mock `chrome.storage.local`, verify CRUD syncs store and UI
- Context menu flow: Simulate `contextMenus.onClicked`, verify panel opens with pre-filled content

**3. E2E Tests** (optional, Playwright + Chrome extension testing)
- Full flow: Open page → click toolbar → panel appears → type note → refresh → verify persistence
- Cross-tab: Open two tabs, open side panel on each, verify each shows its site's notes

### Coverage Goals

- Core business logic (store, storage ops) > 80%
- UI component interactions > 60%
- Not aiming for 100% (browser API mocking cost is high; prioritize logic correctness)

### Manual Test Checklist

- [ ] Fresh install → first open
- [ ] Right-click selected text → save as note
- [ ] Switch site → edit another site's notes
- [ ] Search keyword → filter note list
- [ ] Dark mode follows system toggle
- [ ] Storage quota warning appears when approaching limit

---

## Non-Goals / Out of Scope

- Export/import functionality (JSON backup/restore)
- Keyboard shortcuts
- Chrome Sync / cross-device sync
- Firefox / Safari / Edge support
- Advanced rich text features (tables, images, code blocks beyond basic)

---

## Future Considerations

- If storage quota becomes a bottleneck, migrate to IndexedDB with `idb` wrapper
- If Markdown source editing is heavily used, consider adding a split-pane view
- If users request cross-device sync, add optional Chrome Sync toggle with conflict resolution

---

## Approval

**Design approved by user on 2026-05-29.**

Next step: Invoke writing-plans skill to create detailed implementation plan.