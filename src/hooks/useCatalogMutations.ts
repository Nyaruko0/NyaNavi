import { useCallback } from 'react';
import type { CategoryId, CategoryMeta, SiteItem } from '../types';
import {
  inferCategoryMode,
  isPrivateSite,
  isPublicSite,
  normalizePrivateSite,
  normalizeUrlKey,
} from '../utils/siteRules';
import { hydrateSites } from './useSiteCatalog';

/** 仅重排 list 中属于 visibleIds 子集的槽位顺序，将 fromId 移至 toId 所在位置 */
export function reorderSitesWithinSubset(
  list: SiteItem[],
  visibleIds: string[],
  fromId: string,
  toId: string,
): SiteItem[] {
  if (fromId === toId) return list;
  const visibleSet = new Set(visibleIds);
  const slotIndices: number[] = [];
  const slotItems: SiteItem[] = [];
  for (let i = 0; i < list.length; i++) {
    if (visibleSet.has(list[i].id)) {
      slotIndices.push(i);
      slotItems.push(list[i]);
    }
  }
  const fromIdx = slotItems.findIndex((s) => s.id === fromId);
  const toIdx = slotItems.findIndex((s) => s.id === toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list;

  const reordered = [...slotItems];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);

  const next = [...list];
  for (let i = 0; i < slotIndices.length; i++) {
    next[slotIndices[i]] = reordered[i];
  }
  return next;
}

interface UseCatalogMutationsOptions {
  canManage: boolean;
  sites: SiteItem[];
  categories: CategoryMeta[];
  privateSites: SiteItem[];
  editingSite: SiteItem | null;
  activeSection: string;
  setActiveSection: (id: string) => void;
  setSites: React.Dispatch<React.SetStateAction<SiteItem[]>>;
  setCategories: React.Dispatch<React.SetStateAction<CategoryMeta[]>>;
  setPrivateSites: React.Dispatch<React.SetStateAction<SiteItem[]>>;
  setLocalPins: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setHasUnsynced: (v: boolean) => void;
  setHasUnsyncedPrivate: (v: boolean) => void;
  setHasUnsyncedCategories: (v: boolean) => void;
  reloadFromPublic: (forceNoStore?: boolean) => Promise<boolean>;
  showToast: (msg: string) => void;
}

export function useCatalogMutations({
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
  setHasUnsynced,
  setHasUnsyncedPrivate,
  setHasUnsyncedCategories,
  reloadFromPublic,
  showToast,
}: UseCatalogMutationsOptions) {
  const handleTogglePin = useCallback(
    (id: string) => {
      if (canManage) {
        if (privateSites.some((s) => s.id === id)) {
          setPrivateSites((prev) =>
            prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
          );
          setHasUnsyncedPrivate(true);
        } else {
          setSites((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)));
          setHasUnsynced(true);
        }
      } else {
        setLocalPins((prev) => {
          const current =
            id in prev ? prev[id] : Boolean(sites.find((s) => s.id === id)?.pinned);
          return { ...prev, [id]: !current };
        });
      }
    },
    [
      canManage,
      privateSites,
      setHasUnsynced,
      setHasUnsyncedPrivate,
      setLocalPins,
      setPrivateSites,
      setSites,
      sites,
    ],
  );

  const handleSaveCategory = useCallback(
    (cat: CategoryMeta, isEdit: boolean) => {
      if (!canManage) return;
      const prevCat = isEdit ? categories.find((c) => c.id === cat.id) : undefined;
      const prevMode = prevCat ? inferCategoryMode(prevCat) : null;
      const nextMode = inferCategoryMode(cat);

      setCategories((prev) =>
        isEdit ? prev.map((c) => (c.id === cat.id ? cat : c)) : [...prev, cat],
      );
      setHasUnsyncedCategories(true);

      // 切换已有分类所属模式时，同步调整其下站点的 nsfw 标记，避免站点在视图中隐身
      if (isEdit && prevMode && prevMode !== nextMode) {
        const nextNsfw = nextMode === 'nsfw';
        let touched = false;
        setSites((prev) =>
          prev.map((s) => {
            if (s.category === cat.id && s.nsfw !== nextNsfw) {
              touched = true;
              return { ...s, nsfw: nextNsfw };
            }
            return s;
          }),
        );
        if (touched) setHasUnsynced(true);
      }

      showToast(
        isEdit
          ? `已更新目录「${cat.name}」，请点顶部“同步到 GitHub”发布`
          : `已新建目录「${cat.name}」，请点顶部“同步到 GitHub”发布`,
      );
    },
    [
      canManage,
      categories,
      setCategories,
      setHasUnsynced,
      setHasUnsyncedCategories,
      setSites,
      showToast,
    ],
  );

  const handleReorderCategories = useCallback(
    (nextCategories: CategoryMeta[]) => {
      if (!canManage) return;
      setCategories(nextCategories);
      setHasUnsyncedCategories(true);
    },
    [canManage, setCategories, setHasUnsyncedCategories],
  );

  const handleReorderSiteInSection = useCallback(
    (sectionItems: SiteItem[], fromId: string, toId: string) => {
      if (!canManage || fromId === toId) return;
      const visibleIds = sectionItems.map((s) => s.id);
      if (!visibleIds.includes(fromId) || !visibleIds.includes(toId)) return;

      if (privateSites.some((s) => s.id === fromId)) {
        setPrivateSites((prev) => reorderSitesWithinSubset(prev, visibleIds, fromId, toId));
        setHasUnsyncedPrivate(true);
      } else {
        setSites((prev) => reorderSitesWithinSubset(prev, visibleIds, fromId, toId));
        setHasUnsynced(true);
      }
    },
    [canManage, privateSites, setHasUnsynced, setHasUnsyncedPrivate, setPrivateSites, setSites],
  );

  const handleMoveSiteInSection = useCallback(
    (sectionItems: SiteItem[], siteId: string, direction: -1 | 1) => {
      const idx = sectionItems.findIndex((s) => s.id === siteId);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= sectionItems.length) return;
      handleReorderSiteInSection(sectionItems, siteId, sectionItems[targetIdx].id);
    },
    [handleReorderSiteInSection],
  );

  const handleDeleteCategory = useCallback(
    (catId: CategoryId) => {
      if (!canManage || catId === 'private_vault') return;
      const target = categories.find((c) => c.id === catId);
      if (!target) return;
      const affected = sites.filter((s) => s.category === catId);
      const targetMode = inferCategoryMode(target);
      const fallback = categories.find(
        (c) => c.id !== catId && !c.privateOnly && inferCategoryMode(c) === targetMode,
      );

      if (affected.length > 0 && !fallback) {
        showToast(`无法删除：该目录下还有 ${affected.length} 个站点且同模式没有其他可迁移目录`);
        return;
      }

      const confirmMsg =
        affected.length > 0
          ? `目录「${target.name}」下还有 ${affected.length} 个站点，删除后它们将自动转移到「${fallback!.name}」，确认删除吗？`
          : `确定删除空目录「${target.name}」吗？`;
      if (!window.confirm(confirmMsg)) return;

      if (affected.length > 0 && fallback) {
        setSites((prev) =>
          prev.map((s) => (s.category === catId ? { ...s, category: fallback.id } : s)),
        );
        setHasUnsynced(true);
      }
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setHasUnsyncedCategories(true);
      if (activeSection === catId) setActiveSection('all');
      showToast(`已删除目录「${target.name}」，请点顶部“同步到 GitHub”发布`);
    },
    [
      activeSection,
      canManage,
      categories,
      setActiveSection,
      setCategories,
      setHasUnsynced,
      setHasUnsyncedCategories,
      setSites,
      showToast,
      sites,
    ],
  );

  const handleSaveSite = useCallback(
    (site: SiteItem) => {
      if (!canManage) return;
      const isPrivate = isPrivateSite(site);
      const normalized: SiteItem = isPrivate
        ? normalizePrivateSite(site)
        : { ...site, privateOnly: undefined };

      if (isPrivate) {
        setSites((prev) => prev.filter((s) => s.id !== normalized.id));
        setPrivateSites((prev) => {
          const exists = prev.some((s) => s.id === normalized.id);
          return exists
            ? prev.map((s) => (s.id === normalized.id ? normalized : s))
            : [normalized, ...prev];
        });
        setHasUnsyncedPrivate(true);
        showToast(`已存入私密库「${normalized.name}」，点“同步到 GitHub”将仅写入私有仓库`);
      } else {
        setPrivateSites((prev) => prev.filter((s) => s.id !== normalized.id));
        setSites((prev) => {
          const exists = prev.some((s) => s.id === normalized.id);
          return exists
            ? prev.map((s) => (s.id === normalized.id ? normalized : s))
            : [normalized, ...prev];
        });
        setHasUnsynced(true);
        showToast(
          editingSite
            ? `已更新「${normalized.name}」，请点顶部“同步到 GitHub”发布`
            : `已添加「${normalized.name}」，请点顶部“同步到 GitHub”发布`,
        );
      }
    },
    [
      canManage,
      editingSite,
      setHasUnsynced,
      setHasUnsyncedPrivate,
      setPrivateSites,
      setSites,
      showToast,
    ],
  );

  const handleDeleteSite = useCallback(
    (id: string) => {
      if (!canManage) return;
      const privTarget = privateSites.find((s) => s.id === id);
      if (privTarget) {
        if (!window.confirm(`确定从私密库删除「${privTarget.name}」吗？`)) return;
        setPrivateSites((prev) => prev.filter((s) => s.id !== id));
        setHasUnsyncedPrivate(true);
        showToast(`已从私密库移除「${privTarget.name}」，请点顶部“同步到 GitHub”保存`);
        return;
      }
      const target = sites.find((s) => s.id === id);
      if (!target) return;
      if (!window.confirm(`确定删除站点「${target.name}」吗？`)) return;
      setSites((prev) => prev.filter((s) => s.id !== id));
      setHasUnsynced(true);
      showToast(`已删除「${target.name}」，点击顶部“同步到 GitHub”即可生效`);
    },
    [
      canManage,
      privateSites,
      setHasUnsynced,
      setHasUnsyncedPrivate,
      setPrivateSites,
      setSites,
      sites,
      showToast,
    ],
  );

  const handleExport = useCallback(() => {
    if (!canManage) return;
    const safePublic = sites.filter(isPublicSite);
    const blob = new Blob([JSON.stringify(safePublic, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyanavi-sites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出公开站点 JSON 配置（不含私密库）');
  }, [canManage, sites, showToast]);

  const handleImport = useCallback(
    async (file: File) => {
      if (!canManage) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) || !parsed.every((i) => i && i.id && i.name && i.url)) {
          throw new Error('格式不正确');
        }
        const isPrivateBundle =
          parsed.length > 0 && parsed.every((i: SiteItem) => isPrivateSite(i));
        if (isPrivateBundle) {
          const normalized = parsed.map((i: SiteItem) => normalizePrivateSite(i));
          setPrivateSites((prev) => {
            const existingUrls = new Set(prev.map((x) => normalizeUrlKey(x.url)));
            const existingIds = new Set(prev.map((x) => x.id));
            const additions = normalized.filter(
              (x) => !existingIds.has(x.id) && !existingUrls.has(normalizeUrlKey(x.url)),
            );
            return [...additions, ...prev];
          });
          setHasUnsyncedPrivate(true);
          showToast(
            `已增量合并 ${normalized.length} 个私密库站点（保留原有私密数据），请点顶部“同步到 GitHub”写入私有仓库`,
          );
        } else {
          const safePublic = hydrateSites(parsed).filter(isPublicSite);
          setSites(safePublic);
          setHasUnsynced(true);
          showToast(`成功导入 ${safePublic.length} 个公开站点，请点顶部“同步到 GitHub”发布`);
        }
      } catch {
        showToast('导入失败：请确认是有效的 NyaNavi JSON 文件');
      }
    },
    [canManage, setHasUnsynced, setHasUnsyncedPrivate, setPrivateSites, setSites, showToast],
  );

  const handleReloadOnline = useCallback(async () => {
    if (!canManage) return;
    if (!window.confirm('确定放弃本地未同步的公开站点修改，重新从线上拉取最新数据吗？')) return;
    const ok = await reloadFromPublic(true);
    if (ok) {
      setHasUnsynced(false);
      setHasUnsyncedCategories(false);
      showToast('已从线上重新拉取最新公开站点与分类目录');
    } else {
      showToast('重新拉取失败，请检查网络连接');
    }
  }, [canManage, reloadFromPublic, setHasUnsynced, setHasUnsyncedCategories, showToast]);

  return {
    handleTogglePin,
    handleSaveCategory,
    handleReorderCategories,
    handleReorderSiteInSection,
    handleMoveSiteInSection,
    handleDeleteCategory,
    handleSaveSite,
    handleDeleteSite,
    handleExport,
    handleImport,
    handleReloadOnline,
  };
}
