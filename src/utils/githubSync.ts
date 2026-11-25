import type { CategoryMeta, SiteItem } from '../types';
import {
  DEFAULT_PRIVATE_BRANCH,
  DEFAULT_PRIVATE_PATH,
  normalizePrivateSite,
} from './siteRules';
import type { EncryptedVaultPayload } from './vaultCrypto';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
  /** 独立私有扩展库仓库名（例如 NyaNavi-Private），仅站长读写，绝不混入公开仓 */
  privateRepo?: string;
  privateBranch?: string;
  privatePath?: string;
  /** 好友访问明文密钥，用于加密生成 public/vault.enc 供白名单好友只读解锁 */
  vaultPassphrase?: string;
  /** 允许解锁密文库的好友 GitHub 用户名白名单（逗号分隔；留空时拒绝非站长账号解锁） */
  vaultAllowedUsers?: string;
}

interface GitHubVerifyResult {
  valid: boolean;
  canPush: boolean;
  role: 'admin' | 'member' | 'none';
  username?: string;
  avatarUrl?: string;
  error?: string;
}

interface GitHubSaveResult {
  commitSha: string;
  commitUrl: string;
}

interface PrivateAdminSettings {
  vaultPassphrase?: string;
  vaultAllowedUsers?: string;
  updatedAt?: string;
}

export const DEFAULT_GITHUB_CONFIG: Omit<GitHubConfig, 'token'> = {
  owner: 'Nyaruko0',
  repo: 'NyaNavi',
  branch: 'main',
  path: 'public/sites.json',
};

const STORAGE_GH_KEY = 'nyanavi_gh_admin_v1';
const PRIVATE_ADMIN_SETTINGS_PATH = 'admin-settings.json';
const VAULT_ENC_PATH = 'public/vault.enc';
const CATEGORIES_PATH = 'public/categories.json';

export function loadGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_GH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
      return {
        owner: parsed.owner || DEFAULT_GITHUB_CONFIG.owner,
        repo: parsed.repo || DEFAULT_GITHUB_CONFIG.repo,
        branch: parsed.branch || DEFAULT_GITHUB_CONFIG.branch,
        path: parsed.path || DEFAULT_GITHUB_CONFIG.path,
        token: parsed.token.trim(),
        privateRepo: typeof parsed.privateRepo === 'string' ? parsed.privateRepo.trim() : '',
        privateBranch: parsed.privateBranch || DEFAULT_PRIVATE_BRANCH,
        privatePath: parsed.privatePath || DEFAULT_PRIVATE_PATH,
        vaultPassphrase:
          typeof parsed.vaultPassphrase === 'string' ? parsed.vaultPassphrase : '',
        vaultAllowedUsers:
          typeof parsed.vaultAllowedUsers === 'string' ? parsed.vaultAllowedUsers : '',
      };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(STORAGE_GH_KEY, JSON.stringify(config));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(STORAGE_GH_KEY);
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** 通用 GitHub Contents API JSON 读取 */
async function fetchGitHubJsonFile<T>(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
): Promise<{ data: T; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: ghHeaders(token),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  const body = await res.json();
  if (!body?.content) return null;
  return {
    data: JSON.parse(decodeBase64Utf8(body.content)) as T,
    sha: String(body.sha || ''),
  };
}

/** 通用 GitHub Contents API JSON 写入（自动获取最新 sha 防冲突） */
async function saveGitHubJsonFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
  payload: unknown,
  message: string,
  errorLabel: string,
): Promise<GitHubSaveResult> {
  let sha: string | undefined;
  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: ghHeaders(token),
      cache: 'no-store',
    },
  );
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing?.sha;
  }

  const content = encodeBase64Utf8(JSON.stringify(payload, null, 2) + '\n');
  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        ...ghHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content,
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody?.message || `${errorLabel} (HTTP ${putRes.status})`);
  }

  const result = await putRes.json();
  return {
    commitSha: result?.commit?.sha?.slice(0, 7) || 'updated',
    commitUrl: result?.commit?.html_url || `https://github.com/${owner}/${repo}`,
  };
}

/**
 * 统一 GitHub 身份认证：有主仓 push/admin 权限为站长，否则为只读好友。
 */
export async function verifyGitHubToken(config: GitHubConfig): Promise<GitHubVerifyResult> {
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: ghHeaders(config.token),
      cache: 'no-store',
    });

    if (userRes.status === 401) {
      return { valid: false, canPush: false, role: 'none', error: 'GitHub Token 无效或已过期' };
    }
    if (!userRes.ok) {
      return {
        valid: false,
        canPush: false,
        role: 'none',
        error: `GitHub 登录失败 (HTTP ${userRes.status})`,
      };
    }

    const userData = await userRes.json();
    const username: string | undefined = userData?.login;
    const avatarUrl: string | undefined = userData?.avatar_url;

    if (!username) {
      return { valid: false, canPush: false, role: 'none', error: '无法读取 GitHub 用户名' };
    }

    let canPush = false;
    try {
      const repoRes = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}`,
        {
          headers: ghHeaders(config.token),
          cache: 'no-store',
        },
      );
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        canPush = Boolean(repoData?.permissions?.push || repoData?.permissions?.admin);
      }
    } catch {
      canPush = false;
    }

    return {
      valid: true,
      canPush,
      role: canPush ? 'admin' : 'member',
      username,
      avatarUrl,
    };
  } catch (err) {
    return {
      valid: false,
      canPush: false,
      role: 'none',
      error: err instanceof Error ? err.message : '网络请求失败，请检查网络/代理',
    };
  }
}

export async function fetchSitesFromGitHub(
  config: GitHubConfig,
): Promise<{ sites: SiteItem[]; sha: string } | null> {
  const res = await fetchGitHubJsonFile<SiteItem[]>(
    config.owner,
    config.repo,
    config.branch,
    config.path,
    config.token,
  );
  if (!res || !Array.isArray(res.data)) return null;
  return { sites: res.data, sha: res.sha };
}

export async function saveSitesToGitHub(
  config: GitHubConfig,
  sites: SiteItem[],
  commitMessage?: string,
): Promise<GitHubSaveResult> {
  return saveGitHubJsonFile(
    config.owner,
    config.repo,
    config.branch,
    config.path,
    config.token,
    sites,
    commitMessage || `chore(sites): update sites.json (${sites.length} sites) via NyaNavi Admin`,
    '提交失败',
  );
}

/** 构造私有扩展仓库配置（硬性拦截与主仓同名的情况） */
export function getPrivateRepoConfig(config: GitHubConfig): GitHubConfig | null {
  const privRepo = config.privateRepo?.trim();
  if (!privRepo || privRepo.toLowerCase() === config.repo.toLowerCase()) {
    return null;
  }
  return {
    owner: config.owner,
    repo: privRepo,
    branch: config.privateBranch || DEFAULT_PRIVATE_BRANCH,
    path: config.privatePath || DEFAULT_PRIVATE_PATH,
    token: config.token,
  };
}

/** 校验目标私密仓库确为 GitHub Private 仓库且具备写权限 */
export async function verifyPrivateRepo(
  config: GitHubConfig,
): Promise<{ ok: boolean; isPrivate: boolean; error?: string }> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) {
    return { ok: false, isPrivate: false, error: '私密仓库名不能为空，且不能与公开仓库同名' };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${priv.owner}/${priv.repo}`, {
      headers: ghHeaders(priv.token),
      cache: 'no-store',
    });
    if (res.status === 404) {
      return {
        ok: false,
        isPrivate: false,
        error: `找不到私有仓库 ${priv.owner}/${priv.repo}，或当前 Token 未勾选该仓库权限`,
      };
    }
    if (!res.ok) {
      return { ok: false, isPrivate: false, error: `私有仓库校验失败 (HTTP ${res.status})` };
    }
    const data = await res.json();
    if (!data?.private) {
      return {
        ok: false,
        isPrivate: false,
        error: `安全拦截：${priv.owner}/${priv.repo} 是公开仓库！请务必将其设为 Private 私有仓库`,
      };
    }
    if (!data?.permissions?.push && !data?.permissions?.admin) {
      return {
        ok: false,
        isPrivate: true,
        error: `当前 Token 对私有仓库 ${priv.repo} 没有写权限（Contents: Read and write）`,
      };
    }
    return { ok: true, isPrivate: true };
  } catch (err) {
    return {
      ok: false,
      isPrivate: false,
      error: err instanceof Error ? err.message : '网络请求失败',
    };
  }
}

export async function fetchPrivateSitesFromGitHub(config: GitHubConfig): Promise<SiteItem[]> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) return [];
  const res = await fetchSitesFromGitHub(priv);
  return res ? res.sites.map(normalizePrivateSite) : [];
}

export async function savePrivateSitesToGitHub(
  config: GitHubConfig,
  privateSites: SiteItem[],
): Promise<GitHubSaveResult> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) throw new Error('未配置有效的独立私有仓库');
  const check = await verifyPrivateRepo(config);
  if (!check.ok) throw new Error(check.error || '私有仓库校验未通过');
  const normalized = privateSites.map(normalizePrivateSite);
  return saveSitesToGitHub(
    priv,
    normalized,
    `chore(private): update private-sites.json (${normalized.length} sites)`,
  );
}

export async function fetchPrivateAdminSettingsFromGitHub(
  config: GitHubConfig,
): Promise<PrivateAdminSettings | null> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) return null;
  try {
    const res = await fetchGitHubJsonFile<PrivateAdminSettings>(
      priv.owner,
      priv.repo,
      priv.branch,
      PRIVATE_ADMIN_SETTINGS_PATH,
      priv.token,
    );
    if (!res?.data) return null;
    return {
      vaultPassphrase:
        typeof res.data.vaultPassphrase === 'string' ? res.data.vaultPassphrase : '',
      vaultAllowedUsers:
        typeof res.data.vaultAllowedUsers === 'string' ? res.data.vaultAllowedUsers : '',
      updatedAt: res.data.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function savePrivateAdminSettingsToGitHub(
  config: GitHubConfig,
  settings: PrivateAdminSettings,
): Promise<GitHubSaveResult> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) throw new Error('未配置有效的独立私有仓库');
  const check = await verifyPrivateRepo(config);
  if (!check.ok) throw new Error(check.error || '私有仓库校验未通过');
  return saveGitHubJsonFile(
    priv.owner,
    priv.repo,
    priv.branch,
    PRIVATE_ADMIN_SETTINGS_PATH,
    priv.token,
    {
      vaultPassphrase: settings.vaultPassphrase || '',
      vaultAllowedUsers: settings.vaultAllowedUsers || '',
      updatedAt: new Date().toISOString(),
    },
    'chore(private): update admin-settings.json via NyaNavi Admin',
    '私有配置同步失败',
  );
}

export async function fetchEncryptedVaultFromGitHub(
  config: GitHubConfig,
): Promise<EncryptedVaultPayload | null> {
  const res = await fetchGitHubJsonFile<EncryptedVaultPayload>(
    config.owner,
    config.repo,
    config.branch,
    VAULT_ENC_PATH,
    config.token,
  );
  return res?.data ?? null;
}

export async function saveEncryptedVaultToGitHub(
  config: GitHubConfig,
  payload: EncryptedVaultPayload,
): Promise<GitHubSaveResult> {
  return saveGitHubJsonFile(
    config.owner,
    config.repo,
    config.branch,
    VAULT_ENC_PATH,
    config.token,
    payload,
    'chore(vault): update encrypted vault.enc',
    '密文同步失败',
  );
}

export async function fetchCategoriesFromGitHub(
  config: GitHubConfig,
): Promise<CategoryMeta[] | null> {
  const res = await fetchGitHubJsonFile<CategoryMeta[]>(
    config.owner,
    config.repo,
    config.branch,
    CATEGORIES_PATH,
    config.token,
  );
  return res && Array.isArray(res.data) ? res.data : null;
}

export async function saveCategoriesToGitHub(
  config: GitHubConfig,
  categories: CategoryMeta[],
): Promise<GitHubSaveResult> {
  return saveGitHubJsonFile(
    config.owner,
    config.repo,
    config.branch,
    CATEGORIES_PATH,
    config.token,
    categories,
    `chore(categories): update categories.json (${categories.length} categories) via NyaNavi Admin`,
    '分类同步失败',
  );
}
