import React from 'react';
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Search,
  Smartphone,
  Star,
  Trash2,
} from 'lucide-react';
import type { CostTier, HealthResult, SiteItem } from '../types';
import { buildSearchUrl } from '../utils/cleanQuery';

interface SiteCardProps {
  site: SiteItem;
  health?: HealthResult;
  cleanedQuery?: string;
  onTogglePin: (id: string) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (id: string) => void;
  onCheckHealth: (site: SiteItem) => void;
}

const COST_BADGE_STYLE: Record<CostTier, string> = {
  free: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  checkin:
    'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  points:
    'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  paid: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const SiteCard: React.FC<SiteCardProps> = ({
  site,
  health,
  cleanedQuery,
  onTogglePin,
  onEdit,
  onDelete,
  onCheckHealth,
}) => {
  const host = getHostname(site.url);
  const badgeText = (site.shortName || site.name).slice(0, 2);
  const accent = site.accent || '#ec4899';

  const statusDot = (() => {
    if (!health || health.state === 'idle') {
      return { color: 'bg-slate-300 dark:bg-slate-600', label: '点击测速' };
    }
    if (health.state === 'checking') {
      return { color: 'bg-sky-400 animate-pulse', label: '检测中...' };
    }
    if (health.state === 'online') {
      return {
        color: 'bg-emerald-500',
        label: `${health.latency ?? '?'}ms${health.status ? ` · ${health.status}` : ''}`,
      };
    }
    if (health.state === 'warn') {
      return {
        color: 'bg-amber-400',
        label: health.note || `${health.latency ?? '?'}ms`,
      };
    }
    return { color: 'bg-rose-500', label: health.note || '不可达' };
  })();

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-pink-200/90 hover:shadow-md dark:border-slate-800/90 dark:bg-[#161c2e]/90 dark:hover:border-pink-500/40">
      {/* 顶部：图标 + 站名 + 收藏与编辑按钮 */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              }}
            >
              {badgeText}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-[15px] font-bold text-slate-800 transition-colors group-hover:text-pink-600 dark:text-slate-100 dark:group-hover:text-pink-400">
                  {site.name}
                </h3>
              </div>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{host}</p>
            </div>
          </a>

          {/* 右上操作按钮 */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onTogglePin(site.id)}
              title={site.pinned ? '取消收藏置顶' : '收藏并置顶'}
              className={`rounded-lg p-1.5 transition ${
                site.pinned
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                  : 'text-slate-300 opacity-70 hover:bg-slate-100 hover:text-amber-500 hover:opacity-100 dark:text-slate-600 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`h-4 w-4 ${site.pinned ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(site)}
              title="编辑站点"
              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(site.id)}
              title="删除站点"
              className="rounded-lg p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 简介 */}
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300/90">
          {site.description}
        </p>

        {/* 徽标行：收费等级 + 客户端 + 风险提醒 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${COST_BADGE_STYLE[site.costTier]}`}
          >
            {site.costLabel}
          </span>

          {site.clients &&
            site.clients.length > 0 &&
            site.clients[0] !== '网页端' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200/70 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Smartphone className="h-3 w-3" />
                {site.clients.slice(0, 2).join(' / ')}
              </span>
            )}

          {site.searchRisk === 'cost' && (
            <span
              title={site.searchNote}
              className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
            >
              <AlertTriangle className="h-3 w-3" />
              搜索扣币
            </span>
          )}

          {site.searchRisk === 'cooldown' && (
            <span
              title={site.searchNote}
              className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
            >
              <AlertTriangle className="h-3 w-3" />
              10s冷却
            </span>
          )}
        </div>
      </div>

      {/* 底部：连通性检测 + 快捷直搜/直达 */}
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => onCheckHealth(site)}
          title={
            health?.mode === 'local-proxy'
              ? `本地精准检测：${health.note || '正常'}`
              : health?.mode === 'browser-nocors'
                ? `本机浏览器连通性探测：${health.note || '正常'}`
                : '点击检测站点连通性与延迟'
          }
          className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <span className={`h-2 w-2 rounded-full ${statusDot.color}`} />
          <span>{statusDot.label}</span>
          {(!health || health.state === 'idle') && <Activity className="h-3 w-3 opacity-60" />}
        </button>

        <div className="flex items-center gap-1.5">
          {cleanedQuery && site.searchUrl && (
            <a
              href={buildSearchUrl(site.searchUrl, cleanedQuery)}
              target="_blank"
              rel="noopener noreferrer"
              title={site.searchNote || `在 ${site.name} 搜索「${cleanedQuery}」`}
              className="inline-flex items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 text-[11px] font-semibold text-pink-600 transition hover:bg-pink-100 dark:bg-pink-500/20 dark:text-pink-300 dark:hover:bg-pink-500/30"
            >
              <Search className="h-3 w-3" />
              直搜
            </a>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            访问
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
