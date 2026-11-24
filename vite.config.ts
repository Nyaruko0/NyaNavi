import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * 本地开发模式精准连通性检测中间件：
 * - 本地 `npm run dev` 时，前端调用 `/api/check?url=...` 可获得真实 HTTP 状态码与延迟（识别 CF 盾 / 403 / 5xx）。
 * - 静态构建部署到 GitHub Pages 后无此接口，前端会自动降级为浏览器端 `no-cors` 实时测速。
 */
function localHealthCheckPlugin(): Plugin {
  return {
    name: 'nyanavi-local-health-check',
    configureServer(server) {
      server.middlewares.use('/api/check', async (req, res) => {
        const reqUrl = new URL(req.url ?? '', 'http://localhost');
        const target = reqUrl.searchParams.get('url');

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!target || !/^https?:\/\//i.test(target)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, status: 0, error: 'Invalid URL' }));
          return;
        }

        const started = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(target, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
          });
          clearTimeout(timer);

          const latency = Date.now() - started;
          const serverHeader = (response.headers.get('server') || '').toLowerCase();
          const cfMitigated = response.headers.get('cf-mitigated') === 'challenge';
          const isCloudflareChallenge =
            cfMitigated || (serverHeader.includes('cloudflare') && (response.status === 403 || response.status === 503));

          let state: 'online' | 'warn' | 'offline' = 'offline';
          let note = `HTTP ${response.status}`;

          if (response.status >= 200 && response.status < 400) {
            state = 'online';
          } else if (isCloudflareChallenge) {
            state = 'warn';
            note = `CF 盾 (${response.status})`;
          } else if (response.status === 401 || response.status === 403) {
            state = 'warn';
            note = `需验证/登录 (${response.status})`;
          }

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: state !== 'offline',
              state,
              status: response.status,
              latency,
              note,
              mode: 'local-proxy',
            }),
          );
        } catch (err) {
          clearTimeout(timer);
          const latency = Date.now() - started;
          const isTimeout = err instanceof Error && err.name === 'AbortError';
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: false,
              state: 'offline',
              status: 0,
              latency,
              note: isTimeout ? '连接超时' : '无法连通',
              mode: 'local-proxy',
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), localHealthCheckPlugin()],
  server: {
    port: 5173,
    open: false,
  },
});
