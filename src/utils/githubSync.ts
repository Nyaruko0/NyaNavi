import type { SiteItem } from '../types';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}

export interface GitHubVerifyResult {
  valid: boolean;
  canPush: boolean;
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
 * 验证 Token 是否对目标仓库拥有真实写权限（push）
 */
export async function verifyGitHubToken(config: GitHubConfig): Promise<GitHubVerifyResult> {
  try {
    const [repoRes, userRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
        headers: ghHeaders(config.token),
        cache: 'no-store',
      }),
      fetch('https://api.github.com/user', {
        headers: ghHeaders(config.token),
        cache: 'no-store',
      }),
    ]);

    if (repoRes.status === 401) {
      return { valid: false, canPush: false, error: 'Token 无效或已过期' };
    }
    if (repoRes.status === 404) {
      return { valid: false, canPush: false, error: '找不到目标仓库或 Token 无权访问' };
    }
    if (!repoRes.ok) {
      return { valid: false, canPush: false, error: `GitHub 验证失败 (HTTP ${repoRes.status})` };
    }

    const repoData = await repoRes.json();
    const canPush = Boolean(repoData?.permissions?.push || repoData?.permissions?.admin);
    let username: string | undefined;
    let avatarUrl: string | undefined;

    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData?.login;
      avatarUrl = userData?.avatar_url;
    }

    if (!canPush) {
      return {
        valid: true,
        canPush: false,
        username,
        avatarUrl,
        error: '该 Token 只有只读权限，请在 GitHub 开启仓库 Contents: Read and write 权限',
      };
    }

    return { valid: true, canPush: true, username, avatarUrl };
  } catch (err) {
    return {
      valid: false,
      canPush: false,
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
