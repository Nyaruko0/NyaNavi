/// <reference types="vite/client" />

/**
 * Cloudflare Worker OAuth 中转地址：
 * 部署好 cloudflare-worker/oauth-worker.js 后，将你的 Worker 域名填入此处（例如：
 * 'https://nyanavi-auth.你的子域名.workers.dev'），或通过环境变量 VITE_OAUTH_WORKER_URL 注入。
 */
export const OAUTH_WORKER_URL: string =
  (import.meta.env.VITE_OAUTH_WORKER_URL as string | undefined)?.trim() ||
  'https://nyanavi-auth.nyaruko0.workers.dev';

export interface OAuthMemberSession {
  login: string;
  avatarUrl?: string;
  exp: number;
}

const STORAGE_OAUTH_MEMBER_KEY = 'nyanavi_oauth_member_v1';

export function getOAuthLoginUrl(): string | null {
  const base = OAUTH_WORKER_URL.replace(/\/+$/, '');
  if (!base) return null;
  const redirect = `${window.location.origin}${window.location.pathname}`;
  return `${base}/login?redirect=${encodeURIComponent(redirect)}`;
}

function decodeBase64UrlUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 读取并消费 URL hash 中的 OAuth 登录回传参数（读取后立即清除 hash 保持地址栏整洁）
 */
export function consumeOAuthHashCallback(): OAuthMemberSession | null {
  const hash = window.location.hash || '';
  const match = hash.match(/nya_oauth=([A-Za-z0-9\-_]+)/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(decodeBase64UrlUtf8(match[1])) as OAuthMemberSession;
    // 擦除 URL hash
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (parsed && typeof parsed.login === 'string' && parsed.login.trim()) {
      const session: OAuthMemberSession = {
        login: parsed.login.trim(),
        avatarUrl: parsed.avatarUrl || '',
        exp: typeof parsed.exp === 'number' ? parsed.exp : Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      saveOAuthMemberSession(session);
      return session;
    }
  } catch {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  return null;
}

export function loadOAuthMemberSession(): OAuthMemberSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_OAUTH_MEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthMemberSession;
    if (!parsed?.login || (parsed.exp && Date.now() > parsed.exp)) {
      localStorage.removeItem(STORAGE_OAUTH_MEMBER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveOAuthMemberSession(session: OAuthMemberSession): void {
  localStorage.setItem(STORAGE_OAUTH_MEMBER_KEY, JSON.stringify(session));
}

export function clearOAuthMemberSession(): void {
  localStorage.removeItem(STORAGE_OAUTH_MEMBER_KEY);
}
