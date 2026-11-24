import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Briefcase,
  Flame,
  Github,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { CATEGORIES, DEFAULT_SITES } from './data/defaultSites';
import type { AppMode, HealthResult, SiteItem } from './types';
import { cleanSearchQuery } from './utils/cleanQuery';
import { checkSiteHealth } from './utils/healthCheck';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { SiteCard } from './components/SiteCard';
import { SiteModal } from './components/SiteModal';

const STORAGE_SITES_KEY = 'nyanavi_sites_v1';
const STORAGE_MODE_KEY = 'nyanavi_mode_v1';
const STORAGE_THEME_KEY = 'nyanavi_theme_v1';

function loadInitialSites(): SiteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_SITES_KEY);
    if (!raw) return DEFAULT_SITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore corrupted local storage
  }
  return DEFAULT_SITES;
}

export default function App() {
  const [sites, setSites] = useState<SiteItem[]>(loadInitialSites);
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    return saved === 'work' ? 'work' : 'nsfw';
  });
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved) return saved === 'dark';
    return false;
  });

  const [activeSection, setActiveSection] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [healthMap, setHealthMap] = useState<Record<string, HealthResult>>({});
  const [batchChecking, setBatchChecking] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // 持久化站点、模式与主题
  useEffect(() => {
    localStorage.setItem(STORAGE_SITES_KEY, JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    document.title =
      mode === 'work' ? 'NyaDesk · 开发与效率工作台' : 'NyaNavi · 二次元与 ACG 精选导航';
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // 快捷键 Alt+W 秒切 工作模式 / NSFW 模式
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setMode((prev) => {
          const next = prev === 'work' ? 'nsfw' : 'work';
          showToast(next === 'work' ? '已切换至工作模式（隐藏 NSFW 站点）' : '已切换至 NSFW 完整模式');
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showToast]);

  // 切换工作模式时，若当前选中了 NSFW 专属分类，自动切回全部
  useEffect(() => {
    if (mode === 'work') {
      const cat = CATEGORIES.find((c) => c.id === activeSection);
      if (cat?.nsfwOnly) {
        setActiveSection('all');
      }
    }
  }, [mode, activeSection]);

  // 当前模式下可见的全部站点
  const modeSites = useMemo(() => {
    return mode === 'work' ? sites.filter((s) => !s.nsfw) : sites;
  }, [sites, mode]);

  // 分类计数
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of modeSites) {
      map[s.category] = (map[s.category] || 0) + 1;
    }
    return map;
  }, [modeSites]);

  const pinnedSites = useMemo(() => modeSites.filter((s) => s.pinned), [modeSites]);

  const cleanedQuery = useMemo(() => cleanSearchQuery(query).cleaned, [query]);

  // 根据搜索词与侧边栏选中项过滤
  const filteredSites = useMemo(() => {
    let list = modeSites;
    if (activeSection === 'pinned') {
      list = list.filter((s) => s.pinned);
    } else if (activeSection !== 'all') {
      list = list.filter((s) => s.category === activeSection);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const haystack = [
        s.name,
        s.shortName || '',
        s.url,
        s.description,
        s.costLabel,
        ...(s.tags || []),
        ...(s.clients || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [modeSites, activeSection, query]);

  // 按分类分组展示（当选中 "all" 且无搜索词时，呈现类似 acgbox 的清晰分区）
  const groupedSections = useMemo(() => {
    if (activeSection !== 'all') {
      const meta =
        activeSection === 'pinned'
          ? {
              id: 'pinned',
              name: '我的收藏 / 置顶',
              description: '你标记星标的常用入口',
            }
          : CATEGORIES.find((c) => c.id === activeSection);

      return [
        {
          id: activeSection,
          title:
            meta && 'workName' in meta && mode === 'work' && meta.workName
              ? meta.workName
              : meta?.name || '站点列表',
          description: meta?.description || '',
          items: filteredSites,
        },
      ];
    }

    if (query.trim()) {
      return [
        {
          id: 'search-results',
          title: `站内匹配结果（${filteredSites.length}）`,
          description: '也可直接点击上方搜索栏中的站点胶囊，带清洗关键词站外直搜',
          items: filteredSites,
        },
      ];
    }

    const sections: Array<{
      id: string;
      title: string;
      description: string;
      items: SiteItem[];
    }> = [];

    if (pinnedSites.length > 0) {
      sections.push({
        id: 'pinned-top',
        title: '常用置顶',
        description: '星标收藏的高频站点',
        items: pinnedSites,
      });
    }

    for (const cat of CATEGORIES) {
      if (mode === 'work' && cat.nsfwOnly) continue;
      const items = modeSites.filter((s) => s.category === cat.id);
      if (items.length === 0) continue;
      sections.push({
        id: cat.id,
        title: mode === 'work' && cat.workName ? cat.workName : cat.name,
        description: cat.description,
        items,
      });
    }

    return sections;
  }, [activeSection, filteredSites, mode, modeSites, pinnedSites, query]);

  // 单站连通性检测
  const handleCheckSingle = useCallback(async (site: SiteItem) => {
    setHealthMap((prev) => ({
      ...prev,
      [site.id]: { ...prev[site.id], state: 'checking' },
    }));
    const result = await checkSiteHealth(site.url);
    setHealthMap((prev) => ({
      ...prev,
      [site.id]: result,
    }));
  }, []);

  // 批量连通性检测（限流并发 5，自动覆盖当前可见站点）
  const handleBatchCheck = useCallback(async () => {
    if (batchChecking) return;
    const targets = activeSection === 'all' && !query.trim() ? modeSites : filteredSites;
    if (targets.length === 0) return;

    setBatchChecking(true);
    showToast(`开始检测 ${targets.length} 个站点的连通性...`);

    const queue = [...targets];
    const concurrency = 5;

    const worker = async () => {
      while (queue.length > 0) {
        const site = queue.shift();
        if (!site) break;
        await handleCheckSingle(site);
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    setBatchChecking(false);
    showToast(`已完成 ${targets.length} 个站点的连通性检测`);
  }, [activeSection, batchChecking, filteredSites, handleCheckSingle, modeSites, query, showToast]);

  // 统计当前已测站点结果
  const healthSummary = useMemo(() => {
    let online = 0;
    let warn = 0;
    let offline = 0;
    for (const s of modeSites) {
      const st = healthMap[s.id]?.state;
      if (st === 'online') online++;
      else if (st === 'warn') warn++;
      else if (st === 'offline') offline++;
    }
    return { online, warn, offline, total: online + warn + offline };
  }, [healthMap, modeSites]);

  // CRUD 操作
  const handleTogglePin = useCallback((id: string) => {
    setSites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    );
  }, []);

  const handleSaveSite = useCallback(
    (site: SiteItem) => {
      setSites((prev) => {
        const exists = prev.some((s) => s.id === site.id);
        if (exists) {
          return prev.map((s) => (s.id === site.id ? site : s));
        }
        return [site, ...prev];
      });
      showToast(editingSite ? `已更新「${site.name}」` : `已添加「${site.name}」`);
    },
    [editingSite, showToast],
  );

  const handleDeleteSite = useCallback(
    (id: string) => {
      const target = sites.find((s) => s.id === id);
      if (!target) return;
      if (!window.confirm(`确定删除站点「${target.name}」吗？`)) return;
      setSites((prev) => prev.filter((s) => s.id !== id));
      showToast(`已删除「${target.name}」`);
    },
    [sites, showToast],
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(sites, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyanavi-sites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出 JSON 配置文件');
  }, [sites, showToast]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) || !parsed.every((i) => i && i.id && i.name && i.url)) {
          throw new Error('格式不正确');
        }
        setSites(parsed);
        showToast(`成功导入 ${parsed.length} 个站点`);
      } catch {
        showToast('导入失败：请确认是有效的 NyaNavi JSON 文件');
      }
    },
    [showToast],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm('确定恢复默认内置站点列表吗？自定义站点将被覆盖（建议先导出备份）。')) {
      return;
    }
    setSites(DEFAULT_SITES);
    showToast('已恢复默认站点列表');
  }, [showToast]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        mode === 'work' ? 'nya-bg-work' : 'nya-bg-light'
      }`}
    >
      <Sidebar
        categories={CATEGORIES}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        counts={categoryCounts}
        pinnedCount={pinnedSites.length}
        totalCount={modeSites.length}
        mode={mode}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onAddSite={() => {
          setEditingSite(null);
          setModalOpen(true);
        }}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />

      {/* 右侧主内容区 */}
      <div className="lg:pl-64">
        {/* 顶部工具栏 */}
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0f1320]/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                {mode === 'work' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    工作模式已开启 · 已隐藏 NSFW 资源
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                    <Flame className="h-3.5 w-3.5" />
                    NSFW 完整模式 · 共 {modeSites.length} 个源站
                  </span>
                )}

                {healthSummary.total > 0 && (
                  <span className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[11px] text-slate-500 md:inline-flex dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ● {healthSummary.online}
                    </span>
                    <span className="text-amber-500">● {healthSummary.warn}</span>
                    <span className="text-rose-500">● {healthSummary.offline}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 右侧功能切换区 */}
            <div className="flex items-center gap-2">
              {/* 批量存活检测 */}
              <button
                type="button"
                disabled={batchChecking}
                onClick={handleBatchCheck}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-sky-500/50"
                title="批量检测当前可见站点的连通性与延迟"
              >
                {batchChecking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
                ) : (
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span className="hidden sm:inline">{batchChecking ? '检测中...' : '存活检测'}</span>
              </button>

              {/* NSFW / 工作模式 切换分段开关 */}
              <div
                className="inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-100/90 p-0.5 dark:border-slate-700 dark:bg-slate-800/90"
                title="快捷键 Alt+W 秒切模式"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('work');
                    showToast('已切换至工作模式');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    mode === 'work'
                      ? 'bg-white text-sky-600 shadow-xs dark:bg-slate-700 dark:text-sky-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  工作
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('nsfw');
                    showToast('已切换至 NSFW 完整模式');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    mode === 'nsfw'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  NSFW
                </button>
              </div>

              {/* 亮/暗主题切换 */}
              <button
                type="button"
                onClick={() => setDark((d) => !d)}
                className="rounded-xl border border-slate-200/90 bg-white p-2 text-slate-600 shadow-2xs transition hover:border-pink-300 hover:text-pink-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-amber-300 dark:hover:border-amber-400/50"
                aria-label="切换明暗主题"
                title={dark ? '切换至明亮模式' : '切换至暗黑模式'}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* 主体内容 */}
        <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6">
          {/* 多功能搜索栏 */}
          <SearchBar
            query={query}
            onChange={setQuery}
            searchableSites={modeSites}
            mode={mode}
          />

          {/* 站点分区卡片网格 */}
          {groupedSections.length === 0 || groupedSections.every((g) => g.items.length === 0) ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                当前筛选下没有匹配的站点
              </p>
              <p className="mt-1 text-xs text-slate-400">
                你可以直接点击上方搜索框内的站点胶囊进行站外直搜，或添加一个自定义站点
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingSite(null);
                  setModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-600"
              >
                <Plus className="h-4 w-4" />
                添加站点
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSections.map((section) => (
                <section key={section.id}>
                  <div className="mb-3.5 flex items-baseline justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                        <span
                          className={`h-4 w-1 rounded-full ${
                            mode === 'work'
                              ? 'bg-sky-500'
                              : 'bg-gradient-to-b from-pink-500 to-sky-400'
                          }`}
                        />
                        {section.title}
                        <span className="text-xs font-medium text-slate-400">
                          ({section.items.length})
                        </span>
                      </h2>
                      {section.description && (
                        <p className="mt-0.5 pl-3 text-xs text-slate-400 dark:text-slate-500">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((site) => (
                      <SiteCard
                        key={site.id}
                        site={site}
                        health={healthMap[site.id]}
                        cleanedQuery={cleanedQuery}
                        onTogglePin={handleTogglePin}
                        onEdit={(s) => {
                          setEditingSite(s);
                          setModalOpen(true);
                        }}
                        onDelete={handleDeleteSite}
                        onCheckHealth={handleCheckSingle}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* 页脚 */}
          <footer className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800/80 dark:text-slate-500">
            <p>
              {mode === 'work'
                ? 'NyaDesk · 简洁高效的本地与云端导航工作台'
                : 'NyaNavi · 清爽明亮的二次元 ACG 精选导航（数据本地持久化，支持一键部署 GitHub Pages）'}
            </p>
            <span className="inline-flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" />
              开源双模架构 · Alt+W 秒切模式
            </span>
          </footer>
        </main>
      </div>

      {/* 新增/编辑站点弹窗 */}
      <SiteModal
        open={modalOpen}
        editingSite={editingSite}
        categories={CATEGORIES}
        defaultNsfw={mode === 'nsfw'}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSite}
      />

      {/* 轻量 Toast 提示 */}
      {toast && (
        <div className="fixed right-5 bottom-5 z-50 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur-md dark:bg-white/95 dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
