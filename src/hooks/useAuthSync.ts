import { useCallback, useEffect, useRef, useState } from 'react';
import { ensurePrivateVaultCategory } from '../data/defaultCategories';
import type { CategoryMeta, SiteItem } from '../types';
import {
  clearGitHubConfig,
  DEFAULT_GITHUB_CONFIG,
  fetchCategoriesFromGitHub,
  fetchEncryptedVaultFromGitHub,
  fetchPrivateAdminSettingsFromGitHub,
  fetchPrivateSitesFromGitHub,
  fetchSitesFromGitHub,
  getPrivateRepoConfig,
  loadGitHubConfig,
  saveCategoriesToGitHub,
  saveEncryptedVaultToGitHub,
  saveGitHubConfig,
  savePrivateAdminSettingsToGitHub,
  savePrivateSitesToGitHub,
  saveSitesToGitHub,
  verifyGitHubToken,
  type GitHubConfig,
} from '../utils/githubSync';
import {
  clearOAuthMemberSession,
  consumeOAuthHashCallback,
  loadOAuthMemberSession,
} from '../utils/oauthConfig';
import {
  DEFAULT_PRIVATE_BRANCH,
  DEFAULT_PRIVATE_PATH,
  DEFAULT_PRIVATE_REPO,
  isPublicSite,
} from '../utils/siteRules';
import {
  decryptVaultSites,
  encryptVaultSites,
  type EncryptedVaultPayload,
} from '../utils/vaultCrypto';
import { hydrateSites } from './useSiteCatalog';

const STORAGE_FRIEND_PASS_KEY = 'nyanavi_friend_pass_v1';

/** 站长私密站点读取回退链：优先私有仓库，失败/为空时再尝试用明文密钥解密 vault.enc */
async function loadAdminPrivateSites(
  config: GitHubConfig,
  passphrase?: string,
): Promise<SiteItem[]> {
  if (getPrivateRepoConfig(config)) {
    const fromPrivRepo = await fetchPrivateSitesFromGitHub(config).catch(() => []);
    if (fromPrivRepo.length > 0) return fromPrivRepo;
  }
  const cleanPass = passphrase?.trim();
  if (cleanPass) {
    const enc = await fetchEncryptedVaultFromGitHub(config).catch(() => null);
    if (enc) {
      return decryptVaultSites(enc, cleanPass)
        .then((d) => d.sites)
        .catch(() => []);
    }
  }
  return [];
}

interface UseAuthSyncOptions {
  sites: SiteItem[];
  categories: CategoryMeta[];
  setSites: React.Dispatch<React.SetStateAction<SiteItem[]>>;
  setCategories: React.Dispatch<React.SetStateAction<CategoryMeta[]>>;
  showToast: (msg: string) => void;
  openAdminModal: () => void;
}

export function useAuthSync({
  sites,
  categories,
  setSites,
  setCategories,
  showToast,
  openAdminModal,
}: UseAuthSyncOptions) {
  const [ghConfig, setGhConfig] = useState<GitHubConfig | null>(loadGitHubConfig);
  const [authRole, setAuthRole] = useState<'none' | 'member' | 'admin'>('none');
  const [authUser, setAuthUser] = useState<string | undefined>(undefined);
  const [privateSites, setPrivateSites] = useState<SiteItem[]>([]);
  const [friendVaultSites, setFriendVaultSites] = useState<SiteItem[]>([]);
  const [friendUnlocked, setFriendUnlocked] = useState<boolean>(false);

  const [hasUnsynced, setHasUnsynced] = useState<boolean>(false);
  const [hasUnsyncedPrivate, setHasUnsyncedPrivate] = useState<boolean>(false);
  const [hasUnsyncedCategories, setHasUnsyncedCategories] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  const sitesBaseShaRef = useRef<string | undefined>(undefined);

  const canManage = authRole === 'admin' && Boolean(ghConfig);
  const canViewPrivate = canManage || (authRole === 'member' && friendUnlocked);
  const anyUnsynced = hasUnsynced || hasUnsyncedPrivate || hasUnsyncedCategories;

  // 有未同步改动时防止误刷/关闭页面丢失修改
  useEffect(() => {
    if (!canManage || !anyUnsynced) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [canManage, anyUnsynced]);

  // 启动时自动处理 GitHub 登录态（OAuth 回调与站长 Token 校验）
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

    const freshOAuth = consumeOAuthHashCallback();
    if (freshOAuth) {
      const isOwner =
        freshOAuth.login.toLowerCase() === DEFAULT_GITHUB_CONFIG.owner.toLowerCase();

      if (isOwner && freshOAuth.adminToken) {
        const autoAdminCfg: GitHubConfig = {
          owner: ghConfig?.owner || DEFAULT_GITHUB_CONFIG.owner,
          repo: ghConfig?.repo || DEFAULT_GITHUB_CONFIG.repo,
          branch: ghConfig?.branch || DEFAULT_GITHUB_CONFIG.branch,
          path: ghConfig?.path || DEFAULT_GITHUB_CONFIG.path,
          token: freshOAuth.adminToken,
          privateRepo: freshOAuth.privateRepo || ghConfig?.privateRepo || DEFAULT_PRIVATE_REPO,
          privateBranch: ghConfig?.privateBranch || DEFAULT_PRIVATE_BRANCH,
          privatePath: ghConfig?.privatePath || DEFAULT_PRIVATE_PATH,
          vaultPassphrase: ghConfig?.vaultPassphrase || '',
          vaultAllowedUsers: ghConfig?.vaultAllowedUsers || '',
        };
        saveGitHubConfig(autoAdminCfg);
        setGhConfig(autoAdminCfg);
        showToast(`欢迎回来站长 @${freshOAuth.login}，正在自动进入站长模式...`);
        return () => {
          cancelled = true;
        };
      }

      if (!(isOwner && ghConfig)) {
        setAuthRole('member');
        setAuthUser(freshOAuth.login);
        setPrivateSites([]);
        if (isOwner) {
          openAdminModal();
          showToast(
            `已识别站长账号 @${freshOAuth.login}，请输入 PAT 解锁管理（或在 Worker 配置 ADMIN_GITHUB_PAT 实现免输直进）`,
          );
        } else {
          void tryAutoUnlockForMember(freshOAuth.login, DEFAULT_GITHUB_CONFIG.owner).then((ok) => {
            if (cancelled) return;
            if (ok) {
              showToast(`欢迎回来 @${freshOAuth.login}，已自动解锁私密库（只读）`);
            } else {
              openAdminModal();
              showToast(`已登录 @${freshOAuth.login}，请输入站长给你的明文密钥`);
            }
          });
        }
        return () => {
          cancelled = true;
        };
      }
    }

    if (!ghConfig) {
      const savedMember = loadOAuthMemberSession();
      if (savedMember) {
        setAuthRole('member');
        setAuthUser(savedMember.login);
        setPrivateSites([]);
        void tryAutoUnlockForMember(savedMember.login, DEFAULT_GITHUB_CONFIG.owner);
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

    void verifyGitHubToken(ghConfig).then(async (res) => {
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
        const [latest, latestCats, privList, remoteAdminSettings] = await Promise.all([
          fetchSitesFromGitHub(ghConfig).catch(() => null),
          fetchCategoriesFromGitHub(ghConfig).catch(() => null),
          loadAdminPrivateSites(ghConfig, ghConfig.vaultPassphrase),
          fetchPrivateAdminSettingsFromGitHub(ghConfig).catch(() => null),
        ]);
        if (!cancelled && latest && latest.sites.length > 0) {
          sitesBaseShaRef.current = latest.sha || undefined;
          setSites(hydrateSites(latest.sites));
        }
        if (!cancelled && latestCats && latestCats.length > 0) {
          setCategories(ensurePrivateVaultCategory(latestCats));
        }
        if (!cancelled) {
          setPrivateSites(privList);
        }
        if (!cancelled && remoteAdminSettings) {
          const mergedPass =
            remoteAdminSettings.vaultPassphrase?.trim() || ghConfig.vaultPassphrase?.trim() || '';
          const mergedUsers =
            remoteAdminSettings.vaultAllowedUsers?.trim() ||
            ghConfig.vaultAllowedUsers?.trim() ||
            '';
          if (
            mergedPass !== (ghConfig.vaultPassphrase || '') ||
            mergedUsers !== (ghConfig.vaultAllowedUsers || '')
          ) {
            const hydratedCfg: GitHubConfig = {
              ...ghConfig,
              vaultPassphrase: mergedPass,
              vaultAllowedUsers: mergedUsers,
            };
            saveGitHubConfig(hydratedCfg);
            setGhConfig(hydratedCfg);
          }
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
  }, [ghConfig, openAdminModal, setCategories, setSites, showToast]);

  const handleSyncToGitHub = useCallback(async () => {
    if (!ghConfig || !canManage || syncing) return;
    setSyncing(true);
    try {
      const results: string[] = [];

      if (hasUnsynced || (!hasUnsyncedPrivate && !hasUnsyncedCategories)) {
        const safePublicSites = sites.filter(isPublicSite);
        const pubRes = await saveSitesToGitHub(ghConfig, safePublicSites, undefined, {
          expectedSha: sitesBaseShaRef.current,
        });
        if (pubRes.contentSha) {
          sitesBaseShaRef.current = pubRes.contentSha;
        }
        setHasUnsynced(false);
        results.push(`公开站 (${pubRes.commitSha})`);
      }

      if (hasUnsyncedCategories) {
        const catRes = await saveCategoriesToGitHub(ghConfig, categories);
        setHasUnsyncedCategories(false);
        results.push(`分类目录 (${catRes.commitSha})`);
      }

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

  const handleAdminAuthenticated = useCallback(
    async (config: GitHubConfig, username?: string) => {
      let effectivePass = config.vaultPassphrase?.trim() || '';
      let effectiveUsers = config.vaultAllowedUsers?.trim() || '';

      setAuthRole('admin');
      setAuthUser(username);

      const [latest, privList, remoteAdminSettings] = await Promise.all([
        fetchSitesFromGitHub(config).catch(() => null),
        loadAdminPrivateSites(config, effectivePass),
        fetchPrivateAdminSettingsFromGitHub(config).catch(() => null),
      ]);

      if (!effectivePass && remoteAdminSettings?.vaultPassphrase?.trim()) {
        effectivePass = remoteAdminSettings.vaultPassphrase.trim();
      }
      if (!effectiveUsers && remoteAdminSettings?.vaultAllowedUsers?.trim()) {
        effectiveUsers = remoteAdminSettings.vaultAllowedUsers.trim();
      }

      let restoredWhitelistCount = 0;
      if (effectivePass && !effectiveUsers) {
        const existingEnc = await fetchEncryptedVaultFromGitHub(config).catch(() => null);
        if (existingEnc) {
          const decryptedOld = await decryptVaultSites(existingEnc, effectivePass).catch(
            () => null,
          );
          if (decryptedOld && decryptedOld.allowedUsers.length > 0) {
            effectiveUsers = decryptedOld.allowedUsers.join(', ');
            restoredWhitelistCount = decryptedOld.allowedUsers.length;
          }
        }
      }

      const finalConfig: GitHubConfig = {
        ...config,
        vaultPassphrase: effectivePass,
        vaultAllowedUsers: effectiveUsers,
      };
      saveGitHubConfig(finalConfig);
      setGhConfig(finalConfig);

      if (latest && latest.sites.length > 0) {
        sitesBaseShaRef.current = latest.sha || undefined;
        setSites(hydrateSites(latest.sites));
      }
      const finalPrivateList = privList.length > 0 ? privList : privateSites;
      if (privList.length > 0) {
        setPrivateSites(privList);
      }

      if (getPrivateRepoConfig(finalConfig) && (effectivePass || effectiveUsers)) {
        savePrivateAdminSettingsToGitHub(finalConfig, {
          vaultPassphrase: effectivePass,
          vaultAllowedUsers: effectiveUsers,
        }).catch(() => {});
      }

      if (effectivePass && finalPrivateList.length > 0) {
        try {
          const encrypted = await encryptVaultSites(
            finalPrivateList,
            effectivePass,
            effectiveUsers,
          );
          const encRes = await saveEncryptedVaultToGitHub(finalConfig, encrypted);
          setHasUnsyncedPrivate(false);
          showToast(
            `站长配置已保存并同步 vault.enc (${encRes.commitSha})${
              restoredWhitelistCount > 0
                ? ` · 已自动恢复原有 ${restoredWhitelistCount} 位好友白名单`
                : ''
            }`,
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

      showToast(
        `站长模式已解锁${username ? `（@${username}）` : ''}${
          privList.length > 0 ? ` · 已加载 ${privList.length} 个私密站点` : ''
        }`,
      );
    },
    [privateSites, setSites, showToast],
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
    sitesBaseShaRef.current = undefined;
    setGhConfig(null);
    setAuthRole('none');
    setAuthUser(undefined);
    setPrivateSites([]);
    setFriendVaultSites([]);
    setFriendUnlocked(false);
    setHasUnsynced(false);
    setHasUnsyncedPrivate(false);
    setHasUnsyncedCategories(false);
    showToast('已退出登录，私密内容已清空');
  }, [showToast]);

  return {
    ghConfig,
    authRole,
    authUser,
    canManage,
    canViewPrivate,
    privateSites,
    setPrivateSites,
    friendVaultSites,
    friendUnlocked,
    hasUnsynced,
    setHasUnsynced,
    hasUnsyncedPrivate,
    setHasUnsyncedPrivate,
    hasUnsyncedCategories,
    setHasUnsyncedCategories,
    anyUnsynced,
    syncing,
    handleSyncToGitHub,
    handleAdminAuthenticated,
    handleMemberAuthenticated,
    handleFriendUnlocked,
    handleFriendLock,
    handleAdminLogout,
  };
}
