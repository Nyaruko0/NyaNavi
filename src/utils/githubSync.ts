import type { SiteItem } from '../types';
import type { EncryptedVaultPayload } from './vaultCrypto';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
  /** 可选：独立私有扩展库仓库名（例如 NyaNavi-Private），仅站长登录后加载 */
  privateRepo?: string;
  privateBranch?: string;
  privatePath?: string;
  /** 可选：好友共享暗号，填写后同步时会额外加密生成 public/vault.enc 供朋友凭暗号只读解锁 */
  vaultPassphrase?: string;
  /** 可选：允许解锁密文库的好友 GitHub 用户名白名单（逗号分隔，留空则不限制 GitHub 身份） */
  vaultAllowedUsers?: string;
}

export interface GitHubVerifyResult {
  valid: boolean;
  canPush: boolean;
  role: 'admin' | 'member' | 'none';
  username?: string;
  avatarUrl?: string;
  error?: string;
}

export interface GitHubSaveResult {
  commitSha: string;
  commitUrl: string;
}

export const DEFAULT_GITHUB_CONFIG: Omit<GitHubConfig, 'token'> = {
  owner: 'Nyaruko0',
  repo: 'NyaNavi',
  branch: 'main',
  path: 'public/sites.json',
};

const STORAGE_GH_KEY = 'nyanavi_gh_admin_v1';

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
        privateBranch: parsed.privateBranch || 'main',
        privatePath: parsed.privatePath || 'private-sites.json',
        vaultPassphrase:
          typeof parsed.vaultPassphrase === 'string' ? parsed.vaultPassphrase : '',
        vaultAllowedUsers:
          typeof parsed.vaultAllowedUsers === 'string' ? parsed.vaultAllowedUsers : '',
      };
    }
  } catch {
    // ignore
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

/**
 * 验证好友的 GitHub Token 并返回其真实 GitHub 用户名（不需要任何仓库写权限）
 */
export async function fetchGitHubUsername(token: string): Promise<string> {
  const clean = token.trim();
  if (!clean) {
    throw new Error('请输入你的 GitHub Token 完成登录校验');
  }
  const res = await fetch('https://api.github.com/user', {
    headers: ghHeaders(clean),
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new Error('GitHub Token 无效或已过期');
  }
  if (!res.ok) {
    throw new Error(`GitHub 身份校验失败 (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data?.login) {
    throw new Error('未能读取到 GitHub 用户名');
  }
  return String(data.login);
}

/**
 * 统一 GitHub 身份认证：
 * 1. 先校验 Token 本身是否有效并获取真实 @username（普通零权限 Token 也能通过）；
 * 2. 再检查该 Token 对目标主仓库是否拥有写权限（push/admin）：
 *    - 有写权限 -> role: 'admin'（站长模式，可增删改与同步）
 *    - 无写权限 -> role: 'member'（普通用户/好友只读模式，仅可输入密钥校验解锁私密内容）
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
      return {
        valid: false,
        canPush: false,
        role: 'none',
        error: '无法读取 GitHub 用户名',
      };
    }

    // 检查是否对主仓库拥有写权限（普通好友的零权限 Token 访问这里会返回无 push 或 404，不影响登录）
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

/**
 * 从 GitHub 仓库直接拉取最新 public/sites.json（绕过 Pages 缓存）
 */
export async function fetchSitesFromGitHub(
  config: GitHubConfig,
): Promise<{ sites: SiteItem[]; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: ghHeaders(config.token),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.content) return null;
  const text = decodeBase64Utf8(data.content);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return null;
  return { sites: parsed as SiteItem[], sha: data.sha };
}

export function getPrivateRepoConfig(config: GitHubConfig): GitHubConfig | null {
  const privateRepo = config.privateRepo?.trim();
  if (!privateRepo) return null;
  // 防呆保护：禁止把私密库指向公开主仓库本身
  if (privateRepo.toLowerCase() === config.repo.trim().toLowerCase()) {
    return null;
  }
  return {
    owner: config.owner,
    repo: privateRepo,
    branch: config.privateBranch?.trim() || 'main',
    path: config.privatePath?.trim() || 'private-sites.json',
    token: config.token,
  };
}

/**
 * 校验私有扩展仓库是否真实存在、具备写权限且确实为 Private 私有仓库
 */
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
    const canPush = Boolean(data?.permissions?.push || data?.permissions?.admin);
    if (!canPush) {
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

/**
 * 从独立私有仓库拉取 private-sites.json（自动打上 privateOnly: true 标记）
 */
export async function fetchPrivateSitesFromGitHub(
  config: GitHubConfig,
): Promise<SiteItem[]> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) return [];
  const res = await fetchSitesFromGitHub(priv);
  if (!res) return [];
  return res.sites.map((s) => ({
    ...s,
    nsfw: true,
    privateOnly: true,
  }));
}

/**
 * 将私密站点写入独立私有仓库 private-sites.json
 */
export async function savePrivateSitesToGitHub(
  config: GitHubConfig,
  privateSites: SiteItem[],
): Promise<GitHubSaveResult> {
  const priv = getPrivateRepoConfig(config);
  if (!priv) {
    throw new Error('未配置有效的独立私有仓库');
  }
  const check = await verifyPrivateRepo(config);
  if (!check.ok) {
    throw new Error(check.error || '私有仓库校验未通过');
  }
  const normalized = privateSites.map((s) => ({
    ...s,
    nsfw: true,
    privateOnly: true,
  }));
  return saveSitesToGitHub(
    priv,
    normalized,
    `chore(private): update private-sites.json (${normalized.length} sites)`,
  );
}

const VAULT_ENC_PATH = 'public/vault.enc';

/**
 * 从主仓库直接拉取加密密文 public/vault.enc（绕过 Pages CDN 缓存）
 */
export async function fetchEncryptedVaultFromGitHub(
  config: GitHubConfig,
): Promise<EncryptedVaultPayload | null> {
  const res = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${VAULT_ENC_PATH}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: ghHeaders(config.token),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.content) return null;
  const parsed = JSON.parse(decodeBase64Utf8(data.content));
  return parsed as EncryptedVaultPayload;
}

/**
 * 将 AES-256-GCM 加密后的密文写入主仓库 public/vault.enc（文件内不含任何明文网址）
 */
export async function saveEncryptedVaultToGitHub(
  config: GitHubConfig,
  payload: EncryptedVaultPayload,
): Promise<GitHubSaveResult> {
  let sha: string | undefined;
  const getRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${VAULT_ENC_PATH}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: ghHeaders(config.token),
      cache: 'no-store',
    },
  );
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing?.sha;
  }

  const content = encodeBase64Utf8(JSON.stringify(payload, null, 2) + '\n');
  const putRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${VAULT_ENC_PATH}`,
    {
      method: 'PUT',
      headers: {
        ...ghHeaders(config.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'chore(vault): update encrypted vault.enc',
        content,
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody?.message || `密文同步失败 (HTTP ${putRes.status})`);
  }

  const result = await putRes.json();
  return {
    commitSha: result?.commit?.sha?.slice(0, 7) || 'updated',
    commitUrl: result?.commit?.html_url || `https://github.com/${config.owner}/${config.repo}`,
  };
}

/**
 * 将最新站点列表提交至 GitHub 仓库 public/sites.json，自动触发 Pages 重新部署
 */
export async function saveSitesToGitHub(
  config: GitHubConfig,
  sites: SiteItem[],
  commitMessage?: string,
): Promise<GitHubSaveResult> {
  // 先拿最新 sha（若文件尚未存在则不传 sha）
  let sha: string | undefined;
  const getRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: ghHeaders(config.token),
      cache: 'no-store',
    },
  );
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing?.sha;
  }

  const content = encodeBase64Utf8(JSON.stringify(sites, null, 2) + '\n');
  const message =
    commitMessage || `chore(sites): update sites.json (${sites.length} sites) via NyaNavi Admin`;

  const putRes = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
    {
      method: 'PUT',
      headers: {
        ...ghHeaders(config.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content,
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody?.message || `提交失败 (HTTP ${putRes.status})`);
  }

  const result = await putRes.json();
  return {
    commitSha: result?.commit?.sha?.slice(0, 7) || 'updated',
    commitUrl: result?.commit?.html_url || `https://github.com/${config.owner}/${config.repo}`,
  };
}
