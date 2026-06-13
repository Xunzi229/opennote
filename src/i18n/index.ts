import { useEffect, useState } from 'react';

export const messages = {
  'zh-CN': {
    productName: '网巢笔记',
    productNameEnglish: 'WebNest',
    productSubtitle: '全局工作区',
    workspaceStats: '{sites} 个站点 · {pages} 个页面',
    currentSiteSection: '当前站点',
    favoritesSection: '收藏',
    pinnedSection: '固定',
    allSitesSection: '全部站点',
    quickSectionsSettings: '快捷区块',
    showFavoritesSection: '显示收藏',
    showPinnedSection: '显示固定',
    expandSection: '展开{section}',
    collapseSection: '折叠{section}',
    activeStatus: '活跃',
    siteReadyForNotes: '可开始记录',
    siteNoWorkspaceYet: '尚未创建工作区',
    emptyCurrentSiteHint: '打开网页或添加站点后即可记录。',
    emptyFavoritesHint: '收藏重要页面后会显示在这里。',
    emptyPinnedHint: '固定常用站点或页面后会显示在这里。',
    noTagsYet: '暂无标签',
    untitledPlaceholder: '未命名',
    editorViewMode: '编辑器视图模式',
    hideWorkspace: '隐藏工作区',
    showWorkspace: '显示工作区',
    unsupportedPage: '此页面不支持笔记',
    saveAsNote: '保存为笔记',
    newNote: '新建笔记',
    searchPlaceholder: '搜索站点或页面...',
    sortToggle: '切换排序',
    sortUpdated: '手动/更新',
    sortCreated: '按创建',
    sortTitle: '按标题',
    filterAll: '全部',
    filterPinned: '置顶',
    filterFavorite: '收藏',
    filterTagged: '有标签',
    locateCurrentSite: '定位到 {site}',
    currentSite: '当前站点：{site}',
    createPageInCurrentSite: '在当前站点新建页面',
    noMatchedPages: '没有匹配的页面',
    noPages: '还没有页面',
    expand: '展开',
    collapse: '折叠',
    renameByDoubleClick: '双击重命名',
    pageLastUpdated: '最后更新 {time}',
    createPageUnder: '在此节点下新建页面',
    createPageUnderLabel: '在 {title} 下新建页面',
    pinned: '已置顶',
    deletePage: '删除页面',
    deleteSite: '删除站点',
    exportJsonBackup: '导出 JSON 备份',
    exportMarkdown: '导出 Markdown',
    importJsonBackup: '导入 JSON 备份',
    import: '导入',
    localStorageUsed: '本地已用 {usage}',
    addSite: '添加站点',
    add: '添加',
    siteDomainOrUrl: '网站域名或 URL',
    sitePlaceholder: 'example.com 或 https://example.com',
    invalidSite: '请输入有效的网站域名或 URL',
    workspaceExported: '工作区已导出',
    exportFailed: '导出失败',
    markdownExported: 'Markdown 已导出',
    markdownExportFailed: 'Markdown 导出失败',
    importConfirm: '导入备份会替换当前所有本地页面，确定继续吗？',
    workspaceImported: '工作区已导入',
    importFailed: '导入失败',
    confirmDeletePage: '确定删除「{title}」及其所有子页面吗？此操作不可恢复。',
    confirmDeleteSite: '确定要删除站点 "{site}" 及其所有页面吗？此操作无法撤销。',
    thisPage: '这个页面',
    delete: '删除',
    cancel: '取消',
    confirm: '确认',
    ok: '确定',
    selectOrCreatePage: '选择或创建一个页面',
    newPage: '新建页面',
    saveFailed: '保存失败',
    pageDeleted: '页面已删除',
    addTag: '添加标签',
    tagAdded: '标签已添加',
    tagRemoved: '标签已移除',
    openPageOrAddSite: '请先打开一个网页或添加站点',
    pageCopied: '页面已复制',
    copyUnsupported: '当前浏览器不支持复制',
    pin: '置顶',
    unpin: '取消置顶',
    favorite: '收藏',
    moreActions: '更多操作',
    newChildPage: '新建子页面',
    copyPage: '复制页面',
    copyMarkdown: '复制 Markdown',
    markdownCopied: 'Markdown 已复制',
    copyTitle: '复制标题',
    titleCopied: '标题已复制',
    openSource: '打开来源',
    removeTag: '移除标签：{tag}',
    saving: '保存中...',
    saved: '已自动保存',
    lastEdited: '最后编辑 {time}',
    charsLines: '{chars} 字 · {lines} 行',
    tagName: '标签名称',
    tagPlaceholder: '输入标签名称',
    titleSaveFailed: '标题保存失败',
    editPageName: '编辑页面名称',
    fixedSiteTitle: '站点目录名称固定',
    edit: '编辑',
    livePreview: '实时渲染',
    editorPlaceholder: '开始编写 Markdown 笔记...',
    toolbarHeading2: '二级标题',
    toolbarHeading3: '三级标题',
    toolbarBold: '粗体',
    toolbarItalic: '斜体',
    toolbarBulletList: '无序列表',
    toolbarOrderedList: '有序列表',
    toolbarBlockquote: '引用',
    toolbarCodeBlock: '代码块',
    toolbarLink: '链接',
    toolbarDivider: '分割线',
    insertTable: '插入表格',
    chooseTableSize: '选择表格大小',
    storageQuotaExceeded: '存储空间不足，请删除部分页面',
    newPageTitle: '{date} 新页面',
    language: '语言',
    syncTitle: 'WebDAV 同步',
    syncSettings: '同步设置',
    syncServerUrl: '服务器地址',
    syncServerUrlPlaceholder: 'https://dav.example.com/dav',
    syncUsername: '用户名',
    syncUsernamePlaceholder: 'WebDAV 用户名',
    syncPassword: '密码',
    syncPasswordPlaceholder: 'WebDAV 密码',
    syncFolder: '备份目录',
    syncFolderPlaceholder: 'opennote',
    syncVerify: '检查连接',
    syncVerifySuccess: '连接正常',
    syncVerifyFailed: '连接失败：{error}',
    syncPush: '上传到云端',
    syncPull: '从云端拉取',
    syncPushSuccess: '已上传到云端',
    syncPullSuccess: '已从云端拉取',
    syncPushFailed: '上传失败：{error}',
    syncPullFailed: '拉取失败：{error}',
    syncPulling: '拉取中...',
    syncPushing: '上传中...',
    syncAutoUpload: '内容变更后自动上传',
    syncNeverSynced: '尚未同步',
    syncLastSynced: '上次同步 {time}',
    syncPullConfirm: '从云端拉取会用云端数据覆盖本地工作区、界面偏好和语言，确定继续吗？',
    syncNotConfigured: '请先填写 WebDAV 地址、用户名和密码',
    syncSaved: '同步配置已保存',
  },
  'en-US': {
    productName: 'WebNest',
    productNameEnglish: 'WebNest',
    productSubtitle: 'Global workspace',
    workspaceStats: '{sites} sites · {pages} pages',
    currentSiteSection: 'Current site',
    favoritesSection: 'Favorites',
    pinnedSection: 'Pinned',
    allSitesSection: 'All sites',
    quickSectionsSettings: 'Quick sections',
    showFavoritesSection: 'Show favorites',
    showPinnedSection: 'Show pinned',
    expandSection: 'Expand {section}',
    collapseSection: 'Collapse {section}',
    activeStatus: 'Active',
    siteReadyForNotes: 'Ready for notes',
    siteNoWorkspaceYet: 'No workspace yet',
    emptyCurrentSiteHint: 'Open a webpage or add a site.',
    emptyFavoritesHint: 'Star important pages for fast access.',
    emptyPinnedHint: 'Pin sites or pages you revisit often.',
    noTagsYet: 'No tags yet',
    untitledPlaceholder: 'Untitled',
    editorViewMode: 'Editor view mode',
    hideWorkspace: 'Hide workspace',
    showWorkspace: 'Show workspace',
    unsupportedPage: 'This page does not support notes',
    saveAsNote: 'Save as note',
    newNote: 'New note',
    searchPlaceholder: 'Search sites or pages...',
    sortToggle: 'Change sort',
    sortUpdated: 'Manual/Updated',
    sortCreated: 'Created',
    sortTitle: 'Title',
    filterAll: 'All',
    filterPinned: 'Pinned',
    filterFavorite: 'Favorites',
    filterTagged: 'Tagged',
    locateCurrentSite: 'Go to {site}',
    currentSite: 'Current site: {site}',
    createPageInCurrentSite: 'New page in current site',
    noMatchedPages: 'No matching pages',
    noPages: 'No pages yet',
    expand: 'Expand',
    collapse: 'Collapse',
    renameByDoubleClick: 'Double-click to rename',
    pageLastUpdated: 'Updated {time}',
    createPageUnder: 'New page under this node',
    createPageUnderLabel: 'New page under {title}',
    pinned: 'Pinned',
    deletePage: 'Delete page',
    deleteSite: 'Delete site',
    exportJsonBackup: 'Export JSON backup',
    exportMarkdown: 'Export Markdown',
    importJsonBackup: 'Import JSON backup',
    import: 'Import',
    localStorageUsed: 'Local storage used {usage}',
    addSite: 'Add site',
    add: 'Add',
    siteDomainOrUrl: 'Site domain or URL',
    sitePlaceholder: 'example.com or https://example.com',
    invalidSite: 'Enter a valid site domain or URL',
    workspaceExported: 'Workspace exported',
    exportFailed: 'Export failed',
    markdownExported: 'Markdown exported',
    markdownExportFailed: 'Markdown export failed',
    importConfirm: 'Importing a backup will replace all local pages. Continue?',
    workspaceImported: 'Workspace imported',
    importFailed: 'Import failed',
    confirmDeletePage: 'Delete "{title}" and all child pages? This cannot be undone.',
    confirmDeleteSite: 'Delete site "{site}" and all of its pages? This cannot be undone.',
    thisPage: 'this page',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    ok: 'OK',
    selectOrCreatePage: 'Select or create a page',
    newPage: 'New page',
    saveFailed: 'Save failed',
    pageDeleted: 'Page deleted',
    addTag: 'Add tag',
    tagAdded: 'Tag added',
    tagRemoved: 'Tag removed',
    openPageOrAddSite: 'Open a webpage or add a site first',
    pageCopied: 'Page copied',
    copyUnsupported: 'Clipboard is not available in this browser',
    pin: 'Pin',
    unpin: 'Unpin',
    favorite: 'Favorite',
    moreActions: 'More actions',
    newChildPage: 'New child page',
    copyPage: 'Duplicate page',
    copyMarkdown: 'Copy Markdown',
    markdownCopied: 'Markdown copied',
    copyTitle: 'Copy title',
    titleCopied: 'Title copied',
    openSource: 'Open source',
    removeTag: 'Remove tag: {tag}',
    saving: 'Saving...',
    saved: 'Autosaved',
    lastEdited: 'Last edited {time}',
    charsLines: '{chars} chars · {lines} lines',
    tagName: 'Tag name',
    tagPlaceholder: 'Enter tag name',
    titleSaveFailed: 'Title save failed',
    editPageName: 'Edit page name',
    fixedSiteTitle: 'Site directory name is fixed',
    edit: 'Edit',
    livePreview: 'Live preview',
    editorPlaceholder: 'Start writing Markdown notes...',
    toolbarHeading2: 'Heading 2',
    toolbarHeading3: 'Heading 3',
    toolbarBold: 'Bold',
    toolbarItalic: 'Italic',
    toolbarBulletList: 'Bulleted list',
    toolbarOrderedList: 'Numbered list',
    toolbarBlockquote: 'Quote',
    toolbarCodeBlock: 'Code block',
    toolbarLink: 'Link',
    toolbarDivider: 'Divider',
    insertTable: 'Insert table',
    chooseTableSize: 'Choose table size',
    storageQuotaExceeded: 'Storage is full. Delete some pages first.',
    newPageTitle: '{date} New page',
    language: 'Language',
    syncTitle: 'WebDAV Sync',
    syncSettings: 'Sync settings',
    syncServerUrl: 'Server URL',
    syncServerUrlPlaceholder: 'https://dav.example.com/dav',
    syncUsername: 'Username',
    syncUsernamePlaceholder: 'WebDAV username',
    syncPassword: 'Password',
    syncPasswordPlaceholder: 'WebDAV password',
    syncFolder: 'Backup folder',
    syncFolderPlaceholder: 'opennote',
    syncVerify: 'Test connection',
    syncVerifySuccess: 'Connection OK',
    syncVerifyFailed: 'Connection failed: {error}',
    syncPush: 'Upload to cloud',
    syncPull: 'Pull from cloud',
    syncPushSuccess: 'Uploaded to cloud',
    syncPullSuccess: 'Pulled from cloud',
    syncPushFailed: 'Upload failed: {error}',
    syncPullFailed: 'Pull failed: {error}',
    syncPulling: 'Pulling...',
    syncPushing: 'Uploading...',
    syncAutoUpload: 'Auto-upload after content changes',
    syncNeverSynced: 'Never synced',
    syncLastSynced: 'Last synced {time}',
    syncPullConfirm: 'Pulling will overwrite your local workspace, UI preferences, and language with cloud data. Continue?',
    syncNotConfigured: 'Enter the WebDAV URL, username, and password first',
    syncSaved: 'Sync settings saved',
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages['zh-CN'];

const DEFAULT_LOCALE: Locale = 'zh-CN';
const EN_LOCALE: Locale = 'en-US';

export const LOCALE_STORAGE_KEY = 'app-locale';

export const availableLocales: Locale[] = ['zh-CN', 'en-US'];

export const localeLabels: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
};

function loadPersistedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (value === 'zh-CN' || value === 'en-US') return value;
  } catch {
    // localStorage not available (extension context, etc.)
  }
  return null;
}

let persistedLocale: Locale | null = loadPersistedLocale();

export function setLocale(locale: Locale): void {
  persistedLocale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('applocalechange'));
  }
}

export function getLocaleFromLanguage(language: string | undefined | null): Locale {
  if (!language) return DEFAULT_LOCALE;
  return language.toLowerCase().startsWith('en') ? EN_LOCALE : DEFAULT_LOCALE;
}

export function getCurrentLocale(): Locale {
  // Persisted locale takes priority
  if (persistedLocale) return persistedLocale;
  // Fallback to browser language detection
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const english = languages.find((language) => language?.toLowerCase().startsWith('en'));
  return english ? EN_LOCALE : DEFAULT_LOCALE;
}

export function getMessage(key: MessageKey, locale = getCurrentLocale()): string {
  return messages[locale][key] ?? messages[DEFAULT_LOCALE][key];
}

export function t(
  key: MessageKey,
  variables?: Record<string, string | number>,
  locale = getCurrentLocale(),
): string {
  const template = getMessage(key, locale);
  if (!variables) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = variables[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * React hook that re-renders the component when the locale changes.
 * Call this in any component that uses `t()` to ensure it updates reactively.
 */
export function useLocale(): [Locale, (locale: Locale) => void] {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener('applocalechange', handler);
    return () => window.removeEventListener('applocalechange', handler);
  }, []);

  return [getCurrentLocale(), setLocale];
}
