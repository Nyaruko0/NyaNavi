import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CATEGORIES, ensurePrivateVaultCategory } from '../data/defaultCategories';
import type { CategoryMeta, SiteItem } from '../types';

const CACHE_SITES_KEY = 'nyanavi_sites_cache_v1';
const CACHE_CATS_KEY = 'nyanavi_cats_cache_v1';

/** 兼容旧版合并分类，将历史 category 映射至当前分类 */
export function hydrateSites(list: SiteItem[]): SiteItem[] {
  return list.map((item) => {
    const rawCat = item.category as string;
    if (rawCat === 'posts') {
      return { ...item, category: 'acg_resources' };
    }
    if (rawCat === 'ai_image_search' || rawCat === 'web_tools') {
      return { ...item, category: 'work_toolbox' };
    }
    return item;
  });
}

function readCachedSites(): SiteItem[] {
  try {
    const raw = localStorage.getItem(CACHE_SITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? hydrateSites(parsed as SiteItem[]) : [];
  } catch {
    return [];
  }
}

function readCachedCategories(): CategoryMeta[] {
  try {
    const raw = localStorage.getItem(CACHE_CATS_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? ensurePrivateVaultCategory(parsed as CategoryMeta[])
      : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function writeCacheSafe(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // 忽略隐私模式或配额不足异常
  }
}

/**
 * 公开站点与分类目录数据加载 Hook（stale-while-revalidate）：
 * - 优先从 localStorage 秒开上一次的公开站点缓存，杜绝 360 KB 静态数据打进 JS 主包
 * - 后台请求 ./sites.json 与 ./categories.json（走浏览器原生 ETag 协商缓存，仅在数据变化时更新状态）
 */
export function useSiteCatalog() {
  const [sites, setSites] = useState<SiteItem[]>(readCachedSites);
  const [categories, setCategories] = useState<CategoryMeta[]>(readCachedCategories);
  const [loading, setLoading] = useState<boolean>(() => readCachedSites().length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadFromPublic = useCallback(async (forceNoStore = false) => {
    const fetchOpts: RequestInit = forceNoStore ? { cache: 'no-store' } : { cache: 'no-cache' };
    const suffix = forceNoStore ? `?t=${Date.now()}` : '';

    try {
      const [sitesRes, catsRes] = await Promise.all([
        fetch(`./sites.json${suffix}`, fetchOpts),
        fetch(`./categories.json${suffix}`, fetchOpts).catch(() => null),
      ]);

      if (!sitesRes.ok) {
        throw new Error(`加载站点列表失败 (HTTP ${sitesRes.status})`);
      }

      const rawSites = await sitesRes.json();
      if (Array.isArray(rawSites) && rawSites.length > 0) {
        const nextSites = hydrateSites(rawSites as SiteItem[]);
        setSites((prev) => {
          // 内容一致时保持引用不变，避免首屏无意义的整页重渲染闪烁
          if (prev.length === nextSites.length && JSON.stringify(prev) === JSON.stringify(nextSites)) {
            return prev;
          }
          return nextSites;
        });
        writeCacheSafe(CACHE_SITES_KEY, nextSites);
        setLoadError(null);
      }

      if (catsRes && catsRes.ok) {
        const rawCats = await catsRes.json();
        if (Array.isArray(rawCats) && rawCats.length > 0) {
          const nextCats = ensurePrivateVaultCategory(rawCats as CategoryMeta[]);
          setCategories((prev) => {
            if (prev.length === nextCats.length && JSON.stringify(prev) === JSON.stringify(nextCats)) {
              return prev;
            }
            return nextCats;
          });
          writeCacheSafe(CACHE_CATS_KEY, nextCats);
        }
      }
      return true;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载站点列表失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadFromPublic(false);
  }, [reloadFromPublic]);

  return {
    sites,
    setSites,
    categories,
    setCategories,
    loading,
    loadError,
    reloadFromPublic,
  };
}
