# WebNest / 网巢笔记 — 项目文档

> WebNest（中文「网巢笔记」）是一个 Chrome Manifest V3 **侧边栏扩展**，把网页、站点和笔记整理成可嵌套的工作区。
> `OpenNote` 是底层项目 / 系统代号；面向用户展示的名称是 **WebNest / 网巢笔记**。

本目录汇总当前实现的功能、架构与开发约定。文档以当前代码为准，旧的设计 / 计划文档（`superpowers/`、`opennote-optimization-plan.md`）保留作历史参考，可能与现状不符。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [features.md](./features.md) | 功能清单：工作区树、编辑器、侧边栏、收藏 / 固定、备份导入导出、右键采集 |
| [architecture.md](./architecture.md) | 架构：入口、状态管理、组件职责、扩展后台、构建产物 |
| [data-model.md](./data-model.md) | 数据模型与存储层：`PageNode`、工作区结构、`chrome.storage` 持久化、备份格式 |
| [development.md](./development.md) | 开发、构建、测试、版本号、本地安装流程 |
| [i18n.md](./i18n.md) | 国际化：应用内多语言、清单多语言、语言切换与检测 |

## 技术栈速览

- **UI**：React 19 + TypeScript + Tailwind CSS v4
- **状态**：Zustand 单一 store（`useNotesStore`）
- **编辑器**：CodeMirror 6（源码模式）+ TipTap / ProseMirror（实时渲染模式）
- **持久化**：`chrome.storage.local`
- **构建**：Vite（应用与后台各一套配置）+ Vitest 测试
- **扩展形态**：MV3 侧边栏 + 后台 Service Worker + 右键菜单

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm test         # 运行测试
npm run build    # 产出 dist/，可在 chrome://extensions/ 加载未打包扩展
```

详见 [development.md](./development.md)。
