# 架构设计

本文档描述 WebNest / 网巢笔记（代号 OpenNote）的整体架构、运行时上下文、状态管理与存储层设计。

## 总览

WebNest 是一个 Chrome Manifest V3 侧边栏扩展。它由两个独立构建产物组成，共享 `src/` 下的代码：

| 产物 | 入口 | 构建配置 | 运行上下文 |
| --- | --- | --- | --- |
| 侧边栏 UI | `index.html` → `src/main.tsx` | `vite.config.ts` | 侧边栏页面（DOM） |
| 后台 Service Worker | `src/background.ts` | `vite.extension.config.ts` | 扩展后台（无 DOM） |

技术栈：React 19 + TypeScript + Vite + Tailwind CSS v4，状态用 Zustand，持久化到 `chrome.storage.local`。

```
┌──────────────────────────────────────────────┐
│  侧边栏 UI (index.html / React)                 │
│                                                │
│  App.tsx                                       │
│   ├── Sidebar.tsx       (工作区树 / 搜索 / 筛选)  │
│   └── EditorPanel.tsx   (单页编辑 / 元数据)       │
│         └── MarkdownEditor                      │
│              ├── LiveMarkdownEditor (TipTap)    │
│              └── CodeMirror (源码模式)            │
│                                                │
│   状态: useNotesStore (Zustand)                 │
└───────────────┬────────────────────────────────┘
                │ chrome.storage.local
                │ (workspace / meta)
                │ ↕ onChanged 双向同步
┌───────────────┴────────────────────────────────┐
│  后台 Service Worker (background.ts)            │
│   ├── 右键菜单 (contextMenu)                     │
│   ├── 选区捕获 (scripting.executeScript)         │
│   ├── 保存为笔记 (contextMenuSave)               │
│   └── 笔记缓存同步 (notesCache)                  │
└─────────────────────────────────────────────────┘
```

## 运行时上下文

### 侧边栏 UI

`index.html` → `src/main.tsx` 在 `StrictMode` 下挂载 `<App />`。`App.tsx` 负责：

- 订阅语言变更（`useLocale`），随 `applocalechange` 事件重渲染。
- 接入活动标签同步（`useSyncSiteWithActiveTab`）、扩展生命周期（`useExtensionLifecycle`）、待选笔记（`usePendingNoteSelect`）等 hook。
- 延迟约 100ms 后再加载面板，`Sidebar` 与 `EditorPanel` 通过 `React.lazy` + `Suspense` 懒加载，配合编辑器分包减小首屏体积。
- 调用 `loadWorkspace()` 拉取数据，并渲染 Sonner 的 `<Toaster>`。

布局是双栏外壳：左侧可折叠的工作区栏 + 右侧编辑区。

### 后台 Service Worker

`src/background.ts` 构建为 `dist/background.js`（ES module 类型的 Service Worker）。职责：

- 设置侧边栏行为（点击工具栏图标打开侧边栏）。
- 构建并刷新右键菜单（静态项 + 按站点动态生成的笔记目标）。
- 处理 `contextMenus.onClicked`：注入 `capturePageSelection` 捕获选区 → 保存为笔记 → 通知侧边栏自动选中。
- 维护后台笔记缓存（`notesCache`）并随存储变更同步。
- 安装时清理历史遗留的 content script（`purgeLegacyContentScripts`）。

后台不再使用常驻 content script，选区捕获改为按需 `chrome.scripting.executeScript`。

## 状态管理

单一 Zustand store：`src/store/notesStore.ts`（`useNotesStore`）。

### 状态字段

- `workspace`：`{ pages, rootIds }` —— 整个工作区数据。
- `currentSite`：当前浏览器标签的主机名。
- `selectedPageId` / `selectedNoteId`：当前选中页面。
- `searchQuery`：搜索关键字。
- `pageFilter` / `noteFilter`：筛选模式（`all` / `pinned` / `favorite` / `tagged`）。
- `pageSortMode` / `noteSortMode`：排序模式（`updated` / `created` / `title`）。
- `isLoading` / `error`：加载与错误状态。

### 派生选择器

- `getPage(id)` / `getChildren(parentId)`：取单页 / 取子页。
- `siteRoots()`：所有站点根节点（按 `sortIndex` 排序）。
- `visibleTreeRows()`：把树拍平成可见行列表，处理折叠、搜索/筛选时收集祖先节点，供虚拟滚动使用。
- `filteredNotes(site)` / `sortedNotes(site)`：站点内笔记的筛选与排序。

### 双命名约定（page / note 别名）

store 同时暴露 `page` 前缀与 `note` 前缀的方法。`note` 系列（`addNote`、`updateNote`、`selectNote`、`noteFilter` 等）是对 `page` 等价方法的薄封装别名，属于历史的「扁平按站点笔记」模型向统一页面树模型迁移时保留的向后兼容命名。新代码应优先使用 `page` 系列。

### 跨上下文同步

store 在模块加载时订阅 `onWorkspaceChange`（封装 `chrome.storage.onChanged`），任一上下文写入 `workspace` 后，其它上下文（如另一个标签的侧边栏、后台）会自动同步。配额错误（`QUOTA_BYTES`）通过 toast 提示。

## 存储层

`src/lib/storage.ts` 是持久化核心，封装 `chrome.storage.local`。

- **键**：`workspace` 与 `meta`。在 `chrome` 不可用时（测试环境）回退到内存对象 `memoryStorage`。
- **写串行化**：所有写操作经 `queueWorkspaceWrite` 串到一个 Promise 队列，避免并发竞态导致的覆盖。
- **规范化**：`normalizeWorkspace` 过滤无效根节点；`siteRootId(hostname)` 生成 `site:<hostname>` 形式的站点根 id；普通页面 id 用 `crypto.randomUUID()`。
- **核心操作**：`ensureSiteRoot`、`addPage`、`updatePageContent`、`updatePageTitle`、`updatePageMeta`、`deletePage`（含子树递归删除）、`movePage`（含后代环路守卫与子树 site 更新）、`deleteSite`。
- **备份**：`exportWorkspaceBackup`（JSON）、`exportWorkspaceMarkdown`、`importWorkspaceBackup`（整库替换）。
- **用量**：`getWorkspaceStorageUsage` 用 `getBytesInUse` + `QUOTA_BYTES` 计算占用。
- **兼容别名**：`getNotes` / `setNotes` / `addNote` / `updateNote` 等，与 store 的 note 别名同理，是迁移遗留的兼容导出。

`movePage` 重新挂载页面时会更新整棵被移动子树的 `site` 字段，并通过 `isDescendant` 阻止把节点移动到自身后代下，防止形成环。

## 关键库模块

| 文件 | 职责 |
| --- | --- |
| `lib/storage.ts` | 持久化层（CRUD、序列化写、用量、变更监听） |
| `lib/notesCache.ts` | 后台上下文的内存工作区缓存 |
| `lib/markdownContent.ts` | 笔记内容归一化为 markdown（兼容旧版 ProseMirror JSON） |
| `lib/noteBackup.ts` | JSON 备份序列化/解析（`opennote.workspace.v1`）与 Markdown 导出 |
| `lib/appendMarkdown.ts` | 把捕获文本追加到已有笔记内容 |
| `lib/htmlToMarkdown.ts` | HTML → Markdown 转换（turndown） |
| `lib/capturePageSelection.ts` | 注入页面的函数：捕获选区为文本/HTML/Markdown |
| `lib/contextMenu.ts` | 构建/刷新右键菜单（静态 + 按站点动态项） |
| `lib/contextMenuSave.ts` | 把选区保存为新页面或追加到已有页面 |
| `lib/markdownInsert.ts` | CodeMirror 片段插入 |
| `lib/tableUtils.ts` | 生成 markdown 表格字符串 |
| `lib/noteSort.ts` | 站点笔记排序（置顶优先、按更新时间） |
| `lib/noteStats.ts` | 字数/行数统计、摘要、相对时间 |
| `lib/favicon.ts` | favicon URL（chrome `_favicon` API 或 Google s2 兜底） |
| `lib/tabSite.ts` | 从 URL 提取主机名 |
| `lib/siteInput.ts` | 规范化用户输入的域名/URL |
| `lib/extensionRuntime.ts` | 扩展上下文有效性检查与自动重载 |
| `lib/purgeLegacyContentScripts.ts` | 一次性清理旧版注册的 content script |

## 数据模型

详见 [data-model.md](data-model.md)。核心是「页面即文件夹」的嵌套树：站点（`type: 'site'`）是固定顶层根，页面（`type: 'page'`）可自由嵌套，每个节点都持有 markdown 内容并可拥有子节点。

## 浏览器扩展配置

Manifest（`public/manifest.json`）要点：

- MV3，名称/描述来自 `__MSG_*__`，`default_locale: zh_CN`。
- 权限：`storage`、`contextMenus`、`sidePanel`、`activeTab`、`tabs`、`notifications`、`favicon`、`scripting`；`host_permissions: <all_urls>`。
- 后台：`background.js`（module 类型 Service Worker）。
- `action` 打开侧边栏；`side_panel.default_path = index.html`。
