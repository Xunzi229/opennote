# WebNest / 网巢笔记

WebNest, 中文名“网巢笔记”，是一个 Chrome Manifest V3 侧边栏扩展，用于把网页、站点和笔记整理成可嵌套的工作区。

OpenNote 是底层项目/系统代号；面向用户展示的工具名称是 WebNest / 网巢笔记。

## Features

- Notion-like workspace tree: sites are fixed top-level roots, pages can nest freely.
- Page-as-folder model: every node can hold content and child pages.
- Current-site creation: only creates a site root when a page is created.
- Markdown editing with live rendering and source editing.
- Right-click selection save from webpages.
- Local JSON backup, Markdown export, and JSON import.
- Browser-language UI: Chinese by default, English for English browser languages.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Install Locally

1. Run `npm run build`.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click “Load unpacked”.
5. Select the `dist/` directory.

## Privacy

WebNest stores notes locally in `chrome.storage.local`. It reads the current tab URL and title only when the side panel or right-click save workflow needs them. Selected page content is captured only after the user explicitly uses the context menu action.

## License

MIT
