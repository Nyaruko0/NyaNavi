import type { HealthResult } from '../types';

let localProxyAvailable: boolean | null = import.meta.env.DEV ? null : false;
let localProxyProbe: Promise<boolean> | null = null;

async function ensureLocalProxyAvailable(): Promise<boolean> {
  if (localProxyAvailable !== null) return localProxyAvailable;
  if (!localProxyProbe) {
    localProxyProbe = fetch('/api/check?url=https%3A%2F%2Fexample.com', { cache: 'no-store' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        const ok = res.ok && contentType.includes('application/json');
        localProxyAvailable = ok;
        return ok;
      })
      .catch(() => {
        localProxyAvailable = false;
        return false;
      });
  }
  return localProxyProbe;
}

async function checkViaLocalProxy(url: string): Promise<HealthResult | null> {
  const available = await ensureLocalProxyAvailable();
  if (!available) return null;

  try {
    const res = await fetch(`/api/check?url=${encodeURIComponent(url)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    return {
      state: data.state ?? (data.ok ? 'online' : 'offline'),
      latency: data.latency,
      status: data.status,
      note: data.note,
      mode: 'local-proxy',
      checkedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

async function checkViaBrowserNoCors(url: string): Promise<HealthResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    const latency = Math.round(performance.now() - started);
    return {
      state: latency > 4500 ? 'warn' : 'online',
      latency,
      note: latency > 4500 ? '网络可达但较慢（未校验状态码）' : '网络可达（未校验状态码）',
      mode: 'browser-nocors',
      checkedAt: Date.now(),
    };
  } catch (err) {
    window.clearTimeout(timer);
    const latency = Math.round(performance.now() - started);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return {
      state: 'offline',
      latency,
      note: isTimeout ? '连接超时' : '本机不可达',
      mode: 'browser-nocors',
      checkedAt: Date.now(),
    };
  }
}

/**
 * 双模站点存活检测：
 * - 本地 dev 环境走 Vite 中间件 `/api/check`（精确 HTTP 状态码 + CF 盾识别，且并发去重防重复探测）
 * - 生产静态部署环境直接走浏览器 `no-cors` 网络连通探测，不再产生 `/api/check` 404 请求
 */
export async function checkSiteHealth(url: string): Promise<HealthResult> {
  const proxyResult = await checkViaLocalProxy(url);
  if (proxyResult) return proxyResult;
  return checkViaBrowserNoCors(url);
}
