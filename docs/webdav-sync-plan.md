# WebDAV 同步功能实现计划

Date: 2026-06-13

## 目标

为 WebNest / 网巢笔记 增加 WebDAV 同步,**内容(工作区页面树)与配置(UI 偏好 + 界面语言)都同步**,参考 `E:\github\open\opentab` 的 WebDAV 实现。

## 已确认的设计决策

| 项 | 决定 |
| --- | --- |
| 触发方式 | 手动「上传到云端」「从云端拉取」按钮 + 本地内容变更后**防抖自动上传** |
| 拉取 | 始终手动(避免意外覆盖本地) |
| 同步范围 | 内容(页面树)+ `meta`(UI 偏好)+ 界面语言。**WebDAV 连接配置只存本地,不进同步** |
| 云端保留 | 每个文件只留一份,覆盖式(无时间戳历史) |
| 拆分 | **按站点拆分**,只上传变更的文件,不全量上传 |
| 入口 | 侧边栏底部工具栏加同步图标 → 设置弹窗(沿用现有 Dialog 风格) |
| 冲突策略 | 单份备份,最后写入胜出(last-write-wins) |
| 密码 | AES-GCM 加密后存本地(移植 opentab crypto) |

## 云端文件布局

配置一个 WebDAV 基地址 + 一个目录(默认 `opennote`):

```
<webdavUrl>/<dir>/
├── index.json              ← 清单：每个文件的 hash + 更新时间
├── config.json             ← { meta, locale }
└── sites/
    ├── example.com.json    ← 该站点的页面子树（按 site 分组）
    ├── github.com.json
    └── ...
```

- 内容按 `PageNode.site` 分组,每站点一个文件。改某站点笔记 → 只传那个站点文件 + index.json。
- 改语言/UI 偏好 → 只传 config.json + index.json。
- `index.json` 记录每个逻辑文件的 hash,推/拉时对比 hash 决定哪些文件需要传输,实现增量同步。

## 增量同步算法

**推送(push,手动或自动):**
1. 从 workspace 按 `site` 分组 + 组装 config(meta + locale)。
2. 对每个文件内容算 hash(轻量字符串 hash)。
3. 读本地 `sync_state`(上次同步的各文件 hash)。
4. 仅 hash 变化/新增的文件 `PUT`;本地已删除的站点 → 远端 `DELETE`。
5. 最后上传更新后的 `index.json`,并写回 `sync_state`。

**拉取(pull,仅手动):**
1. `GET index.json`。
2. 对比远端 hash 与本地,下载有差异的文件。
3. 重组完整 workspace → `setWorkspace`;应用 config(`setMeta` + `setLocale`)。
4. 刷新 store(`loadWorkspace`),写回 `sync_state`。

**自动上传:** 订阅 store 的 workspace 变更,防抖(~4s)后调用 push;仅在已配置 WebDAV 时生效;拉取过程用标志位屏蔽,避免回环。

## 新增 / 改动文件

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `src/lib/crypto.ts` | 新增 | 移植 opentab:AES-GCM 加解密,密钥存 `chrome.storage.local` |
| `src/lib/webdav.ts` | 新增 | WebDAV 客户端:PUT/GET/PROPFIND/MKCOL/DELETE,Basic Auth,目录自动创建。移植并精简自 opentab |
| `src/lib/syncConfig.ts` | 新增 | WebDAV 配置类型 + 读写(密码加密),存 `chrome.storage.local` 的 `webdav_config` 键 |
| `src/lib/syncPayload.ts` | 新增 | 按站点分组、组装 config、hash 计算、拉取时重组 workspace |
| `src/services/webdavSync.ts` | 新增 | push/pull 编排 + 增量 + `sync_state` + 连接校验 |
| `src/hooks/useAutoSync.ts` | 新增 | 防抖自动上传,订阅 store |
| `src/components/SyncSettingsDialog.tsx` | 新增 | 设置弹窗:地址/账号/密码/目录、校验连接、上传、拉取、状态与上次同步时间 |
| `src/components/Sidebar.tsx` | 改 | 底部工具栏加同步图标按钮 + 渲染弹窗 |
| `src/App.tsx` | 改 | 挂载 `useAutoSync()` |
| `src/i18n/index.ts` | 改 | 新增同步相关文案(zh-CN + en-US 对齐) |

`manifest.json` 无需改动:`host_permissions: <all_urls>` 已覆盖扩展页面对任意 WebDAV 服务器的跨域 fetch。

## 数据类型(草案)

```ts
// syncConfig.ts
interface WebdavConfig {
  url: string;        // WebDAV 基地址
  username: string;
  password: string;   // 内存中明文；落盘时 AES-GCM 加密
  directory: string;  // 远端目录，默认 "opennote"
  enabled: boolean;   // 是否启用自动上传
}

// index.json
interface SyncIndex {
  version: 1;
  updatedAt: number;
  files: Record<string, { hash: string; updatedAt: number }>;
  // 键如 "config" / "sites/example.com"
}
```

## 测试

- `crypto.test.ts`:加解密往返。
- `webdav.test.ts`:mock fetch,验证 auth header、URL 拼接、各方法、404/错误处理。
- `syncPayload.test.ts`:按站点分组正确、hash 稳定、拉取重组 workspace 还原。
- `webdavSync.test.ts`:mock webdav + storage,验证**增量**(仅变更文件被 PUT)、删除站点会 DELETE 远端、pull 重组并应用 config。
- 复用现有 `fake-indexeddb` setup。

## 验证

```bash
npm test -- --run
npm run lint
npm run build
```

手动:配置一个 WebDAV(如坚果云/Nextcloud),校验连接 → 上传 → 在另一处拉取 → 改一条笔记确认只增量上传该站点文件 → 改语言确认只传 config。

## 安全说明

- 密码 AES-GCM 加密后落盘,密钥在本机 `chrome.storage.local`(与 opentab 一致;注意这是本机混淆级保护,非零知识加密)。
- WebDAV 连接配置不进云端快照。
- 同步为明文 JSON 上传到用户自己的 WebDAV 服务器;不经任何第三方。
- 拉取采用整体重组 + 最后写入胜出,会覆盖本地未上传的改动——UI 上对「拉取」给出明确提示。
