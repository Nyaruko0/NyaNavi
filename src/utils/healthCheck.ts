import type { HealthResult } from '../types';

let localProxyAvailable: boolean | null = null;

async function checkViaLocalProxy(url: string): Promise<HealthResult | null> {
  if (localProxyAvailable === false) return null;
  try {
    const res = await fetch(`/api/check?url=${encodeURIComponent(url)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      localProxyAvailable = false;
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      localProxyAvailable = false;
      return null;
    }
    const data = await res.json();
    localProxyAvailable = true;
    return {
      state: data.state ?? (data.ok ? 'online' : 'offline'),
      latency: data.latency,
      status: data.status,
      note: data.note,
      mode: 'local-proxy',
      checkedAt: Date.now(),
    };
  } catch {
    localProxyAvailable = false;
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
      note: latency > 4500 ? '可连通但较慢' : '本机可达',
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
 * - 本地 dev 环境走 Vite 中间件 `/api/check`（精确 HTTP 状态码 + CF 盾识别）
 * - GitHub Pages 静态部署环境自动降级为浏览器 `no-cors` 本机网络探测
 */
export async function checkSiteHealth(url: string): Promise<HealthResult> {
  const proxyResult = await checkViaLocalProxy(url);
  if (proxyResult) return proxyResult;
  return checkViaBrowserNoCors(url);
}
