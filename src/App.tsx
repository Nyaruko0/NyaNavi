import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_APPEARANCE,
  sanitizeWallpaperUrl,
  SITE_ICON_PRESETS,
} from './config/appearance';
import type { SiteItem } from './types';
import { cleanSearchQuery } from './utils/cleanQuery';
import { scoreSiteMatch } from './utils/fuzzyMatch';
import {
  getCategoryDisplayName,
  isCategoryVisibleInMode,
  isSiteVisibleInMode,
} from './utils/siteRules';
import { useAppPreferences } from './hooks/useAppPreferences';
import { useAuthSync } from './hooks/useAuthSync';
import { useCatalogMutations } from './hooks/useCatalogMutations';
import { useHealthChecker } from './hooks/useHealthChecker';
import { useSiteCatalog } from './hooks/useSiteCatalog';
import { Sidebar } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { MobileCategoryBar } from './components/MobileCategoryBar';
import { SiteSections, type SiteSectionGroup } from './components/SiteSections';
import { SiteModal } from './components/SiteModal';
import { AdminModal } from './components/AdminModal';
import { CategoryModal } from './components/CategoryModal';
import { NsfwUnlockModal } from './components/NsfwUnlockModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { pickPortalMessage, PortalModal, type PortalTarget } from './components/PortalModal';
import type { PortalMessage } from './data/portalMessages';
import { ArrowDown, ArrowUp, Github } from 'lucide-react';

export default function App() {
  const { sites, setSites, categories, setCategories, loading, loadError, reloadFromPublic } =
    useSiteCatalog();

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nsfwUnlockOpen, setNsfwUnlockOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<PortalTarget | null>(null);
  const [portalMessage, setPortalMessage] = useState<PortalMessage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState('all');
  const [query, setQuery] = useState('');
  const [scrollPos, setScrollPos] = useState({ atTop: true, atBottom: false });

  const showToast = useCallback((msg: string) => setToast(msg), []);
  const openAdminModal = useCallback(() => setAdminModalOpen(true), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const prefs = useAppPreferences(showToast);
  const { appearance, setAppearance, mode, setMode, dark, setDark, localPins, setLocalPins } = prefs;

  const auth = useAuthSync({
    sites,
    categories,
    setSites,
    setCategories,
    showToast,
    openAdminModal,
  });

  const { canManage, canViewPrivate, privateSites, setPrivateSites } = auth;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      setScrollPos({ atTop: y < 120, atBottom: maxScroll - y < 120 });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const workCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.workAllowed).map((c) => c.id)),
    [categories],
  );
  const moyuHiddenCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.hideInMoyu || c.nsfwOnly).map((c) => c.id)),
    [categories],
  );

  useEffect(() => {
    const cat = categories.find((c) => c.id === activeSection);
    if (cat && !isCategoryVisibleInMode(cat, mode, canViewPrivate)) {
      setActiveSection('all');
    }
  }, [mode, canViewPrivate, activeSection, categories]);

  const displaySites = useMemo(() => {
    if (canManage) return [...privateSites, ...sites];
    const base = auth.friendUnlocked ? [...auth.friendVaultSites, ...sites] : sites;
    return base.map((s) => (s.id in localPins ? { ...s, pinned: localPins[s.id] } : s));
  }, [sites, privateSites, auth.friendVaultSites, auth.friendUnlocked, localPins, canManage]);

  const modeSites = useMemo(
    () =>
      displaySites.filter((s) =>
        isSiteVisibleInMode(s, mode, workCategoryIds, moyuHiddenCategoryIds),
      ),
    [displaySites, mode, workCategoryIds, moyuHiddenCategoryIds],
  );

  const allCategoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of displaySites) map[s.category] = (map[s.category] || 0) + 1;
    return map;
  }, [displaySites]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of modeSites) map[s.category] = (map[s.category] || 0) + 1;
    return map;
  }, [modeSites]);

  const pinnedSites = useMemo(() => modeSites.filter((s) => s.pinned), [modeSites]);
  const cleanedQuery = useMemo(() => cleanSearchQuery(query).cleaned, [query]);

  const filteredSites = useMemo(() => {
    let list = modeSites;
    if (activeSection === 'pinned') {
      list = list.filter((s) => s.pinned);
    } else if (activeSection !== 'all') {
      list = list.filter((s) => s.category === activeSection);
    }
    const q = query.trim();
    if (!q) return list;
    return list
      .map((s) => ({ site: s, score: scoreSiteMatch(s, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.site);
  }, [modeSites, activeSection, query]);

  const groupedSections: SiteSectionGroup[] = useMemo(() => {
    if (activeSection !== 'all') {
      const meta =
        activeSection === 'pinned'
          ? {
              id: 'pinned',
              name: '站长爱看😋',
              description: canManage
                ? '站长精选推荐的置顶入口（可同步到 GitHub）'
                : '站长精选推荐 + 你本地星标收藏的高频入口',
            }
          : categories.find((c) => c.id === activeSection);
      return [
        {
          id: activeSection,
          title: meta ? getCategoryDisplayName(meta, mode) : '站点列表',
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
          description: '',
          items: filteredSites,
        },
      ];
    }

    const sections: SiteSectionGroup[] = [];
    if (pinnedSites.length > 0) {
      sections.push({
        id: 'pinned-top',
        title: '站长爱看😋',
        description: '',
        items: pinnedSites,
      });
    }

    for (const cat of categories) {
      if (!isCategoryVisibleInMode(cat, mode, canViewPrivate)) continue;
      const items = modeSites.filter((s) => s.category === cat.id);
      if (items.length === 0) continue;
      sections.push({
        id: cat.id,
        title: getCategoryDisplayName(cat, mode),
        description: cat.description,
        items,
      });
    }

    return sections;
  }, [
    activeSection,
    canManage,
    canViewPrivate,
    categories,
    filteredSites,
    mode,
    modeSites,
    pinnedSites,
    query,
  ]);

  const health = useHealthChecker(modeSites, filteredSites, activeSection, query, showToast);

  const mutations = useCatalogMutations({
    canManage,
    sites,
    categories,
    privateSites,
    editingSite,
    activeSection,
    setActiveSection,
    setSites,
    setCategories,
    setPrivateSites,
    setLocalPins,
    setHasUnsynced: auth.setHasUnsynced,
    setHasUnsyncedPrivate: auth.setHasUnsyncedPrivate,
    setHasUnsyncedCategories: auth.setHasUnsyncedCategories,
    reloadFromPublic,
    showToast,
  });

  const handleNavigate = useCallback(
    (url: string, site: SiteItem, keyword?: string) => {
      if (mode === 'work' || !appearance.enablePortalConfirm) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      setPortalTarget({ url, site, keyword });
      setPortalMessage((prev) => pickPortalMessage(prev?.id));
    },
    [appearance.enablePortalConfirm, mode],
  );

  const handleConfirmPortal = useCallback(() => {
    if (!portalTarget) return;
    window.open(portalTarget.url, '_blank', 'noopener,noreferrer');
    setPortalTarget(null);
  }, [portalTarget]);

  const handleEditSite = useCallback((s: SiteItem) => {
    setEditingSite(s);
    setModalOpen(true);
  }, []);

  const handleOpenAddSite = useCallback(() => {
    setEditingSite(null);
    setModalOpen(true);
  }, []);

  const gridColsClass =
    appearance.columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : appearance.columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  const bgClass =
    appearance.bgStyle === 'dots'
      ? 'nya-bg-dots'
      : appearance.bgStyle === 'minimal'
        ? 'nya-bg-minimal'
        : 'nya-bg-glow';

  const safeWallpaperUrl = useMemo(
    () => sanitizeWallpaperUrl(appearance.wallpaperUrl),
    [appearance.wallpaperUrl],
  );

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ${bgClass} font-style-${appearance.fontStyle}`}
    >
      {safeWallpaperUrl && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
          style={{
            backgroundImage: `url(${JSON.stringify(safeWallpaperUrl)})`,
            opacity: appearance.wallpaperOpacity / 100,
            filter: `blur(${appearance.wallpaperBlur}px)`,
            transform: 'scale(1.04)',
          }}
        />
      )}

      <div className="relative z-10">
        <Sidebar
          categories={categories}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          counts={categoryCounts}
          pinnedCount={pinnedSites.length}
          totalCount={modeSites.length}
          mode={mode}
          brandIconSrc={(SITE_ICON_PRESETS[appearance.siteIcon] || SITE_ICON_PRESETS.neko).preview}
          authRole={auth.authRole}
          canManage={canManage}
          canViewPrivate={canViewPrivate}
          friendUnlocked={auth.friendUnlocked}
          authUser={auth.authUser}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenAdmin={openAdminModal}
          onManageCategories={() => setCategoryModalOpen(true)}
          onAddSite={handleOpenAddSite}
          onExport={mutations.handleExport}
          onImport={mutations.handleImport}
          onReset={mutations.handleReloadOnline}
        />

        <div className="lg:pl-64">
          <AppHeader
            mode={mode}
            dark={dark}
            enableNsfwMode={appearance.enableNsfwMode}
            canManage={canManage}
            syncing={auth.syncing}
            anyUnsynced={auth.anyUnsynced}
            batchChecking={health.batchChecking}
            healthSummary={health.healthSummary}
            query={query}
            modeSites={modeSites}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onSyncToGitHub={auth.handleSyncToGitHub}
            onBatchCheck={health.handleBatchCheck}
            onSelectMode={prefs.handleSelectMode}
            onRequestNsfwUnlock={() => setNsfwUnlockOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleDark={() => setDark((d) => !d)}
            onQueryChange={setQuery}
            onNavigate={handleNavigate}
          />

          <main className="mx-auto max-w-[1440px] px-3.5 pt-4 pb-20 sm:px-6 sm:pt-5">
            <MobileCategoryBar
              categories={categories}
              activeSection={activeSection}
              mode={mode}
              canViewPrivate={canViewPrivate}
              totalCount={modeSites.length}
              pinnedCount={pinnedSites.length}
              categoryCounts={categoryCounts}
              onSelectSection={setActiveSection}
            />

            <SiteSections
              sections={groupedSections}
              loading={loading}
              loadError={loadError}
              onRetryLoad={() => void reloadFromPublic(true)}
              gridColsClass={gridColsClass}
              healthMap={health.healthMap}
              cleanedQuery={cleanedQuery}
              query={query}
              canManage={canManage}
              appearance={appearance}
              onMoveSiteInSection={mutations.handleMoveSiteInSection}
              onReorderSiteInSection={mutations.handleReorderSiteInSection}
              onNavigate={handleNavigate}
              onTogglePin={mutations.handleTogglePin}
              onEditSite={handleEditSite}
              onDeleteSite={mutations.handleDeleteSite}
              onCheckHealth={health.handleCheckSingle}
              onAddSite={handleOpenAddSite}
            />

            <footer className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-slate-200/60 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800/70 dark:text-slate-500">
              <p>
                {mode === 'work'
                  ? 'NyaDesk · 简洁高效的本地与云端导航工作台'
                  : mode === 'moyu'
                    ? 'NyaNavi · 全年龄表站摸鱼模式（已隐藏全部 NSFW 里站，Alt+W 一键切工作台）'
                    : 'NyaNavi · 清爽极简的二次元 ACG 导航（支持自定义外观与 GitHub 云同步）'}
              </p>
              <a
                href="https://github.com/Nyaruko0/NyaNavi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Github className="h-3.5 w-3.5" />
                Nyaruko0/NyaNavi · Alt+W 秒切模式
              </a>
            </footer>
          </main>
        </div>
      </div>

      <SiteModal
        open={modalOpen && canManage}
        editingSite={editingSite}
        categories={categories}
        defaultMode={mode}
        onClose={() => setModalOpen(false)}
        onSave={mutations.handleSaveSite}
      />

      <CategoryModal
        open={categoryModalOpen && canManage}
        categories={categories}
        siteCounts={allCategoryCounts}
        defaultMode={mode}
        onClose={() => setCategoryModalOpen(false)}
        onSaveCategory={mutations.handleSaveCategory}
        onDeleteCategory={mutations.handleDeleteCategory}
        onReorderCategories={mutations.handleReorderCategories}
      />

      <AdminModal
        open={adminModalOpen}
        currentConfig={auth.ghConfig}
        authRole={auth.authRole}
        authUser={auth.authUser}
        friendUnlocked={auth.friendUnlocked}
        friendVaultCount={auth.friendVaultSites.length}
        onClose={() => setAdminModalOpen(false)}
        onAdminAuthenticated={auth.handleAdminAuthenticated}
        onMemberAuthenticated={auth.handleMemberAuthenticated}
        onFriendUnlocked={auth.handleFriendUnlocked}
        onFriendLock={auth.handleFriendLock}
        onLogout={auth.handleAdminLogout}
      />

      <SettingsDrawer
        open={settingsOpen}
        settings={appearance}
        onChange={setAppearance}
        onReset={() => {
          setAppearance(DEFAULT_APPEARANCE);
          showToast('已恢复默认外观设置');
        }}
        onClose={() => setSettingsOpen(false)}
      />

      <PortalModal
        target={portalTarget}
        message={portalMessage}
        onReroll={() => setPortalMessage((prev) => pickPortalMessage(prev?.id))}
        onConfirm={handleConfirmPortal}
        onClose={() => setPortalTarget(null)}
      />

      <NsfwUnlockModal
        open={nsfwUnlockOpen}
        onUnlock={() => {
          setAppearance((prev) => ({ ...prev, enableNsfwMode: true }));
          setMode('nsfw');
          setNsfwUnlockOpen(false);
          showToast('已解锁并进入 NSFW 模式（可在外观设置中随时关闭锁定）');
        }}
        onOpenSettings={() => {
          setNsfwUnlockOpen(false);
          setSettingsOpen(true);
        }}
        onClose={() => setNsfwUnlockOpen(false)}
      />

      {!scrollPos.atTop && (
        <div className="fixed right-2.5 bottom-4 z-30 flex flex-col gap-1.5 sm:right-5 sm:bottom-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="回到顶部"
            title="回到顶部"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] sm:h-10 sm:w-10 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          {!scrollPos.atBottom && (
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: document.documentElement.scrollHeight,
                  behavior: 'smooth',
                })
              }
              aria-label="直达底部"
              title="直达底部"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition-colors hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] sm:h-10 sm:w-10 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-200"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed right-4 bottom-20 z-50 rounded-xl bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-white shadow-md sm:right-5 sm:bottom-6 dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
