# Browser Notes Extension Implementation Plan

**Date**: 2026-05-29
**Based on**: `docs/superpowers/specs/2026-05-29-browser-notes-extension-design.md`
**Goal**: Implement a Chrome Manifest V3 side panel extension for website-specific rich text notes

---

## Phase 0: Project Setup

### 0.1 Initialize project structure
- [ ] Create Vite + React + TypeScript project: `npm create vite@latest . -- --template react-ts`
- [ ] Install dependencies:
  - `npm install zustand`
  - `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
  - `npm install tailwindcss postcss autoprefixer`
  - `npm install -D @types/chrome` (for Chrome extension types)
  - `npm install lucide-react` (icons)
  - `npm install sonner` (toast notifications)
- [ ] Initialize Tailwind: `npx tailwindcss init -p`
- [ ] Configure `tsconfig.json` with `"types": ["chrome"]`

### 0.2 Configure Tailwind and shadcn/ui
- [ ] Update `tailwind.config.js` with content paths for `src/**/*.{ts,tsx}`
- [ ] Add base styles to `src/index.css`
- [ ] Install shadcn/ui CLI: `npx shadcn-ui@latest init`
- [ ] Add required components:
  - `npx shadcn-ui@latest add button`
  - `npx shadcn-ui@latest add input`
  - `npx shadcn-ui@latest add card`
  - `npx shadcn-ui@latest add scroll-area`
  - `npx shadcn-ui@latest add dropdown-menu`
  - `npx shadcn-ui@latest add dialog`
  - `npx shadcn-ui@latest add toast` (or use sonner)

### 0.3 Create extension manifest and entry points
- [ ] Create `public/manifest.json` with Manifest V3 structure:
  ```json
  {
    "manifest_version": 3,
    "name": "OpenNote",
    "version": "1.0.0",
    "description": "Website-specific notes in a right sidebar",
    "permissions": ["storage", "contextMenus", "sidePanel", "activeTab", "tabs"],
    "host_permissions": ["<all_urls>"],
    "background": { "service_worker": "background.js" },
    "action": { "default_title": "OpenNote" },
    "side_panel": { "default_path": "sidepanel.html" }
  }
  ```
- [ ] Create `index.html` as side panel entry (rename or copy to `sidepanel.html` in build)
- [ ] Create `src/background.ts` for service worker logic
- [ ] Update `vite.config.ts` to output correct file names for extension

**Checkpoint 0**: `npm run build` succeeds, `dist/` contains `manifest.json`, `background.js`, `sidepanel.html`, `sidepanel.js`. Load unpacked extension in Chrome shows no errors.

---

## Phase 1: Core Storage and State Layer

### 1.1 Define TypeScript types
- [ ] Create `src/types/index.ts`:
  ```ts
  export interface Note {
    id: string;
    content: any; // ProseMirror JSON
    createdAt: number;
    updatedAt: number;
  }

  export interface NotesStore {
    [hostname: string]: Note[];
  }

  export interface MetaStore {
    lastActiveSite: string | null;
    version: number;
  }
  ```

### 1.2 Implement storage utilities
- [ ] Create `src/lib/storage.ts`:
  - `getNotes(): Promise<NotesStore>`
  - `setNotes(notes: NotesStore): Promise<void>`
  - `getMeta(): Promise<MetaStore>`
  - `setMeta(meta: MetaStore): Promise<void>`
  - `addNote(hostname: string, content: any): Promise<Note>`
  - `updateNote(hostname: string, id: string, content: any): Promise<void>`
  - `deleteNote(hostname: string, id: string): Promise<void>`
- [ ] Wrap all storage calls with Promise to handle `chrome.runtime.lastError`
- [ ] Add storage change listener helper: `onNotesChange(callback)`

### 1.3 Create Zustand store
- [ ] Create `src/store/notesStore.ts`:
  ```ts
  interface NotesState {
    notes: NotesStore;
    currentSite: string | null;
    searchQuery: string;
    isLoading: boolean;
    error: string | null;
    // actions...
  }
  ```
- [ ] Implement actions: `loadNotes`, `setCurrentSite`, `addNote`, `updateNote`, `deleteNote`, `setSearchQuery`, `filteredNotes(site)`
- [ ] Subscribe to `chrome.storage.onChanged` to sync state across panels
- [ ] Handle storage quota errors with user-friendly messages

**Checkpoint 1**: Unit tests pass for storage utils and store. `npm run test` (Vitest) covers >80% of this layer.

---

## Phase 2: Background Service Worker

### 2.1 Context menu registration
- [ ] In `src/background.ts`, on `chrome.runtime.onInstalled`:
  - `chrome.contextMenus.create({id: 'save-note', title: '保存为笔记', contexts: ['selection']})`
- [ ] Listen to `chrome.contextMenus.onClicked`:
  - If menu item is 'save-note', get selected text from `info.selectionText`
  - Call `chrome.sidePanel.open({tabId: tab.id})`
  - Store pending note content in a temp variable or pass via URL param

### 2.2 Side panel open handler
- [ ] Listen to `chrome.action.onClicked`:
  - Get active tab via `chrome.tabs.query({active: true, currentWindow: true})`
  - Call `chrome.sidePanel.open({tabId: tab.id})`
- [ ] On first install, set `chrome.sidePanel.setOptions({path: 'sidepanel.html'})`

### 2.3 Handle special pages
- [ ] Before opening side panel, check if `tab.url` starts with `chrome://` or `chrome-extension://`
- [ ] If invalid, show notification via `chrome.notifications` or skip silently

**Checkpoint 2**: Right-click on selected text opens side panel. Toolbar icon click opens side panel. No console errors in background worker.

---

## Phase 3: Side Panel UI - Layout and Navigation

### 3.1 Root layout component
- [ ] Create `src/App.tsx`:
  - Two-column flex layout: `Sidebar` (w-64) + `EditorPanel` (flex-1)
  - Apply dark mode classes based on `prefers-color-scheme`
  - Wrap with `Toaster` from sonner

### 3.2 Sidebar component
- [ ] Create `src/components/Sidebar.tsx`:
  - `SearchInput`: controlled input, updates `searchQuery` in store
  - `SiteList`: scrollable list of `SiteItem`
  - `AddSiteButton`: opens dialog to manually add a hostname

### 3.3 SiteItem component
- [ ] Create `src/components/SiteItem.tsx`:
  - Props: `hostname`, `noteCount`, `isActive`
  - Click handler: `setCurrentSite(hostname)`
  - Display: hostname + badge with note count
  - Active state: highlight background

### 3.4 EditorPanel component
- [ ] Create `src/components/EditorPanel.tsx`:
  - `SiteHeader`: shows current hostname + dropdown to switch sites
  - `TipTapEditor`: main editor area
  - `NoteList`: collapsible list of notes for current site
  - Empty state: "No notes yet. Start typing..."

### 3.5 Site switcher dropdown
- [ ] Use shadcn `DropdownMenu` in `SiteHeader`
- [ ] List all hostnames from `notes` keys
- [ ] Click switches `currentSite`

**Checkpoint 3**: Side panel opens with correct layout. Clicking sites switches the editor panel. Search input filters the site list (bonus: can also filter notes in editor).

---

## Phase 4: TipTap Editor Integration

### 4.1 Basic TipTap setup
- [ ] Create `src/components/TipTapEditor.tsx`:
  - Use `useEditor` hook from `@tiptap/react`
  - Configure extensions: `StarterKit`, `Placeholder`
  - Placeholder text: "输入笔记内容... 支持 Markdown 快捷键"
- [ ] Render `<EditorContent editor={editor} />`
- [ ] Add basic toolbar: Bold, Italic, Bullet List, Ordered List buttons (using shadcn Button + lucide icons)

### 4.2 Auto-save integration
- [ ] On editor `onUpdate` or `onBlur`, trigger debounced save:
  - Use `lodash.debounce` or native `setTimeout` (2s delay)
  - Get JSON via `editor.getJSON()`
  - Call `updateNote(currentSite, noteId, content)`
- [ ] Show auto-save status: "已保存" / "保存中..." / "保存失败"
- [ ] On initial load, if current site has notes, load first note into editor; if empty, create new note

### 4.3 Multiple notes per site
- [ ] `NoteList` shows all notes for current site as cards
- [ ] Each `NoteCard`: timestamp + content preview (first 100 chars) + delete button
- [ ] Click `NoteCard` loads that note into editor
- [ ] "New note" button creates a new empty note for current site

### 4.4 Markdown source toggle (optional stretch)
- [ ] Add a toggle button in toolbar
- [ ] When active, show raw Markdown via `editor.getMarkdown()` in a `<textarea>`
- [ ] On toggle off, parse Markdown back to editor content

**Checkpoint 4**: Can type rich text in editor. Auto-save works (verify in DevTools → Application → Storage). Multiple notes per site work. Content persists after panel close/reopen.

---

## Phase 5: Context Menu Quick-Save Flow

### 5.1 Pass pending content to side panel
- [ ] In background, when context menu clicked with selection:
  - Store selected text in `chrome.storage.session` (or a module-level variable)
  - Open side panel
- [ ] In side panel `App.tsx` on mount:
  - Check `chrome.storage.session` for pending content
  - If exists, create new note with that content pre-filled in editor
  - Clear the pending content after use

### 5.2 Handle no-selection case
- [ ] If context menu clicked without selection, just open empty editor for current site

**Checkpoint 5**: Select text on any page → right-click → "保存为笔记" → side panel opens with selected text in editor.

---

## Phase 6: Polish and Edge Cases

### 6.1 Dark mode
- [ ] Tailwind already supports `dark:` variants
- [ ] Add `dark` class to `<html>` based on `window.matchMedia('(prefers-color-scheme: dark)')`
- [ ] Or rely on `prefers-color-scheme` media query in CSS (Tailwind handles this)

### 6.2 Invalid page handling
- [ ] On side panel load, check current tab URL
- [ ] If `chrome://` or `about:`, show disabled state with message "此页面不支持笔记"
- [ ] Disable editor and site list

### 6.3 Storage quota warning
- [ ] Wrap storage writes with try/catch
- [ ] On `QUOTA_BYTES` error, show toast: "存储空间不足，请删除部分笔记"
- [ ] Optionally, show current usage: `chrome.storage.local.getBytesInUse()`

### 6.4 Empty states and loading
- [ ] Global loading spinner while `isLoading` in store
- [ ] Empty site list: "还没有笔记，访问网站后开始记录"
- [ ] Empty editor: prompt to start typing

### 6.5 Error boundaries
- [ ] Wrap `App` with React error boundary
- [ ] On crash, show fallback UI with "Something went wrong" and reload button

**Checkpoint 6**: All manual test checklist items pass. No console errors. Dark mode works. Edge cases handled gracefully.

---

## Phase 7: Testing and Verification

### 7.1 Unit tests
- [ ] Set up Vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] Add `vitest.config.ts`
- [ ] Write tests for:
  - `src/lib/storage.ts` (mock `chrome.storage.local`)
  - `src/store/notesStore.ts` (test actions and `filteredNotes`)
  - `src/components/SiteItem.tsx`, `NoteCard.tsx` (render + click)

### 7.2 Integration tests
- [ ] Test full flow: load notes → set current site → add note → verify storage updated
- [ ] Test context menu simulation: mock `contextMenus.onClicked` → verify panel state

### 7.3 Manual verification
- [ ] Run through entire manual test checklist (see design spec)
- [ ] Test on real websites: github.com, stackoverflow.com, localhost
- [ ] Test storage quota by adding many large notes

**Checkpoint 7**: All tests pass. Manual checklist complete. Ready for packaging.

---

## Phase 8: Packaging and Distribution (Optional)

### 8.1 Build for production
- [ ] `npm run build`
- [ ] Verify `dist/` contains all required files
- [ ] Test "Load unpacked" with `dist/` folder

### 8.2 Prepare for Chrome Web Store (future)
- [ ] Create icons (16, 48, 128 px)
- [ ] Write store description
- [ ] Create screenshots
- [ ] Zip `dist/` for upload

---

## Implementation Order Summary

1. **Phase 0** → Project skeleton + build works
2. **Phase 1** → Storage + Zustand (foundation)
3. **Phase 2** → Background worker (entry points)
4. **Phase 3** → Basic UI layout (navigation)
5. **Phase 4** → Editor integration (core value)
6. **Phase 5** → Context menu flow (quick save)
7. **Phase 6** → Polish + edge cases
8. **Phase 7** → Tests + verification
9. **Phase 8** → Packaging (optional)

---

## Success Criteria

- [ ] User can open side panel via toolbar or context menu
- [ ] Notes are saved per hostname and persist across sessions
- [ ] Rich text editing works with auto-save
- [ ] Search/filter reduces visible items correctly
- [ ] Dark mode follows system preference
- [ ] No crashes on special pages (`chrome://`)
- [ ] Storage errors are handled with user feedback

---

## Notes for Future Work

- If TipTap Markdown toggle is heavily used, consider split-pane view
- If storage grows beyond 5MB, migrate to IndexedDB
- Add optional Chrome Sync toggle with conflict resolution if requested

---

**Plan created. Ready to execute Phase 0.**