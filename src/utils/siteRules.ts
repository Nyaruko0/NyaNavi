import type { AppMode, CategoryMeta, SiteItem } from '../types';

export const DEFAULT_PRIVATE_REPO = 'NyaNavi-Private';
export const DEFAULT_PRIVATE_BRANCH = 'main';
export const DEFAULT_PRIVATE_PATH = 'private-sites.json';

/** 判断站点是否属于站长私密库（严禁写入公开 sites.json） */
export function isPrivateSite(site: Pick<SiteItem, 'privateOnly' | 'category'>): boolean {
  return Boolean(site.privateOnly || site.category === 'private_vault');
}

/** 公开站点二次过滤谓词 */
export function isPublicSite(site: Pick<SiteItem, 'privateOnly' | 'category'>): boolean {
  return !isPrivateSite(site);
}

/** 私密站点强制打标规范化 */
export function normalizePrivateSite(site: SiteItem): SiteItem {
  return {
    ...site,
    nsfw: true,
    privateOnly: true,
  };
}

/** URL 去重比较用归一化键 */
export function normalizeUrlKey(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

/** 提取原始 hostname（供 Favicon 抓取使用） */
export function getRawHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 提取去掉 www. 后的展示域名 */
export function getDisplayHostname(url: string): string {
  const host = getRawHostname(url);
  return host ? host.replace(/^www\./, '') : url;
}

/** 推导单个分类所属模式 */
export function inferCategoryMode(cat: CategoryMeta): AppMode {
  if (cat.workAllowed) return 'work';
  if (cat.nsfwOnly || cat.privateOnly) return 'nsfw';
  return 'moyu';
}

/** 推导单个站点所属模式 */
export function inferSiteMode(site: SiteItem, categories: CategoryMeta[]): AppMode {
  if (site.nsfw || isPrivateSite(site)) return 'nsfw';
  const cat = categories.find((c) => c.id === site.category);
  if (cat?.workAllowed) return 'work';
  return 'moyu';
}

/** 统一的三模式目录可见性规则（全站唯一出处） */
export function isCategoryVisibleInMode(
  cat: CategoryMeta,
  mode: AppMode,
  canViewPrivate: boolean,
): boolean {
  if (mode === 'work' && !cat.workAllowed) return false;
  if (mode === 'moyu' && (cat.nsfwOnly || cat.hideInMoyu)) return false;
  if (mode === 'nsfw' && cat.workAllowed) return false;
  if (cat.privateOnly && !canViewPrivate) return false;
  return true;
}

/** 按编辑弹窗所选模式筛选可选分类（与主视图三模式口径严格一致） */
export function getCategoriesForMode(categories: CategoryMeta[], mode: AppMode): CategoryMeta[] {
  if (mode === 'work') return categories.filter((c) => c.workAllowed);
  if (mode === 'moyu') {
    return categories.filter((c) => !c.workAllowed && !c.nsfwOnly && !c.hideInMoyu && !c.privateOnly);
  }
  return categories.filter((c) => !c.workAllowed);
}

/** 统一的三模式站点过滤规则（全站唯一出处） */
export function isSiteVisibleInMode(
  site: SiteItem,
  mode: AppMode,
  workCategoryIds: Set<string>,
  moyuHiddenCategoryIds: Set<string>,
): boolean {
  if (mode === 'work') {
    return !site.nsfw && workCategoryIds.has(site.category);
  }
  if (mode === 'moyu') {
    return !site.nsfw && !moyuHiddenCategoryIds.has(site.category);
  }
  return (site.nsfw || site.category === 'private_vault') && !workCategoryIds.has(site.category);
}

/** 获取分类在当前模式下的展示名称 */
export function getCategoryDisplayName(
  cat: Pick<CategoryMeta, 'name' | 'workName'>,
  mode: AppMode,
): string {
  return mode === 'work' && cat.workName ? cat.workName : cat.name;
}

/** 判断是否为扣币/冷却高成本搜索站 */
export function isHighRiskSearch(risk?: SiteItem['searchRisk']): boolean {
  return risk === 'cost' || risk === 'cooldown';
}

/** 判断站点简介是否仅复读了站名或域名（无额外信息时隐藏以保持卡片清爽） */
export function isRedundantDescription(site: Pick<SiteItem, 'name' | 'description'>, host: string): boolean {
  const clean = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/\/+$/, '')
      .replace(/\s+/g, '');
  const desc = clean(site.description || '');
  if (!desc) return true;
  return desc === clean(site.name) || desc === clean(host);
}
