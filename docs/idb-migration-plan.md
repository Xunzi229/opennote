# IndexedDB 存储迁移计划

Date: 2026-06-12

## 目标

把工作区数据从 `chrome.storage.local` 的单键整库 JSON,迁移到 IndexedDB 的按页面分条存储,解决两个问题:

1. **配额限制**:`chrome.storage.local` 默认 ~10MB;IndexedDB 按磁盘配额(GB 级)。
2. **整库覆盖写**:当前每次改动都序列化并写整个 `workspace`;改为按 `PageNode` 增量 `put`/`delete`。

**硬约束:历史数据不能丢。** 迁移采用「校验通过才清旧数据 + 旧数据默认保留一版」的双保险。

## 架构关键点

- 所有数据访问已收口在 `src/lib/storage.ts`,其余模块(`notesStore`、`Sidebar`、`contextMenuSave`、`notesCache`、`contextMenu`、`usePendingNoteSelect`)只消费它的导出函数。
- 跨上下文同步靠 `chrome.storage.onChanged`(三处:UI store、后台 notesCache、右键 contextMenu)。
- **IndexedDB 没有跨上下文变更事件**,因此保留 `chrome.storage.local` 中一个极小的「变更信号」键 `workspace_rev`,写完 IDB 后递增它,各上下文监听该信号后重新从 IDB 读取。现有同步架构几乎不变。

## 目标数据布局

```
IndexedDB: opennote (db, version 1)
├── object store "pages"  keyPath "id"   ← 每个 PageNode 一条
└── object store "kv"     keyPath "key"  ← { key:'rootIds', value:string[] }

chrome.storage.local
├── "workspace_rev": <number>   ← 仅变更信号(不再存数据)
├── "meta":          MetaStore  ← 不变(很小)
└── "workspace":     <legacy>   ← 迁移后默认保留一版,下个版本再清理
```

## 改动清单

| 文件 | 改动 | 风险 |
| --- | --- | --- |
| `src/lib/idb.ts` | 新增:IndexedDB 封装 + 无 IDB 时内存兜底 | 低 |
| `src/lib/storage.ts` | 内部重写,**所有导出签名不变** | 中(核心) |
| `src/lib/notesCache.ts` | 监听键 `WORKSPACE_KEY` → `REV_KEY`,改为重读 | 低 |
| `src/lib/contextMenu.ts` | 同上 | 低 |
| `src/test/setup.ts` | 引入 `fake-indexeddb/auto` | 低 |
| `src/lib/storage.test.ts` | 更新用量断言 + 兜底用例 | 低 |
| `src/lib/idb.test.ts` | 新增:封装 + 迁移单测 | 低 |
| `package.json` | devDependency: `fake-indexeddb` | 低 |

`notesStore.ts` / `Sidebar.tsx` / `contextMenuSave.ts` / `usePendingNoteSelect.ts` **无需改动**——它们始终拿完整 `WorkspaceStore`,变更后本就全量重读。

## 实现步骤

### 1. `src/lib/idb.ts`(新增)

- `openDB()`:懒打开,`onupgradeneeded` 建 `pages`/`kv` 两个 store;`onclose` 重置连接(SW 被杀后重连)。
- `idbGetAllPages()`、`idbGetKv<T>(key)`、`idbWrite({ putPages?, deletePageIds?, kv? })`(单 `readwrite` 事务保证原子)、`idbClear()`。
- `indexedDB === undefined` 时退回内存 Map(类似现有 `memoryStorage`),零环境依赖。

### 2. `src/lib/storage.ts`(重写内部)

- 新增 `REV_KEY = 'workspace_rev'` 与 `bumpRevision()`。
- `getWorkspace()`:先 `migrateFromChromeStorageIfNeeded()`,再 `idbGetAllPages()` + `idbGetKv('rootIds')` 组装成 `WorkspaceStore`,经 `normalizeWorkspace` 返回。
- 写函数(`addPage`/`updatePageContent`/`updatePageTitle`/`updatePageMeta`/`deletePage`/`movePage`/`ensureSiteRoot`):在 `queueWorkspaceWrite` 内读取→改动→`idbWrite` 增量写(只写受影响页面 + rootIds)→`bumpRevision()`。
- `setWorkspace()`:整库替换(供导入/测试用)。
- `importWorkspaceBackup()`:`idbClear()` → 写全部 → `bumpRevision()`。
- `getWorkspaceStorageUsage()`:改用 `navigator.storage.estimate()`(`{ usage, quota }`),无该 API 时退回估算。
- `onWorkspaceChange()`:监听 `REV_KEY` 变更 → `getWorkspace().then(cb)`。

### 3. 一次性迁移 `migrateFromChromeStorageIfNeeded()`

```
若内存标记已迁移 → 跳过
若 IDB 已有 rootIds → 跳过(已迁移过)
读 chrome.storage.local 的 legacy "workspace"
  ├─ 有数据 → 写入 IDB → 校验 IDB 页面数 === legacy 页面数
  │             ├─ 一致 → 成功(legacy 键保留,下个版本再删)
  │             └─ 不一致 → 抛错,保留 legacy,不破坏任何数据
  └─ 无数据 → 写入空 rootIds 标记已初始化
```

校验失败绝不静默丢数据。

### 4. 同步消费端

- `notesCache.ts`:`onChanged` 判断改为 `changes[REV_KEY]`,触发后 `getWorkspace()` 刷新 `cache`。
- `contextMenu.ts`:`onChanged` 判断改为 `changes[REV_KEY]`,其余刷新逻辑不变。

### 5. 测试

- `setup.ts` 顶部 `import 'fake-indexeddb/auto'`,让所有测试拥有真实 IDB。
- `storage.test.ts`:大部分断言走 `getWorkspace()`,自动适配;更新 `getWorkspaceStorageUsage` 断言为 `navigator.storage.estimate` mock;调整「chrome 不可用」兜底用例。
- 新增 `idb.test.ts`:覆盖增量写/删子树/迁移路径(塞 legacy → getWorkspace → 断言数据完整且 legacy 仍在)。

## 验证

```bash
npm test -- --run     # 全部测试通过(含迁移单测)
npm run lint
npm run build         # 类型检查 + 双构建
```

手动:加载 `dist/`,验证旧数据出现(迁移成功)、新建/编辑/删除生效、右键菜单刷新、多面板同步、用量读数正常。

## 回滚

- legacy `workspace` 键默认保留,迁移异常时数据原封不动。
- 用户可提前用界面「导出 JSON 备份」兜底,异常时「导入」还原。
