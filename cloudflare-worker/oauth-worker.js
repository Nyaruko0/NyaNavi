/**
 * NyaNavi GitHub OAuth 中转 Worker（零外部依赖，直接粘贴到 Cloudflare Workers 即可运行）
 *
 * 在 Cloudflare Worker 的 Settings -> Variables and Secrets 中配置以下 Secret：
 *   - GITHUB_CLIENT_ID     : GitHub OAuth App 的 Client ID（必填）
 *   - GITHUB_CLIENT_SECRET : GitHub OAuth App 的 Client Secret（必填）
 *   - ADMIN_GITHUB_PAT     : 站长个人 GitHub PAT（可选；配置后，仅当 OAuth 认证账号为站长本人时自动下发，实现站长一键免输 Token 直进站长模式；其他任何账号绝不下发）
 *   - ADMIN_GITHUB_LOGIN   : 站长 GitHub 用户名（可选，默认 Nyaruko0）
 *   - ADMIN_PRIVATE_REPO   : 站长私有扩展库名（可选，默认 NyaNavi-Private）
 *
 * GitHub OAuth App 的 Authorization callback URL 填：
 *   https://<你的Worker子域名>.workers.dev/callback
 */

const ALLOWED_REDIRECT_RULES = [
  { origin: 'https://nyaruko0.github.io', pathPrefix: '/NyaNavi' },
  { origin: 'http://127.0.0.1:5173', pathPrefix: '/' },
  { origin: 'http://localhost:5173', pathPrefix: '/' },
];

const STATE_COOKIE_NAME = 'nya_oauth_state';
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function isAllowedRedirect(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWED_REDIRECT_RULES.some((rule) => {
      if (u.origin !== rule.origin) return false;
      if (rule.pathPrefix === '/') return true;
      return u.pathname === rule.pathPrefix || u.pathname.startsWith(`${rule.pathPrefix}/`);
    });
  } catch {
    return false;
  }
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** 常量时间字符串比较，避免签名与 nonce 时序侧信道 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return '';
}

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isHttps = url.protocol === 'https:';

    // 健康检查
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({ ok: true, service: 'NyaNavi GitHub OAuth Worker' }),
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    // 1. 发起 GitHub OAuth 登录（仅申请 read:user 最小只读身份权限，并绑定一次性 HttpOnly Cookie 防 Login CSRF）
    if (url.pathname === '/login') {
      const redirect = url.searchParams.get('redirect') || 'https://nyaruko0.github.io/NyaNavi/';
      if (!isAllowedRedirect(redirect)) {
        return new Response('Forbidden redirect URL', { status: 403 });
      }
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return new Response('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET', { status: 500 });
      }

      const rawClientNonce = url.searchParams.get('client_nonce') || '';
      const clientNonce = NONCE_PATTERN.test(rawClientNonce) ? rawClientNonce : '';
      const cookieNonce = crypto.randomUUID();

      const statePayload = JSON.stringify({
        redirect,
        ts: Date.now(),
        cookieNonce,
        ...(clientNonce ? { clientNonce } : {}),
      });
      const stateData = toBase64Url(statePayload);
      const stateSig = await hmacSign(stateData, env.GITHUB_CLIENT_SECRET);
      const state = `${stateData}.${stateSig}`;

      const callbackUrl = `${url.origin}/callback`;
      const ghAuthUrl = new URL('https://github.com/login/oauth/authorize');
      ghAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      ghAuthUrl.searchParams.set('redirect_uri', callbackUrl);
      ghAuthUrl.searchParams.set('scope', 'read:user');
      ghAuthUrl.searchParams.set('state', state);

      const cookieAttrs = [
        `${STATE_COOKIE_NAME}=${encodeURIComponent(cookieNonce)}`,
        'HttpOnly',
        'SameSite=Lax',
        'Path=/callback',
        'Max-Age=600',
        ...(isHttps ? ['Secure'] : []),
      ].join('; ');

      return new Response(null, {
        status: 302,
        headers: {
          Location: ghAuthUrl.toString(),
          'Set-Cookie': cookieAttrs,
          'Cache-Control': 'no-store',
        },
      });
    }

    // 2. GitHub 回调：校验 HMAC 签名 + Cookie 绑定防 CSRF；仅对站长本人下发 ADMIN_GITHUB_PAT
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state || !state.includes('.')) {
        return new Response('Invalid OAuth callback parameters', { status: 400 });
      }

      const [stateData, stateSig] = state.split('.');
      const expectedSig = await hmacSign(stateData, env.GITHUB_CLIENT_SECRET);
      if (!timingSafeEqual(stateSig, expectedSig)) {
        return new Response('Invalid OAuth state signature', { status: 403 });
      }

      let parsedState;
      try {
        parsedState = JSON.parse(fromBase64Url(stateData));
      } catch {
        return new Response('Malformed OAuth state', { status: 400 });
      }

      const redirect = parsedState.redirect;
      if (!isAllowedRedirect(redirect) || Date.now() - parsedState.ts > 10 * 60 * 1000) {
        return new Response('OAuth state expired or forbidden', { status: 403 });
      }

      const cookieNonce = getCookie(request, STATE_COOKIE_NAME);
      if (!cookieNonce || !timingSafeEqual(cookieNonce, String(parsedState.cookieNonce || ''))) {
        return new Response('OAuth CSRF state mismatch', { status: 403 });
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });

      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return new Response('GitHub OAuth token exchange failed', { status: 401 });
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${tokenJson.access_token}`,
          'User-Agent': 'NyaNavi-OAuth-Worker',
        },
      });

      if (!userRes.ok) {
        return new Response('Failed to fetch GitHub user profile', { status: 502 });
      }

      const user = await userRes.json();
      const adminLogin = String(env.ADMIN_GITHUB_LOGIN || 'Nyaruko0').trim().toLowerCase();
      const isSiteAdmin =
        Boolean(user?.login) && String(user.login).trim().toLowerCase() === adminLogin;
      const adminPat = typeof env.ADMIN_GITHUB_PAT === 'string' ? env.ADMIN_GITHUB_PAT.trim() : '';

      const sessionObj = {
        login: user.login,
        avatarUrl: user.avatar_url || '',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 天有效
        ...(parsedState.clientNonce ? { clientNonce: parsedState.clientNonce } : {}),
      };

      // 仅当 GitHub 官方 OAuth 认证返回的正是站长本人且配置了 ADMIN_GITHUB_PAT 时，
      // 通过一次性 URL hash 下发站长读写 Token（其他任何好友/访客账号绝不下发）
      if (isSiteAdmin && adminPat) {
        sessionObj.adminToken = adminPat;
        sessionObj.privateRepo = String(env.ADMIN_PRIVATE_REPO || 'NyaNavi-Private').trim();
      }

      const sessionPayload = JSON.stringify(sessionObj);
      const encodedSession = toBase64Url(sessionPayload);

      const clearCookie = [
        `${STATE_COOKIE_NAME}=`,
        'HttpOnly',
        'SameSite=Lax',
        'Path=/callback',
        'Max-Age=0',
        ...(isHttps ? ['Secure'] : []),
      ].join('; ');

      const target = new URL(redirect);
      target.hash = `nya_oauth=${encodedSession}`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          'Set-Cookie': clearCookie,
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
