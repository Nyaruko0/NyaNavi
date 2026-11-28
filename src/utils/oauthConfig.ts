/// <reference types="vite/client" />

/** Cloudflare Worker OAuth 中转地址（可通过 VITE_OAUTH_WORKER_URL 覆盖） */
const OAUTH_WORKER_URL: string =
  (import.meta.env.VITE_OAUTH_WORKER_URL as string | undefined)?.trim() ||
  'https://nyanavi-auth.nyaruko0.workers.dev';

interface OAuthMemberSession {
  login: string;
  avatarUrl?: string;
  exp: number;
}

interface OAuthCallbackPayload extends OAuthMemberSession {
  /** 仅当 Cloudflare Worker 认证为站长本人且配置了 ADMIN_GITHUB_PAT 时一次性回传 */
  adminToken?: string;
  privateRepo?: string;
  /** 由前端发起登录时生成并经 Worker 原样回传的一次性防伪造 nonce */
  clientNonce?: string;
}

const STORAGE_OAUTH_MEMBER_KEY = 'nyanavi_oauth_member_v1';
const SESSION_OAUTH_NONCE_KEY = 'nyanavi_oauth_nonce_v1';

function generateClientNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isOAuthConfigured(): boolean {
  return Boolean(OAUTH_WORKER_URL.replace(/\/+$/, ''));
}

/**
 * 构造一次性 OAuth 登录地址并保存本标签页 clientNonce，防止第三方构造伪造 #nya_oauth 链接注入会话
 */
export function prepareOAuthLoginUrl(): string | null {
  const base = OAUTH_WORKER_URL.replace(/\/+$/, '');
  if (!base) return null;
  const redirect = `${window.location.origin}${window.location.pathname}`;
  const nonce = generateClientNonce();
  try {
    sessionStorage.setItem(SESSION_OAUTH_NONCE_KEY, nonce);
  } catch {
    // ignore storage errors
  }
  return `${base}/login?redirect=${encodeURIComponent(redirect)}&client_nonce=${encodeURIComponent(nonce)}`;
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
 * 读取并消费 URL hash 中的 OAuth 登录回传参数（核验一次性 clientNonce 后立即清除 hash）
 */
export function consumeOAuthHashCallback(): OAuthCallbackPayload | null {
  const hash = window.location.hash || '';
  const match = hash.match(/nya_oauth=([A-Za-z0-9\-_]+)/);
  if (!match) return null;

  let expectedNonce: string | null = null;
  try {
    expectedNonce = sessionStorage.getItem(SESSION_OAUTH_NONCE_KEY);
    sessionStorage.removeItem(SESSION_OAUTH_NONCE_KEY);
  } catch {
    expectedNonce = null;
  }

  // 立即清理地址栏 hash，避免令牌残留历史记录
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  try {
    const parsed = JSON.parse(decodeBase64UrlUtf8(match[1])) as OAuthCallbackPayload;
    // 防会话注入：若本标签页发起了登录，必须严格核验 clientNonce 一致（若无期望 nonce 则拒绝外来链接）
    if (!expectedNonce) {
      return null;
    }
    if (parsed.clientNonce && parsed.clientNonce !== expectedNonce) {
      return null;
    }

    if (parsed && typeof parsed.login === 'string' && parsed.login.trim()) {
      const session: OAuthMemberSession = {
        login: parsed.login.trim(),
        avatarUrl: parsed.avatarUrl || '',
        exp: typeof parsed.exp === 'number' ? parsed.exp : Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      // 普通 OAuth 会话仅保存公开身份，不写入 adminToken
      saveOAuthMemberSession(session);
      return {
        ...session,
        adminToken: typeof parsed.adminToken === 'string' ? parsed.adminToken.trim() : undefined,
        privateRepo: typeof parsed.privateRepo === 'string' ? parsed.privateRepo.trim() : undefined,
      };
    }
  } catch {
    return null;
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

function saveOAuthMemberSession(session: OAuthMemberSession): void {
  localStorage.setItem(STORAGE_OAUTH_MEMBER_KEY, JSON.stringify(session));
}

export function clearOAuthMemberSession(): void {
  localStorage.removeItem(STORAGE_OAUTH_MEMBER_KEY);
}
