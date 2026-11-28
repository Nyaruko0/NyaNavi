import { describe, expect, it } from 'vitest';
import { sanitizeWallpaperUrl } from '../../config/appearance';
import { reorderSitesWithinSubset } from '../../hooks/useCatalogMutations';
import type { CategoryMeta, SiteItem } from '../../types';
import { buildSearchUrl, cleanSearchQuery } from '../cleanQuery';
import { scoreSiteMatch } from '../fuzzyMatch';
import {
  getCategoriesForMode,
  isCategoryVisibleInMode,
  isPrivateSite,
  isPublicSite,
  isSiteVisibleInMode,
  normalizePrivateSite,
} from '../siteRules';
import { decryptVaultSites, encryptVaultSites } from '../vaultCrypto';

const SAMPLE_CATEGORIES: CategoryMeta[] = [
  { id: 'private_vault', name: '站长私密库', description: '', icon: 'Lock', nsfwOnly: true, privateOnly: true },
  { id: 'dev_work', name: '开发文档', description: '', icon: 'Terminal', workAllowed: true, hideInMoyu: true },
  { id: 'anime_stream', name: '在线动漫', description: '', icon: 'Tv' },
  { id: 'comics', name: '本子', description: '', icon: 'BookOpen', nsfwOnly: true },
];

const workIds = new Set(SAMPLE_CATEGORIES.filter((c) => c.workAllowed).map((c) => c.id));
const moyuHiddenIds = new Set(
  SAMPLE_CATEGORIES.filter((c) => c.hideInMoyu || c.nsfwOnly).map((c) => c.id),
);

function makeSite(partial: Partial<SiteItem>): SiteItem {
  return {
    id: 's1',
    name: 'Test Site',
    url: 'https://example.com',
    category: 'anime_stream',
    description: 'desc',
    tags: [],
    costTier: 'free',
    costLabel: '免费',
    nsfw: false,
    ...partial,
  };
}

describe('siteRules 三模式严格隔离与双仓红线', () => {
  it('正确识别私密站点并强制过滤出公开站点', () => {
    const pub = makeSite({ id: 'pub', category: 'anime_stream', nsfw: false });
    const privFlag = makeSite({ id: 'p1', category: 'comics', nsfw: true, privateOnly: true });
    const privCat = makeSite({ id: 'p2', category: 'private_vault', nsfw: false });

    expect(isPrivateSite(pub)).toBe(false);
    expect(isPublicSite(pub)).toBe(true);
    expect(isPrivateSite(privFlag)).toBe(true);
    expect(isPublicSite(privFlag)).toBe(false);
    expect(isPrivateSite(privCat)).toBe(true);
    expect(normalizePrivateSite(privCat)).toMatchObject({ nsfw: true, privateOnly: true });
  });

  it('严格隔离 work / moyu / nsfw 三模式分类与站点可见性', () => {
    const workSite = makeSite({ id: 'w', category: 'dev_work', nsfw: false });
    const moyuSite = makeSite({ id: 'm', category: 'anime_stream', nsfw: false });
    const nsfwSite = makeSite({ id: 'n', category: 'comics', nsfw: true });
    const privSite = makeSite({ id: 'pv', category: 'private_vault', nsfw: true, privateOnly: true });

    // work 模式仅展示工作站点
    expect(isSiteVisibleInMode(workSite, 'work', workIds, moyuHiddenIds)).toBe(true);
    expect(isSiteVisibleInMode(moyuSite, 'work', workIds, moyuHiddenIds)).toBe(false);
    expect(isSiteVisibleInMode(nsfwSite, 'work', workIds, moyuHiddenIds)).toBe(false);

    // moyu 模式仅展示全年龄表站，不含工作与 NSFW
    expect(isSiteVisibleInMode(workSite, 'moyu', workIds, moyuHiddenIds)).toBe(false);
    expect(isSiteVisibleInMode(moyuSite, 'moyu', workIds, moyuHiddenIds)).toBe(true);
    expect(isSiteVisibleInMode(nsfwSite, 'moyu', workIds, moyuHiddenIds)).toBe(false);

    // nsfw 模式仅展示里站，不含工作与表站
    expect(isSiteVisibleInMode(workSite, 'nsfw', workIds, moyuHiddenIds)).toBe(false);
    expect(isSiteVisibleInMode(moyuSite, 'nsfw', workIds, moyuHiddenIds)).toBe(false);
    expect(isSiteVisibleInMode(nsfwSite, 'nsfw', workIds, moyuHiddenIds)).toBe(true);
    expect(isSiteVisibleInMode(privSite, 'nsfw', workIds, moyuHiddenIds)).toBe(true);

    // 私有目录在未解锁时对所有模式隐藏
    const vaultCat = SAMPLE_CATEGORIES[0];
    expect(isCategoryVisibleInMode(vaultCat, 'nsfw', false)).toBe(false);
    expect(isCategoryVisibleInMode(vaultCat, 'nsfw', true)).toBe(true);
    expect(getCategoriesForMode(SAMPLE_CATEGORIES, 'moyu').map((c) => c.id)).toEqual(['anime_stream']);
  });
});

describe('vaultCrypto 浏览器本地 PBKDF2 + AES-256-GCM 加解密', () => {
  it('能正确加密并还原私密站点与规范化后的好友白名单', async () => {
    const input = [makeSite({ id: 'secret-1', name: 'Secret', category: 'private_vault' })];
    const encrypted = await encryptVaultSites(input, 'MyStrongPass!2026', '@Alice, bob  alice');

    expect(encrypted.alg).toBe('AES-256-GCM');
    expect(encrypted.kdf).toBe('PBKDF2-SHA256');
    expect(encrypted.requireGitHubAuth).toBe(true);

    const decrypted = await decryptVaultSites(encrypted, 'MyStrongPass!2026');
    expect(decrypted.sites).toHaveLength(1);
    expect(decrypted.sites[0]).toMatchObject({ id: 'secret-1', nsfw: true, privateOnly: true });
    expect(decrypted.allowedUsers).toEqual(['alice', 'bob']);

    await expect(decryptVaultSites(encrypted, 'WrongPass')).rejects.toThrow(/解密失败/);
  });
});

describe('cleanQuery 与 fuzzyMatch 搜索质量', () => {
  it('自动提取 RJ 编号并清洗搬运标签与容量后缀', () => {
    const res = cleanSearchQuery('【官中/步兵】测试作品 v1.02 [2.5GB] RJ01234567 夸克');
    expect(res.codeMatch).toBe('RJ01234567');
    expect(res.wasCleaned).toBe(true);
    expect(res.cleaned).toContain('测试作品');
    expect(res.cleaned).not.toContain('2.5GB');
    expect(buildSearchUrl('https://example.com/?q={q}', '测试 词')).toBe(
      'https://example.com/?q=%E6%B5%8B%E8%AF%95%20%E8%AF%8D',
    );
  });

  it('支持拼音别名且不因 https 协议头产生子序列误命中噪音', () => {
    const site = makeSite({
      name: 'Pixiv',
      url: 'https://www.pixiv.net/',
      description: '插画社区，海量二次元美图壁纸',
      tags: ['插画'],
    });
    expect(scoreSiteMatch(site, 'pixiv')).toBeGreaterThan(100);
    expect(scoreSiteMatch(site, 'mt')).toBeGreaterThan(0); // 美图拼音首字母
    expect(scoreSiteMatch(site, 'htp')).toBe(0); // 不再被 https:// 误命中
  });
});

describe('安全与排序辅助函数', () => {
  it('sanitizeWallpaperUrl 拦截非 http/https 协议', () => {
    expect(sanitizeWallpaperUrl('https://cdn.example.com/bg.png')).toBe(
      'https://cdn.example.com/bg.png',
    );
    expect(sanitizeWallpaperUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeWallpaperUrl('data:image/svg+xml,<svg/>')).toBeNull();
  });

  it('reorderSitesWithinSubset 仅重排可见子集槽位并保持其他站点位置不变', () => {
    const list = ['a', 'x', 'b', 'y', 'c'].map((id) => makeSite({ id }));
    const next = reorderSitesWithinSubset(list, ['a', 'b', 'c'], 'c', 'a');
    expect(next.map((s) => s.id)).toEqual(['c', 'x', 'a', 'y', 'b']);
  });
});
