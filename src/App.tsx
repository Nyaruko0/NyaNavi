import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Briefcase,
  CloudUpload,
  Fish,
  Flame,
  Github,
  Loader2,
  Lock,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { CATEGORIES as DEFAULT_CATEGORIES, DEFAULT_SITES } from './data/defaultSites';
import type {
  AppearanceSettings,
  AppMode,
  CategoryId,
  CategoryMeta,
  HealthResult,
  SiteItem,
} from './types';
import { cleanSearchQuery } from './utils/cleanQuery';
import { scoreSiteMatch } from './utils/fuzzyMatch';
import { checkSiteHealth } from './utils/healthCheck';
import {
  clearGitHubConfig,
  DEFAULT_GITHUB_CONFIG,
  fetchCategoriesFromGitHub,
  fetchEncryptedVaultFromGitHub,
  fetchPrivateSitesFromGitHub,
  fetchSitesFromGitHub,
  getPrivateRepoConfig,
  loadGitHubConfig,
  saveCategoriesToGitHub,
  saveEncryptedVaultToGitHub,
  saveGitHubConfig,
  savePrivateSitesToGitHub,
  saveSitesToGitHub,
  verifyGitHubToken,
  type GitHubConfig,
} from './utils/githubSync';
import {
  decryptVaultSites,
  encryptVaultSites,
  type EncryptedVaultPayload,
} from './utils/vaultCrypto';
import {
  clearOAuthMemberSession,
  consumeOAuthHashCallback,
  loadOAuthMemberSession,
} from './utils/oauthConfig';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { SiteCard } from './components/SiteCard';
import { SiteModal } from './components/SiteModal';
import { AdminModal } from './components/AdminModal';
import { CategoryModal } from './components/CategoryModal';
import { NsfwUnlockModal } from './components/NsfwUnlockModal';
import {
  ACCENT_THEMES,
  DEFAULT_APPEARANCE,
  FONT_SIZE_SCALES,
  SettingsDrawer,
  SITE_ICON_PRESETS,
} from './components/SettingsDrawer';
import {
  pickPortalMessage,
  PortalModal,
  type PortalTarget,
} from './components/PortalModal';
import type { PortalMessage } from './data/portalMessages';

const STORAGE_PINS_KEY = 'nyanavi_pins_v1';
const STORAGE_MODE_KEY = 'nyanavi_mode_v1';
const STORAGE_THEME_KEY = 'nyanavi_theme_v1';
const STORAGE_APPEARANCE_KEY = 'nyanavi_appearance_v1';
const STORAGE_FRIEND_PASS_KEY = 'nyanavi_friend_pass_v1';

function ensurePrivateVaultCategory(list: CategoryMeta[]): CategoryMeta[] {
  const hasVault = list.some((c) => c.id === 'private_vault');
  if (hasVault) return list;
  const defVault = DEFAULT_CATEGORIES.find((c) => c.id === 'private_vault');
  return defVault ? [defVault, ...list] : list;
}

const DEFAULT_FALLBACK_ICON_MAP = new Map(
  DEFAULT_SITES.filter((s) => s.fallbackIcon).map((s) => [s.id, s.fallbackIcon!]),
);

const DEFAULT_CATEGORY_MAP = new Map(DEFAULT_SITES.map((s) => [s.id, s.category]));

function hydrateSites(list: SiteItem[]): SiteItem[] {
  return list.map((item) => {
    let next = item;
    // 兼容旧版 posts / ai_image_search / web_tools 分类，自动迁移到细分子分类
    const rawCat = next.category as string;
    if (rawCat === 'posts' || rawCat === 'ai_image_search' || rawCat === 'web_tools') {
      const mapped =
        DEFAULT_CATEGORY_MAP.get(next.id) ||
        (rawCat === 'posts' ? 'acg_resources' : 'work_toolbox');
      next = { ...next, category: mapped };
    }
    if (!next.fallbackIcon) {
      const fb = DEFAULT_FALLBACK_ICON_MAP.get(next.id);
      if (fb) next = { ...next, fallbackIcon: fb };
    }
    return next;
  });
}

function loadLocalPins(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_PINS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadInitialAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** 仅重排 list 中属于 visibleIds 子集的槽位顺序，将 fromId 移至 toId 所在位置，保持其余站点原位不变 */
function reorderSitesWithinSubset(
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

export default function App() {
  const [sites, setSites] = useState<SiteItem[]>(DEFAULT_SITES);
  const [categories, setCategories] = useState<CategoryMeta[]>(DEFAULT_CATEGORIES);
  const [privateSites, setPrivateSites] = useState<SiteItem[]>([]);
  const [friendVaultSites, setFriendVaultSites] = useState<SiteItem[]>([]);
  const [friendUnlocked, setFriendUnlocked] = useState<boolean>(false);
  const [localPins, setLocalPins] = useState<Record<string, boolean>>(loadLocalPins);
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadInitialAppearance);

  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(loadGitHubConfig);
  const [authRole, setAuthRole] = useState<'none' | 'member' | 'admin'>('none');
  const [authUser, setAuthUser] = useState<string | undefined>(undefined);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [hasUnsynced, setHasUnsynced] = useState<boolean>(false);
  const [hasUnsyncedPrivate, setHasUnsyncedPrivate] = useState<boolean>(false);
  const [hasUnsyncedCategories, setHasUnsyncedCategories] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [mode, setMode] = useState<AppMode>(() => {
    const initApp = loadInitialAppearance();
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'work' || saved === 'moyu') return saved;
    if (saved === 'nsfw' && initApp.enableNsfwMode) return 'nsfw';
    return 'moyu';
  });
  const [lastNonWorkMode, setLastNonWorkMode] = useState<'moyu' | 'nsfw'>(() => {
    const initApp = loadInitialAppearance();
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    return saved === 'nsfw' && initApp.enableNsfwMode ? 'nsfw' : 'moyu';
  });
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved) return saved === 'dark';
    return false;
  });

  const [activeSection, setActiveSection] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [nsfwUnlockOpen, setNsfwUnlockOpen] = useState<boolean>(false);
  const [draggingSite, setDraggingSite] = useState<{ id: string; sectionId: string } | null>(null);
  const [dragOverSiteId, setDragOverSiteId] = useState<string | null>(null);
  const [scrollPos, setScrollPos] = useState<{ atTop: boolean; atBottom: boolean }>({
    atTop: true,
    atBottom: false,
  });

  const [healthMap, setHealthMap] = useState<Record<string, HealthResult>>({});
  const [batchChecking, setBatchChecking] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [portalTarget, setPortalTarget] = useState<PortalTarget | null>(null);
  const [portalMessage, setPortalMessage] = useState<PortalMessage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = authRole === 'admin' && Boolean(ghConfig);
  const canViewPrivate = canManage || (authRole === 'member' && friendUnlocked);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // 1. 启动时从静态 ./sites.json 与 ./categories.json 拉取最新发布数据
  useEffect(() => {
    let cancelled = false;
    fetch(`./sites.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setSites(hydrateSites(data as SiteItem[]));
        }
      })
      .catch(() => {
        // 离线或本地兜底使用 DEFAULT_SITES
      });

    fetch(`./categories.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setCategories(ensurePrivateVaultCategory(data as CategoryMeta[]));
        }
      })
      .catch(() => {
        // 未发布 categories.json 时使用默认分类
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. 启动时自动处理 GitHub 登录态（支持 OAuth 一键登录回调 与 站长 Token 登录）
  useEffect(() => {
    let cancelled = false;

    const tryAutoUnlockForMember = async (username: string, ownerName: string) => {
      const savedPass = localStorage.getItem(STORAGE_FRIEND_PASS_KEY);
      if (!savedPass) return false;
      try {
        const vaultRes = await fetch(`./vault.enc?t=${Date.now()}`, { cache: 'no-store' });
        if (!vaultRes.ok) return false;
        const payload = (await vaultRes.json()) as EncryptedVaultPayload;
        const decrypted = await decryptVaultSites(payload, savedPass);
        const u = username.toLowerCase();
        const ownerLower = ownerName.toLowerCase();
        if (
          u === ownerLower ||
          (decrypted.allowedUsers.length > 0 && decrypted.allowedUsers.includes(u))
        ) {
          if (!cancelled) {
            setFriendVaultSites(decrypted.sites);
            setFriendUnlocked(true);
          }
          return true;
        }
        localStorage.removeItem(STORAGE_FRIEND_PASS_KEY);
      } catch {
        localStorage.removeItem(STORAGE_FRIEND_PASS_KEY);
      }
      return false;
    };

    // 2a. 若刚从 GitHub OAuth 授权跳回，消费 hash 并自动打开密钥输入框
    const freshOAuth = consumeOAuthHashCallback();
    if (freshOAuth) {
      setAuthRole('member');
      setAuthUser(freshOAuth.login);
      setPrivateSites([]);
      tryAutoUnlockForMember(freshOAuth.login, DEFAULT_GITHUB_CONFIG.owner).then((ok) => {
        if (cancelled) return;
        if (ok) {
          showToast(`欢迎回来 @${freshOAuth.login}，已自动解锁私密库（只读）`);
        } else {
          setAdminModalOpen(true);
          showToast(`已登录 @${freshOAuth.login}，请输入站长给你的明文密钥`);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // 2b. 若没有站长 Token，检查已保存的好友 OAuth 会话
    if (!ghConfig) {
      const savedMember = loadOAuthMemberSession();
      if (savedMember) {
        setAuthRole('member');
        setAuthUser(savedMember.login);
        setPrivateSites([]);
        tryAutoUnlockForMember(savedMember.login, DEFAULT_GITHUB_CONFIG.owner);
      } else {
        setAuthRole('none');
        setAuthUser(undefined);
        setPrivateSites([]);
        setFriendVaultSites([]);
        setFriendUnlocked(false);
      }
      return () => {
        cancelled = true;
      };
    }

    // 2c. 校验本地保存的 GitHub Token（站长或 Token 登录用户）
    verifyGitHubToken(ghConfig).then(async (res) => {
      if (cancelled) return;
      if (!res.valid || !res.username) {
        setAuthRole('none');
        setAuthUser(undefined);
        setPrivateSites([]);
        setFriendVaultSites([]);
        setFriendUnlocked(false);
        clearGitHubConfig();
        setGhConfig(null);
        return;
      }

      setAuthUser(res.username);

      if (res.canPush) {
        setAuthRole('admin');
        const [latest, latestCats, privList] = await Promise.all([
          fetchSitesFromGitHub(ghConfig).catch(() => null),
          fetchCategoriesFromGitHub(ghConfig).catch(() => null),
          (async () => {
            if (getPrivateRepoConfig(ghConfig)) {
              const fromPrivRepo = await fetchPrivateSitesFromGitHub(ghConfig).catch(() => []);
              if (fromPrivRepo.length > 0) return fromPrivRepo;
            }
            if (ghConfig.vaultPassphrase?.trim()) {
              const enc = await fetchEncryptedVaultFromGitHub(ghConfig).catch(() => null);
              if (enc) {
                return decryptVaultSites(enc, ghConfig.vaultPassphrase)
                  .then((d) => d.sites)
                  .catch(() => []);
              }
            }
            return [];
          })(),
        ]);
        if (!cancelled && latest && latest.sites.length > 0) {
          setSites(hydrateSites(latest.sites));
        }
        if (!cancelled && latestCats && latestCats.length > 0) {
          setCategories(ensurePrivateVaultCategory(latestCats));
        }
        if (!cancelled) {
          setPrivateSites(privList);
        }
      } else {
        setAuthRole('member');
        setPrivateSites([]);
        await tryAutoUnlockForMember(
          res.username,
          ghConfig.owner || DEFAULT_GITHUB_CONFIG.owner,
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ghConfig, showToast]);

  // 持久化本地个人收藏、模式、主题与外观设置
  useEffect(() => {
    localStorage.setItem(STORAGE_PINS_KEY, JSON.stringify(localPins));
  }, [localPins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_APPEARANCE_KEY, JSON.stringify(appearance));
    const theme = ACCENT_THEMES[appearance.accent] || ACCENT_THEMES.sakura;
    const fontScale = FONT_SIZE_SCALES[appearance.fontSize] || FONT_SIZE_SCALES.md;
    const root = document.documentElement;
    root.style.setProperty('--nya-root-size', fontScale.rootPx);
    root.style.setProperty('--nya-accent', mode === 'work' ? '#0284c7' : theme.primary);
    root.style.setProperty('--nya-accent-2', mode === 'work' ? '#6366f1' : theme.secondary);
    root.style.setProperty(
      '--nya-accent-soft',
      mode === 'work' ? 'rgba(2, 132, 199, 0.1)' : theme.soft,
    );
    root.style.setProperty(
      '--nya-accent-border',
      mode === 'work' ? 'rgba(2, 132, 199, 0.35)' : theme.border,
    );
  }, [appearance, mode]);

  // 动态同步网页标签图标、Apple Touch Icon 与对应 PWA manifest（选好图标再点“添加到主屏幕”即可安装该款图标）
  useEffect(() => {
    const iconPreset = SITE_ICON_PRESETS[appearance.siteIcon] || SITE_ICON_PRESETS.neko;
    const fav = document.getElementById('nya-favicon') as HTMLLinkElement | null;
    if (fav) fav.href = iconPreset.favicon;
    const apple = document.getElementById('nya-apple-icon') as HTMLLinkElement | null;
    if (apple) apple.href = iconPreset.apple;
    const manifest = document.getElementById('nya-manifest') as HTMLLinkElement | null;
    if (manifest) manifest.href = iconPreset.manifest;
  }, [appearance.siteIcon]);

  // 监听滚动位置以高亮/控制回顶与直达底部按键
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      setScrollPos({
        atTop: y < 120,
        atBottom: maxScroll - y < 120,
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    if (mode !== 'work') {
      setLastNonWorkMode(mode);
    }
    document.title =
      mode === 'work'
        ? 'NyaDesk · 开发与效率工作台'
        : mode === 'moyu'
          ? 'NyaNavi · 全年龄二次元摸鱼导航'
          : 'NyaNavi · 二次元与 ACG 精选导航';
  }, [mode]);

  // 若用户在外观设置中关闭 NSFW 模式，自动从 NSFW 切回摸鱼模式
  useEffect(() => {
    if (!appearance.enableNsfwMode && mode === 'nsfw') {
      setMode('moyu');
      setLastNonWorkMode('moyu');
      showToast('NSFW 模式已关闭锁定，已切回摸鱼模式');
    }
  }, [appearance.enableNsfwMode, mode, showToast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // 快捷键 Alt+W 秒切模式，/ 快捷聚焦搜索框
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setMode((prev) => {
          if (prev !== 'work') {
            showToast('已秒切工作模式（仅保留开发与效率工具）');
            return 'work';
          }
          const targetMode: 'moyu' | 'nsfw' =
            lastNonWorkMode === 'nsfw' && appearance.enableNsfwMode ? 'nsfw' : 'moyu';
          showToast(
            targetMode === 'moyu' ? '已恢复至摸鱼模式' : '已恢复至 NSFW 完整模式',
          );
          return targetMode;
        });
        return;
      }
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        document.getElementById('nyanavi-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appearance.enableNsfwMode, lastNonWorkMode, showToast]);

  // 退出站长模式/锁定暗号或切换模式时，若当前停留在不可见分类，自动切回全部
  const workCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.workAllowed).map((c) => c.id)),
    [categories],
  );

  const moyuHiddenCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.hideInMoyu || c.nsfwOnly).map((c) => c.id)),
    [categories],
  );

  // 退出站长模式/锁定暗号或切换模式时，若当前停留在非当前模式的分类，自动切回全部
  useEffect(() => {
    const cat = categories.find((c) => c.id === activeSection);
    if (!cat) return;
    if (
      (mode === 'work' && !cat.workAllowed) ||
      (mode === 'moyu' && (cat.nsfwOnly || cat.hideInMoyu)) ||
      (mode === 'nsfw' && cat.workAllowed) ||
      (cat.privateOnly && !canViewPrivate)
    ) {
      setActiveSection('all');
    }
  }, [mode, canViewPrivate, activeSection, categories]);

  // 合并展示列表：站长登录合并 privateSites，好友暗号解锁合并只读 friendVaultSites
  const displaySites = useMemo(() => {
    if (canManage) return [...privateSites, ...sites];
    const base = friendUnlocked ? [...friendVaultSites, ...sites] : sites;
    return base.map((s) => (s.id in localPins ? { ...s, pinned: localPins[s.id] } : s));
  }, [sites, privateSites, friendVaultSites, friendUnlocked, localPins, canManage]);

  // 三模式严格独立：工作（纯工具/技术）、摸鱼（纯全年龄娱乐）、NSFW（纯里站+私密库）
  const modeSites = useMemo(() => {
    if (mode === 'work') {
      return displaySites.filter((s) => !s.nsfw && workCategoryIds.has(s.category));
    }
    if (mode === 'moyu') {
      return displaySites.filter(
        (s) => !s.nsfw && !moyuHiddenCategoryIds.has(s.category),
      );
    }
    return displaySites.filter(
      (s) => (s.nsfw || s.category === 'private_vault') && !workCategoryIds.has(s.category),
    );
  }, [displaySites, mode, workCategoryIds, moyuHiddenCategoryIds]);

  const allCategoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of displaySites) {
      map[s.category] = (map[s.category] || 0) + 1;
    }
    return map;
  }, [displaySites]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of modeSites) {
      map[s.category] = (map[s.category] || 0) + 1;
    }
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

  const groupedSections = useMemo(() => {
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
        title: '站长爱看😋',
        description: '站长精选推荐的高频入口',
        items: pinnedSites,
      });
    }

    for (const cat of categories) {
      if (mode === 'work' && !cat.workAllowed) continue;
      if (mode === 'moyu' && (cat.nsfwOnly || cat.hideInMoyu)) continue;
      if (mode === 'nsfw' && cat.workAllowed) continue;
      if (cat.privateOnly && !canViewPrivate) continue;
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
  }, [activeSection, canManage, canViewPrivate, categories, filteredSites, mode, modeSites, pinnedSites, query]);

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

  const handleBatchCheck = useCallback(async () => {
    if (batchChecking) return;
    const targets = activeSection === 'all' && !query.trim() ? modeSites : filteredSites;
    if (targets.length === 0) return;

    setBatchChecking(true);
    showToast(`开始检测 ${targets.length} 个站点的连通性...`);

    const queue = [...targets];
    const concurrency = 6;

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

  // 收藏置顶：站长按归属改公开库或私有库，访客仅改本地收藏
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
    [canManage, privateSites, sites],
  );

  const anyUnsynced = hasUnsynced || hasUnsyncedPrivate || hasUnsyncedCategories;

  // 站长专属：严格双仓分流同步（私密站点绝不写入公开仓库！）
  const handleSyncToGitHub = useCallback(async () => {
    if (!ghConfig || !canManage || syncing) return;
    setSyncing(true);
    try {
      const results: string[] = [];

      // 1. 公开仓库站点：强制二次过滤，绝对禁止写入任何 privateOnly / private_vault 站点
      if (hasUnsynced || (!hasUnsyncedPrivate && !hasUnsyncedCategories)) {
        const safePublicSites = sites.filter(
          (s) => !s.privateOnly && s.category !== 'private_vault',
        );
        const pubRes = await saveSitesToGitHub(ghConfig, safePublicSites);
        setHasUnsynced(false);
        results.push(`公开站 (${pubRes.commitSha})`);
      }

      // 1b. 自定义分类目录同步至 public/categories.json
      if (hasUnsyncedCategories) {
        const catRes = await saveCategoriesToGitHub(ghConfig, categories);
        setHasUnsyncedCategories(false);
        results.push(`分类目录 (${catRes.commitSha})`);
      }

      // 2. 私密库同步：只要私密库有改动，或已配置好友密钥且有私密站点，点击同步即确保更新私有仓与加密 vault.enc
      const hasPrivRepo = Boolean(getPrivateRepoConfig(ghConfig));
      const hasPassphrase = Boolean(ghConfig.vaultPassphrase?.trim());
      const shouldSyncPrivate =
        hasUnsyncedPrivate || (hasPassphrase && privateSites.length > 0);

      if (shouldSyncPrivate) {
        if (!hasPrivRepo && !hasPassphrase) {
          throw new Error(
            '请先在“站长管理”弹窗中填写“独立私有仓库名”或“好友访问明文密钥”，再同步私密站点',
          );
        }
        if (hasPrivRepo && hasUnsyncedPrivate) {
          const privRes = await savePrivateSitesToGitHub(ghConfig, privateSites);
          results.push(`私有库 (${privRes.commitSha})`);
        }
        if (hasPassphrase && privateSites.length > 0) {
          const encrypted = await encryptVaultSites(
            privateSites,
            ghConfig.vaultPassphrase!,
            ghConfig.vaultAllowedUsers,
          );
          const encRes = await saveEncryptedVaultToGitHub(ghConfig, encrypted);
          results.push(`加密库 vault.enc (${encRes.commitSha})`);
        }
        setHasUnsyncedPrivate(false);
      }

      showToast(`已同步至 GitHub：${results.join(' · ')}`);
    } catch (err) {
      showToast(err instanceof Error ? `同步失败：${err.message}` : '同步到 GitHub 失败');
    } finally {
      setSyncing(false);
    }
  }, [
    ghConfig,
    canManage,
    syncing,
    hasUnsynced,
    hasUnsyncedPrivate,
    hasUnsyncedCategories,
    sites,
    categories,
    privateSites,
    showToast,
  ]);

  // 站长专属：新增或编辑分类目录
  const handleSaveCategory = useCallback(
    (cat: CategoryMeta, isEdit: boolean) => {
      if (!canManage) return;
      setCategories((prev) => {
        if (isEdit) {
          return prev.map((c) => (c.id === cat.id ? cat : c));
        }
        return [...prev, cat];
      });
      setHasUnsyncedCategories(true);
      showToast(
        isEdit
          ? `已更新目录「${cat.name}」，请点顶部“同步到 GitHub”发布`
          : `已新建目录「${cat.name}」，请点顶部“同步到 GitHub”发布`,
      );
    },
    [canManage, showToast],
  );

  // 站长专属：调整分类目录排列顺序
  const handleReorderCategories = useCallback(
    (nextCategories: CategoryMeta[]) => {
      if (!canManage) return;
      setCategories(nextCategories);
      setHasUnsyncedCategories(true);
    },
    [canManage],
  );

  // 站长专属：同一分类内调整站点卡片顺序（支持拖拽与前移/后移按钮，自动区分公开库与私有库）
  const handleReorderSiteInSection = useCallback(
    (sectionItems: SiteItem[], fromId: string, toId: string) => {
      if (!canManage || fromId === toId) return;
      const visibleIds = sectionItems.map((s) => s.id);
      if (!visibleIds.includes(fromId) || !visibleIds.includes(toId)) return;

      const isPrivate = privateSites.some((s) => s.id === fromId);
      if (isPrivate) {
        setPrivateSites((prev) => reorderSitesWithinSubset(prev, visibleIds, fromId, toId));
        setHasUnsyncedPrivate(true);
      } else {
        setSites((prev) => reorderSitesWithinSubset(prev, visibleIds, fromId, toId));
        setHasUnsynced(true);
      }
    },
    [canManage, privateSites],
  );

  const handleMoveSiteInSection = useCallback(
    (sectionItems: SiteItem[], siteId: string, direction: -1 | 1) => {
      const idx = sectionItems.findIndex((s) => s.id === siteId);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= sectionItems.length) return;
      handleReorderSiteInSection(sectionItems, siteId, sectionItems[targetIdx].id);
    },
    [handleReorderSiteInSection],
  );

  // 站长专属：删除分类目录（若目录下有站点则安全迁移到同模式其他目录）
  const handleDeleteCategory = useCallback(
    (catId: CategoryId) => {
      if (!canManage || catId === 'private_vault') return;
      const target = categories.find((c) => c.id === catId);
      if (!target) return;
      const affected = sites.filter((s) => s.category === catId);
      const fallback = categories.find(
        (c) =>
          c.id !== catId &&
          !c.privateOnly &&
          Boolean(c.workAllowed) === Boolean(target.workAllowed) &&
          Boolean(c.nsfwOnly) === Boolean(target.nsfwOnly),
      );

      const confirmMsg =
        affected.length > 0
          ? `目录「${target.name}」下还有 ${affected.length} 个站点，删除后它们将自动转移到「${fallback?.name || '其他分类'}」，确认删除吗？`
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
      if (activeSection === catId) {
        setActiveSection('all');
      }
      showToast(`已删除目录「${target.name}」，请点顶部“同步到 GitHub”发布`);
    },
    [activeSection, canManage, categories, showToast, sites],
  );

  const handleSaveSite = useCallback(
    (site: SiteItem) => {
      if (!canManage) return;
      const isPrivate = Boolean(site.privateOnly || site.category === 'private_vault');
      const normalized: SiteItem = isPrivate
        ? { ...site, nsfw: true, privateOnly: true }
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
    [canManage, editingSite, showToast],
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
    [canManage, privateSites, sites, showToast],
  );

  const handleExport = useCallback(() => {
    if (!canManage) return;
    const blob = new Blob([JSON.stringify(sites, null, 2)], {
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
        // 智能识别：若导入的 JSON 全部标记为私密站点，自动归入私有扩展库，不污染公开库！
        const isPrivateBundle =
          parsed.length > 0 &&
          parsed.every((i: SiteItem) => i.privateOnly || i.category === 'private_vault');
        if (isPrivateBundle) {
          const normalized = parsed.map((i: SiteItem) => ({
            ...i,
            nsfw: true,
            privateOnly: true,
          }));
          setPrivateSites((prev) => {
            const existingUrls = new Set(
              prev.map((x) => x.url.replace(/\/+$/, '').toLowerCase()),
            );
            const existingIds = new Set(prev.map((x) => x.id));
            const additions = normalized.filter(
              (x) =>
                !existingIds.has(x.id) &&
                !existingUrls.has(x.url.replace(/\/+$/, '').toLowerCase()),
            );
            return [...additions, ...prev];
          });
          setHasUnsyncedPrivate(true);
          showToast(
            `已增量合并 ${normalized.length} 个私密库站点（保留原有私密数据），请点顶部“同步到 GitHub”写入私有仓库`,
          );
        } else {
          const safePublic = hydrateSites(parsed).filter(
            (i) => !i.privateOnly && i.category !== 'private_vault',
          );
          setSites(safePublic);
          setHasUnsynced(true);
          showToast(`成功导入 ${safePublic.length} 个公开站点，请点顶部“同步到 GitHub”发布`);
        }
      } catch {
        showToast('导入失败：请确认是有效的 NyaNavi JSON 文件');
      }
    },
    [canManage, showToast],
  );

  const handleReset = useCallback(() => {
    if (!canManage) return;
    if (!window.confirm('确定恢复默认内置公开站点列表吗？（不影响私有库，同步后生效）')) {
      return;
    }
    setSites(DEFAULT_SITES);
    setHasUnsynced(true);
    showToast('已恢复默认公开站点列表，请点顶部“同步到 GitHub”发布');
  }, [canManage, showToast]);

  const handleAdminAuthenticated = useCallback(
    async (config: GitHubConfig, username?: string) => {
      const prevPass = ghConfig?.vaultPassphrase?.trim() || '';
      const nextPass = config.vaultPassphrase?.trim() || '';
      const prevUsers = ghConfig?.vaultAllowedUsers?.trim() || '';
      const nextUsers = config.vaultAllowedUsers?.trim() || '';
      saveGitHubConfig(config);
      setGhConfig(config);
      setAuthRole('admin');
      setAuthUser(username);
      const [latest, privList] = await Promise.all([
        fetchSitesFromGitHub(config).catch(() => null),
        (async () => {
          if (getPrivateRepoConfig(config)) {
            const fromPrivRepo = await fetchPrivateSitesFromGitHub(config).catch(() => []);
            if (fromPrivRepo.length > 0) return fromPrivRepo;
          }
          if (nextPass) {
            const enc = await fetchEncryptedVaultFromGitHub(config).catch(() => null);
            if (enc) {
              return decryptVaultSites(enc, nextPass)
                .then((d) => d.sites)
                .catch(() => []);
            }
          }
          return [];
        })(),
      ]);
      if (latest && latest.sites.length > 0) {
        setSites(hydrateSites(latest.sites));
      }
      const finalPrivateList = privList.length > 0 ? privList : privateSites;
      if (privList.length > 0) {
        setPrivateSites(privList);
      }

      // 若配置了好友密钥且已有私密站点，保存站长配置时直接自动加密并发布 public/vault.enc
      if (nextPass && finalPrivateList.length > 0) {
        try {
          const encrypted = await encryptVaultSites(
            finalPrivateList,
            nextPass,
            nextUsers,
          );
          const encRes = await saveEncryptedVaultToGitHub(config, encrypted);
          setHasUnsyncedPrivate(false);
          showToast(
            `已解锁站长（@${username}）并自动发布加密库 vault.enc (${encRes.commitSha})，约 1 分钟后好友即可解锁`,
          );
          return;
        } catch (err) {
          setHasUnsyncedPrivate(true);
          showToast(
            err instanceof Error
              ? `站长已解锁，但发布加密库失败：${err.message}`
              : '站长已解锁，请手动点“同步到 GitHub”发布加密库',
          );
          return;
        }
      }

      if (
        nextPass &&
        (nextPass !== prevPass || nextUsers !== prevUsers) &&
        finalPrivateList.length > 0
      ) {
        setHasUnsyncedPrivate(true);
      }
      showToast(
        `站长模式已解锁${username ? `（@${username}）` : ''}${
          privList.length > 0 ? ` · 已加载 ${privList.length} 个私密站点` : ''
        }`,
      );
    },
    [ghConfig?.vaultPassphrase, ghConfig?.vaultAllowedUsers, privateSites, showToast],
  );

  const handleMemberAuthenticated = useCallback(
    (config: GitHubConfig, username: string) => {
      saveGitHubConfig(config);
      setGhConfig(config);
      setAuthRole('member');
      setAuthUser(username);
      setPrivateSites([]);
      showToast(`已登录 @${username}（只读），请输入站长给你的密钥获取私密内容`);
    },
    [showToast],
  );

  const handleFriendUnlocked = useCallback(
    (decryptedSites: SiteItem[], passphrase: string, remember: boolean) => {
      setFriendVaultSites(decryptedSites);
      setFriendUnlocked(true);
      if (remember) {
        localStorage.setItem(STORAGE_FRIEND_PASS_KEY, passphrase);
      } else {
        localStorage.removeItem(STORAGE_FRIEND_PASS_KEY);
      }
      showToast(`好友身份与密钥验证通过！已解锁 ${decryptedSites.length} 个私密站点（只读）`);
    },
    [showToast],
  );

  const handleFriendLock = useCallback(() => {
    localStorage.removeItem(STORAGE_FRIEND_PASS_KEY);
    setFriendVaultSites([]);
    setFriendUnlocked(false);
    showToast('已锁定私密内容并清除本地密钥');
  }, [showToast]);

  const handleAdminLogout = useCallback(() => {
    clearGitHubConfig();
    clearOAuthMemberSession();
    localStorage.removeItem(STORAGE_FRIEND_PASS_KEY);
    setGhConfig(null);
    setAuthRole('none');
    setAuthUser(undefined);
    setPrivateSites([]);
    setFriendVaultSites([]);
    setFriendUnlocked(false);
    setHasUnsynced(false);
    setHasUnsyncedPrivate(false);
    showToast('已退出登录，私密内容已清空');
  }, [showToast]);

  const handleNavigate = useCallback(
    (url: string, site: SiteItem, keyword?: string) => {
      // 工作模式或关闭传送门开关时直接新标签页静默打开
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

  const fontClass = `font-style-${appearance.fontStyle}`;

  return (
    <div className={`relative min-h-screen transition-colors duration-300 ${bgClass} ${fontClass}`}>
      {/* 可选自定义壁纸层 */}
      {appearance.wallpaperUrl.trim() && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
          style={{
            backgroundImage: `url(${appearance.wallpaperUrl.trim()})`,
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
          authRole={authRole}
          canManage={canManage}
          canViewPrivate={canViewPrivate}
          friendUnlocked={friendUnlocked}
          authUser={authUser}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenAdmin={() => setAdminModalOpen(true)}
          onManageCategories={() => setCategoryModalOpen(true)}
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
          {/* 极简顶部工具栏（Android 窄屏 & PC 宽屏自适应） */}
          <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-[#0c101b]/80">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="打开菜单"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* 移动端精简品牌名（不截断） */}
                <span className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:hidden dark:text-white">
                  {mode === 'work' ? 'NyaDesk' : 'NyaNavi'}
                </span>

                <div className="hidden items-center gap-2 sm:flex">
                  {mode === 'work' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      工作模式 · {modeSites.length} 站
                    </span>
                  ) : mode === 'moyu' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                      <Fish className="h-3.5 w-3.5" />
                      摸鱼模式 · {modeSites.length} 表站
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nya-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--nya-accent)]">
                      <Flame className="h-3.5 w-3.5" />
                      NSFW 模式 · {modeSites.length} 站
                    </span>
                  )}

                  {healthSummary.total > 0 && (
                    <span className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs text-slate-500 md:inline-flex dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
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
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {/* 站长专属：同步到 GitHub 按钮 */}
                {canManage && (
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={handleSyncToGitHub}
                    className={`relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium shadow-2xs transition disabled:opacity-60 ${
                      anyUnsynced
                        ? 'bg-[var(--nya-accent)] text-white hover:opacity-90'
                        : 'border border-emerald-200/80 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                    }`}
                    title="公开站点同步至公开仓库，私密站点仅同步至独立 Private 私有仓库"
                  >
                    {syncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {syncing ? '同步中' : anyUnsynced ? '同步到 GitHub' : '已同步'}
                    </span>
                    {anyUnsynced && !syncing && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                )}

                {/* 批量存活检测 */}
                <button
                  type="button"
                  disabled={batchChecking}
                  onClick={handleBatchCheck}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600"
                  title="批量检测当前可见站点的连通性与延迟"
                >
                  {batchChecking ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className="hidden sm:inline">{batchChecking ? '检测中' : '测速'}</span>
                </button>

                {/* 工作 / 摸鱼 / NSFW 三段切换开关 */}
                <div
                  className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/80"
                  title="快捷键 Alt+W 一键秒切工作模式"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode('work');
                      showToast('已切换至工作模式（仅保留工具与文档）');
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 text-xs font-medium transition-all ${
                      mode === 'work'
                        ? 'bg-white text-sky-600 shadow-2xs dark:bg-slate-700 dark:text-sky-300'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Briefcase className="hidden h-3.5 w-3.5 sm:inline" />
                    工作
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('moyu');
                      showToast('已切换至摸鱼模式（全年龄表站，安全摸鱼）');
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 text-xs font-medium transition-all ${
                      mode === 'moyu'
                        ? 'bg-teal-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Fish className="hidden h-3.5 w-3.5 sm:inline" />
                    摸鱼
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!appearance.enableNsfwMode) {
                        setNsfwUnlockOpen(true);
                        return;
                      }
                      setMode('nsfw');
                      showToast('已切换至 NSFW 完整模式');
                    }}
                    title={
                      appearance.enableNsfwMode
                        ? '切换至 NSFW 里站模式'
                        : 'NSFW 模式默认锁定，点击解锁或在外观设置中开启'
                    }
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 sm:px-2.5 text-xs font-medium transition-all ${
                      mode === 'nsfw'
                        ? 'bg-[var(--nya-accent)] text-white shadow-2xs'
                        : !appearance.enableNsfwMode
                          ? 'text-slate-400/80 hover:bg-white/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {appearance.enableNsfwMode ? (
                      <Flame className="hidden h-3.5 w-3.5 sm:inline" />
                    ) : (
                      <Lock className="h-3 w-3 opacity-80" />
                    )}
                    NSFW
                  </button>
                </div>

                {/* 外观与版面设置按钮 */}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 transition hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200"
                  title="自定义字号、主题色、列数、密度与背景壁纸"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">外观</span>
                </button>

                {/* 亮/暗主题切换 */}
                <button
                  type="button"
                  onClick={() => setDark((d) => !d)}
                  className="rounded-xl border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-amber-300"
                  aria-label="切换明暗主题"
                  title={dark ? '切换至明亮模式' : '切换至暗黑模式'}
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 全局吸顶搜索框（始终固定在屏幕正上方中央） */}
            <div className="mx-auto max-w-[1440px] px-3 pb-2.5 sm:px-6">
              <SearchBar
                query={query}
                onChange={setQuery}
                searchableSites={modeSites}
                mode={mode}
                onNavigate={handleNavigate}
              />
            </div>
          </header>

          {/* 主体内容 */}
          <main className="mx-auto max-w-[1440px] px-3.5 pt-4 pb-20 sm:px-6 sm:pt-5">

            {/* Android / 移动端专属横向滑动分类胶囊条 */}
            <div className="no-scrollbar -mx-3.5 mb-5 flex items-center gap-2 overflow-x-auto px-3.5 pb-1 lg:hidden">
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeSection === 'all'
                    ? 'border-transparent bg-[var(--nya-accent)] text-white shadow-xs'
                    : 'border-slate-200/80 bg-white/85 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
                }`}
              >
                全部 ({modeSites.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('pinned')}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeSection === 'pinned'
                    ? 'border-transparent bg-amber-500 text-white shadow-xs'
                    : 'border-slate-200/80 bg-white/85 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
                }`}
              >
                站长爱看😋 ({pinnedSites.length})
              </button>
              {categories.filter((c) => {
                if (mode === 'work' && !c.workAllowed) return false;
                if (mode === 'moyu' && (c.nsfwOnly || c.hideInMoyu)) return false;
                if (mode === 'nsfw' && c.workAllowed) return false;
                if (c.privateOnly && !canViewPrivate) return false;
                return true;
              }).map((cat) => {
                const count = categoryCounts[cat.id] ?? 0;
                if (count === 0) return null;
                const active = activeSection === cat.id;
                const label = mode === 'work' && cat.workName ? cat.workName : cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSection(cat.id)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-transparent bg-[var(--nya-accent)] text-white shadow-xs'
                        : 'border-slate-200/80 bg-white/85 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {groupedSections.length === 0 || groupedSections.every((g) => g.items.length === 0) ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  当前筛选下没有匹配的站点
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  你可以直接点击上方搜索框内的站点胶囊进行站外直搜
                  {canManage ? '，或添加一个新站点' : ''}
                </p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSite(null);
                      setModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--nya-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    添加站点
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-9">
                {groupedSections.map((section) => (
                  <section key={section.id}>
                    <div className="mb-3.5 flex items-baseline justify-between gap-2">
                      <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-800 sm:text-lg dark:text-white">
                          <span
                            className="h-4 w-1 rounded-full"
                            style={{
                              background:
                                mode === 'work'
                                  ? '#0284c7'
                                  : 'linear-gradient(to bottom, var(--nya-accent), var(--nya-accent-2))',
                            }}
                          />
                          {section.title}
                          <span className="text-xs font-normal text-slate-400">
                            {section.items.length}
                          </span>
                        </h2>
                        {section.description && (
                          <p className="mt-1 pl-3 text-xs text-slate-400 dark:text-slate-500">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`grid gap-3 ${gridColsClass}`}>
                      {section.items.map((site, idx) => {
                        const isReorderable =
                          canManage &&
                          !query.trim() &&
                          section.id !== 'pinned-top' &&
                          section.id !== 'pinned' &&
                          section.id !== 'search-results' &&
                          section.items.length > 1;
                        return (
                          <SiteCard
                            key={site.id}
                            site={site}
                            health={healthMap[site.id]}
                            cleanedQuery={cleanedQuery}
                            canManage={canManage}
                            appearance={appearance}
                            canReorder={isReorderable}
                            isFirst={idx === 0}
                            isLast={idx === section.items.length - 1}
                            isDragging={
                              draggingSite?.id === site.id &&
                              draggingSite?.sectionId === section.id
                            }
                            isDragOver={
                              dragOverSiteId === site.id &&
                              draggingSite?.sectionId === section.id &&
                              draggingSite?.id !== site.id
                            }
                            onMove={(dir) =>
                              handleMoveSiteInSection(section.items, site.id, dir)
                            }
                            onDragStart={() =>
                              setDraggingSite({ id: site.id, sectionId: section.id })
                            }
                            onDragOver={() => {
                              if (
                                draggingSite &&
                                draggingSite.sectionId === section.id &&
                                draggingSite.id !== site.id
                              ) {
                                setDragOverSiteId(site.id);
                              }
                            }}
                            onDrop={() => {
                              if (
                                draggingSite &&
                                draggingSite.sectionId === section.id &&
                                draggingSite.id !== site.id
                              ) {
                                handleReorderSiteInSection(
                                  section.items,
                                  draggingSite.id,
                                  site.id,
                                );
                              }
                              setDraggingSite(null);
                              setDragOverSiteId(null);
                            }}
                            onDragEnd={() => {
                              setDraggingSite(null);
                              setDragOverSiteId(null);
                            }}
                            onNavigate={handleNavigate}
                            onTogglePin={handleTogglePin}
                            onEdit={(s) => {
                              setEditingSite(s);
                              setModalOpen(true);
                            }}
                            onDelete={handleDeleteSite}
                            onCheckHealth={handleCheckSingle}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

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

      {/* 新增/编辑站点弹窗（站长专属） */}
      <SiteModal
        open={modalOpen && canManage}
        editingSite={editingSite}
        categories={categories}
        defaultMode={mode}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSite}
      />

      {/* 站长分类目录管理弹窗 */}
      <CategoryModal
        open={categoryModalOpen && canManage}
        categories={categories}
        siteCounts={allCategoryCounts}
        defaultMode={mode}
        onClose={() => setCategoryModalOpen(false)}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
      />

      {/* 统一 GitHub 登录 / 站长管理 / 好友密钥解锁弹窗 */}
      <AdminModal
        open={adminModalOpen}
        currentConfig={ghConfig}
        authRole={authRole}
        authUser={authUser}
        friendUnlocked={friendUnlocked}
        friendVaultCount={friendVaultSites.length}
        onClose={() => setAdminModalOpen(false)}
        onAdminAuthenticated={handleAdminAuthenticated}
        onMemberAuthenticated={handleMemberAuthenticated}
        onFriendUnlocked={handleFriendUnlocked}
        onFriendLock={handleFriendLock}
        onLogout={handleAdminLogout}
      />

      {/* 外观与版面美化抽屉 */}
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

      {/* 二次元地名传送门跳转确认弹窗 */}
      <PortalModal
        target={portalTarget}
        message={portalMessage}
        onReroll={() => setPortalMessage((prev) => pickPortalMessage(prev?.id))}
        onConfirm={handleConfirmPortal}
        onClose={() => setPortalTarget(null)}
      />

      {/* NSFW 默认锁定解锁确认弹窗 */}
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

      {/* 快捷回到顶部 / 直达底部悬浮按钮组 */}
      <div className="fixed right-3.5 bottom-6 z-30 flex flex-col gap-2 sm:right-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          disabled={scrollPos.atTop}
          aria-label="回到顶部"
          title="回到顶部"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] active:scale-95 disabled:pointer-events-none disabled:opacity-35 sm:h-11 sm:w-11 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200"
        >
          <ArrowUp className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </button>
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: 'smooth',
            })
          }
          disabled={scrollPos.atBottom}
          aria-label="直达底部"
          title="直达底部"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-lg backdrop-blur-md transition hover:translate-y-0.5 hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] active:scale-95 disabled:pointer-events-none disabled:opacity-35 sm:h-11 sm:w-11 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200"
        >
          <ArrowDown className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* 轻量 Toast 提示 */}
      {toast && (
        <div className="fixed right-4 bottom-20 z-50 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur-md sm:right-5 sm:bottom-6 dark:bg-white/95 dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
