# 数据模型

本文档描述 WebNest / 网巢笔记的数据结构。所有类型定义见 `src/types/index.ts`。

## 设计思想：页面即文件夹

数据模型是一棵类 Notion 的嵌套树：

- **站点（site）** 是固定的顶层根节点，标题为主机名，不可重命名。
- **页面（page）** 可以自由嵌套在站点或其它页面之下。
- 每个节点都持有 markdown 内容，并且都可以拥有子节点 —— 没有单独的「文件夹」概念，任何页面本身就是其子页面的容器。

站点根节点是**惰性创建**的：只有当某个站点下首次创建页面（或用户手动「添加站点」）时才会生成。

## 核心类型

### PageNode

工作区中每个节点（站点或页面）都是一个 `PageNode`：

```ts
interface PageNode {
  id: string;            // 站点为 `site:<hostname>`，页面为 crypto.randomUUID()
  type: 'site' | 'page';
  site: string;          // 所属站点主机名
  parentId: string | null; // 站点根为 null
  title: string;         // 站点根固定为主机名
  content: NoteContent;  // markdown 字符串（兼容旧版 ProseMirror JSON 对象）
  sortIndex: number;     // 同级排序
  collapsed?: boolean;   // 树中是否折叠
  source?: NoteSource;   // 由网页选区捕获而来时的来源信息
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;      // 置顶
  favorite?: boolean;    // 收藏
  tags?: string[];
}
```

### NoteContent

```ts
type NoteContent = string | Record<string, unknown>;
```

当前内容以 markdown 字符串存储。对象形式仅用于兼容旧版本的 ProseMirror JSON，读取时由 `lib/markdownContent.ts` 的 `contentToMarkdown` 归一化为字符串。

### NoteSource

通过右键菜单从网页捕获选区时记录的来源：

```ts
interface NoteSource {
  pageUrl: string;
  pageTitle?: string;
  capturedAt: number;
  hostname: string;
}
```

### WorkspaceStore

整个工作区是一个扁平的 id → 节点映射，加一个根节点 id 列表：

```ts
interface WorkspaceStore {
  pages: Record<string, PageNode>; // 所有节点（站点 + 页面）
  rootIds: string[];               // 站点根节点 id 列表
}
```

树结构通过 `parentId` 表达，而非嵌套数组。这样查找单节点是 O(1)，子节点通过遍历 `pages` 按 `parentId` 匹配获得。

### MetaStore

UI 偏好与版本信息，单独存于 `meta` 键：

```ts
interface MetaStore {
  lastActiveSite: string | null;
  version: number;
  showSidebar?: boolean;
  showNoteList?: boolean;
  showFavoritesSection?: boolean;
  showPinnedSection?: boolean;
  favoritesSectionCollapsed?: boolean;
  pinnedSectionCollapsed?: boolean;
}
```

## 树相关辅助类型

```ts
type PageFilter = 'all' | 'pinned' | 'favorite' | 'tagged';
type PageSortMode = 'updated' | 'created' | 'title';

interface TreeRow {       // 虚拟滚动用的拍平行
  page: PageNode;
  depth: number;
  hasChildren: boolean;
}
```

## 向后兼容别名

以下别名指向 `PageNode` 系列，是从早期「按站点扁平笔记」模型迁移时保留的兼容命名：

```ts
type Note = PageNode;
type NoteFilter = PageFilter;
type NoteSortMode = PageSortMode;
```

`store` 与 `storage` 层也有对应的 `note*` 方法别名，详见 [architecture.md](architecture.md)。

## 持久化布局

数据存储分两层：页面数据在 **IndexedDB**，少量配置与变更信号在 `chrome.storage.local`。

### IndexedDB（`opennote` 数据库，version 1）

| Object Store | keyPath | 内容 |
| --- | --- | --- |
| `pages` | `id` | 每个 `PageNode` 一条记录（站点 + 页面） |
| `kv` | `key` | `{ key: 'rootIds', value: string[] }` —— 站点根 id 列表 |

封装见 `src/lib/idb.ts`：所有写入（`put` / `delete` / 全量替换）都在**单个 `readwrite` 事务**内完成以保证原子性；无 IndexedDB 环境（部分测试 / SW 边缘场景）时退回内存 Map。

每次改动只 `put` / `delete` **受影响的页面**，不再整库覆盖。删除子树用一个事务批量 `delete`。

### chrome.storage.local

| 键 | 内容 |
| --- | --- |
| `workspace_rev` | 变更信号（单调递增字符串），写完 IDB 后递增 |
| `meta` | `MetaStore`（UI 偏好、版本） |
| `workspace` | **旧版遗留键**，迁移后默认保留一版作为安全网，下个版本清理 |

### 跨上下文同步

IndexedDB 没有跨上下文变更事件，因此各上下文（面板 UI store、后台 `notesCache`、右键 `contextMenu`）统一监听 `chrome.storage.onChanged` 中的 `workspace_rev` 信号，触发后重新 `getWorkspace()` 从 IDB 读取。写入方在事务完成后调用 `bumpRevision()` 递增信号。

### 一次性迁移

首次调用 `getWorkspace()` 时，`migrateFromChromeStorageIfNeeded()` 把旧的 `chrome.storage.local.workspace` 整库搬入 IndexedDB：

1. 若 IDB 已有 `rootIds` 标记 → 已迁移过，跳过。
2. 读取旧 `workspace` → 单事务写入 IDB → **校验页面数量一致**才视为成功；不一致则抛错并保留旧数据，绝不静默丢失。
3. 旧 `workspace` 键**不删除**，作为回滚安全网保留一个版本。

### 存储用量

`getWorkspaceStorageUsage()` 改用 `navigator.storage.estimate()` 读取磁盘配额；无该 API 时退回按序列化页面估算。

### 备份格式

备份导出的 JSON 格式标记为 `opennote.workspace.v1`（导入逻辑不变，见 `lib/noteBackup.ts`）。
