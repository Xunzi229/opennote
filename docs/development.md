# 开发指南

## 环境准备

```bash
npm install
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（仅侧边栏 UI，便于在浏览器中调试组件） |
| `npm test` | 运行 Vitest（jsdom 环境，watch 模式） |
| `npm test -- --run` | 单次运行全部测试 |
| `npm run lint` | ESLint 检查 |
| `npm run build` | 完整构建扩展（见下文，默认不自增版本号） |
| `npm run build:release` | 自增 patch 版本号后构建（发布用） |
| `npm run preview` | 预览构建产物 |

## 构建流程

`npm run build` 依次执行：

```
tsc -b                       # 类型检查
&& vite build                # 构建侧边栏 UI → dist/
&& vite build --config vite.extension.config.ts  # 构建 service worker → dist/background.js
```

### 版本号自增

默认构建**不会**修改版本号。需要发布新版本时，任选其一：

- `npm run build:release` — 自增 patch 后构建
- `npm run build -- --bump-version`（或 `-b`）— 带参数构建
- `BUMP_VERSION=1 npm run build` — 通过环境变量开启

`scripts/bump-version.cjs` 会把 patch 版本号 +1，并同步写回 `package.json` 与 `public/manifest.json`，保证两者始终一致。

### 两套 Vite 配置

- **`vite.config.ts`（UI）**：使用 React 插件，输出到 `dist`（`emptyOutDir: true`）。入口为 `index.html`。`manualChunks` 将依赖拆分为 `react` / `ui-vendor`（lucide-react、sonner、zustand）/ `vendor`。重型编辑器分块（`editor-codemirror`、`editor-tiptap`）被刻意排除在 HTML 预加载之外，实现懒加载。
- **`vite.extension.config.ts`（扩展后台）**：无 React 插件，`emptyOutDir: false`（追加到 UI 构建之上），`minify: false`。单入口 `src/background.ts` → `background.js`。自定义 `closeBundle` 插件会删除残留的 `dist/content.js`。

## 本地安装调试

1. 运行 `npm run build`。
2. 打开 `chrome://extensions/`。
3. 开启「开发者模式」。
4. 点击「加载已解压的扩展程序」。
5. 选择 `dist/` 目录。

点击工具栏图标即可打开侧边栏。

## 测试约定

- 测试框架：Vitest 4 + jsdom + Testing Library + jest-dom。
- 配置见 `vitest.config.ts`（`environment: jsdom`，`globals: true`，`setupFiles: ['./src/test/setup.ts']`）。
- 测试文件与源码**同目录放置**（`*.test.ts` / `*.test.tsx`）。

新增功能或修复 bug 时请补充对应测试。提交前应保证 `lint`、`test`、`build` 三者均通过。

## 技术栈

- React 19 + TypeScript ~6.0
- Vite 8
- Tailwind CSS v4（`@tailwindcss/postcss`）
- Zustand 5（状态管理）
- CodeMirror 6（源码编辑）
- TipTap 3 / ProseMirror（实时渲染编辑）
- turndown（HTML → Markdown）
- sonner（toast 提示）
- lucide-react（图标）

## 目录速查

```
src/
  main.tsx              React 入口
  App.tsx               根组件，懒加载 Sidebar + EditorPanel
  background.ts         扩展 service worker 入口
  index.css             全局样式 / Tailwind / 主题变量
  types/index.ts        全部共享类型
  store/notesStore.ts   唯一的 Zustand store
  i18n/index.ts         国际化
  components/           UI 组件
  hooks/                React hooks
  lib/                  持久化与工具逻辑
  test/setup.ts         测试环境初始化
public/
  manifest.json         MV3 清单
  _locales/             清单级 i18n（en / zh_CN）
  icon-*.png 等         图标资源
```

各模块职责详见 [architecture.md](architecture.md)。
