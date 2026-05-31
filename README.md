# OpenNote - 浏览器笔记插件

一个 Chrome Manifest V3 侧边栏浏览器插件，用于按网站分类存储富文本笔记。

## 功能特性

- **右侧分窗显示**：点击浏览器工具栏图标或右键菜单，侧边栏从右侧弹出
- **按网站分类**：笔记按 hostname 自动分类，自动检测当前标签页网站
- **富文本编辑**：基于 TipTap/ProseMirror，支持加粗、列表、段落等格式
- **自动保存**：2 秒防抖自动保存，状态指示器显示保存进度
- **多笔记支持**：每个网站可创建多条笔记，支持切换、预览、删除
- **搜索过滤**：支持按网站名称和笔记内容搜索
- **右键快速保存**：选中网页文字 → 右键"保存为笔记" → 自动打开侧边栏并预填内容
- **暗色模式**：自动跟随系统主题切换

## 技术栈

- **构建工具**：Vite + React 19 + TypeScript
- **样式**：Tailwind CSS v4
- **富文本编辑器**：TipTap (ProseMirror)
- **状态管理**：Zustand
- **存储**：Chrome Storage API (local + session)
- **测试**：Vitest + React Testing Library

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建扩展
npm run build

# 运行测试
npm test
```

## 安装使用

1. 运行 `npm run build` 构建扩展
2. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist/` 目录

## 使用方式

### 打开侧边栏

- **工具栏图标**：点击浏览器工具栏上的 OpenNote 图标，侧边栏从右侧弹出
- **右键菜单**：在任意网页上选中文字 → 右键选择"保存为笔记" → 侧边栏自动打开并预填选中内容

### 创建和编辑笔记

1. 打开任意网站（如 `github.com`）
2. 点击工具栏图标打开侧边栏
3. 插件自动检测当前网站并选中
4. 点击"新建笔记"按钮
5. 在 TipTap 编辑器中输入内容（支持 Markdown 快捷键）
6. 编辑器自动保存（2 秒防抖），状态显示"已保存"

### 管理多条笔记

- 左侧网站列表显示每个网站的笔记数量
- 右侧笔记列表显示当前网站的所有笔记（时间戳 + 内容预览）
- 点击笔记卡片切换编辑
- 悬停笔记卡片显示删除按钮

### 搜索和切换网站

- 左侧搜索框支持按网站名称过滤
- 点击左侧网站列表切换到其他网站的笔记
- 点击"添加网站"手动添加其他网站

### 暗色模式

插件自动跟随系统主题切换明暗模式，无需手动配置。

## 权限说明

- `storage`：持久化笔记数据
- `contextMenus`：右键菜单快速保存
- `sidePanel`：打开侧边栏界面
- `activeTab` + `tabs`：获取当前标签页 hostname
- `scripting`：在用户右键保存选区时临时读取当前页面选中的 HTML/文本，用于尽量保留列表、链接等格式
- `host_permissions: <all_urls>`：允许右键选区保存功能在普通网页上执行；扩展不会主动扫描所有网页
- `favicon`：在站点列表和笔记列表中显示网站图标
- `notifications`：在 `chrome://` 等特殊页面无法保存笔记时给出提示

## 隐私说明

- 笔记默认只保存在本机的 `chrome.storage.local` 中。
- 当前版本没有账号、云同步或远程上传逻辑。
- 只有在用户主动点击扩展、打开侧边栏或使用右键菜单保存选区时，扩展才会读取当前标签页信息。
- 右键保存选区时会读取用户选中的文本/HTML，并转换成笔记内容；未选中的页面内容不会被保存。
- JSON 备份、Markdown 导出和 JSON 导入都只在用户主动点击时执行；当前版本没有云同步。

## 项目结构

```
src/
├── background.ts          # Service Worker（右键菜单、侧边栏打开）
├── components/
│   ├── EditorPanel.tsx    # 右侧编辑面板
│   ├── Sidebar.tsx        # 左侧网站列表
│   ├── SiteItem.tsx       # 网站列表项
│   └── TipTapEditor.tsx   # 富文本编辑器
├── lib/
│   └── storage.ts         # Chrome Storage 封装
├── store/
│   └── notesStore.ts      # Zustand 状态管理
├── types/
│   └── index.ts           # TypeScript 类型定义
└── App.tsx                # 根组件
```

## 测试

```bash
npm test
```

当前测试覆盖：
- 存储工具函数（getNotes, setNotes, addNote, updateNote, deleteNote）
- Zustand store（状态管理、过滤逻辑）

## License

MIT
