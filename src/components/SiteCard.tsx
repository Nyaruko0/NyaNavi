import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Pencil,
  Search,
  Smartphone,
  Star,
  Trash2,
} from 'lucide-react';
import type { AppearanceSettings, CostTier, HealthResult, SiteItem } from '../types';
import { buildSearchUrl } from '../utils/cleanQuery';
import { SiteIcon } from './SiteIcon';

interface SiteCardProps {
  site: SiteItem;
  health?: HealthResult;
  cleanedQuery?: string;
  canManage: boolean;
  appearance: AppearanceSettings;
  onNavigate: (url: string, site: SiteItem, keyword?: string) => void;
  onTogglePin: (id: string) => void;
  onEdit: (site: SiteItem) => void;
  onDelete: (id: string) => void;
  onCheckHealth: (site: SiteItem) => void;
}

const COST_BADGE_STYLE: Record<CostTier, string> = {
  free: 'bg-emerald-500/8 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300',
  checkin: 'bg-sky-500/8 text-sky-700 dark:bg-sky-400/12 dark:text-sky-300',
  points: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300',
  paid: 'bg-rose-500/10 text-rose-600 dark:bg-rose-400/12 dark:text-rose-300',
};

const RADIUS_CLASS = {
  soft: 'rounded-2xl',
  medium: 'rounded-xl',
  sharp: 'rounded-lg',
};

const PADDING_CLASS = {
  comfortable: 'p-4.5',
  default: 'p-3.5',
  compact: 'p-3',
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
  canManage,
  appearance,
  onNavigate,
  onTogglePin,
  onEdit,
  onDelete,
  onCheckHealth,
}) => {
  const host = getHostname(site.url);
  const isCompact = appearance.density === 'compact';

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string,
    keyword?: string,
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(url, site, keyword);
  };

  const statusDot = (() => {
    if (!health || health.state === 'idle') {
      return { color: 'bg-slate-300/90 dark:bg-slate-600', label: '测速' };
    }
    if (health.state === 'checking') {
      return { color: 'bg-sky-400 animate-pulse', label: '检测中' };
    }
    if (health.state === 'online') {
      return {
        color: 'bg-emerald-500',
        label: `${health.latency ?? '?'}ms`,
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
    <article
      className={`group relative flex flex-col justify-between border border-slate-200/70 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--nya-accent-border)] hover:bg-white hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.09)] dark:border-slate-800/80 dark:bg-[#141929]/85 dark:hover:bg-[#171d30] ${RADIUS_CLASS[appearance.radius]} ${PADDING_CLASS[appearance.density]}`}
    >
      {/* 顶部：图标 + 站名 + 悬浮操作 */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleLinkClick(e, site.url)}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <SiteIcon
              url={site.url}
              name={site.name}
              shortName={site.shortName}
              accent={site.accent}
              customIcon={site.icon}
              fallbackIcon={site.fallbackIcon}
              size={isCompact ? 'sm' : 'md'}
            />
            <div className="min-w-0">
              <h3 className="truncate text-[14.5px] font-semibold tracking-tight text-slate-800 transition-colors group-hover:text-[var(--nya-accent)] dark:text-slate-100">
                {site.name}
              </h3>
              {appearance.showDomain && (
                <p className="mt-0.5 truncate text-[11.5px] text-slate-400 dark:text-slate-500">
                  {host}
                </p>
              )}
            </div>
          </a>

          {/* 右上轻量化操作按钮 */}
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onTogglePin(site.id)}
              title={site.pinned ? '取消收藏置顶' : '收藏并置顶'}
              className={`rounded-lg p-1.5 transition ${
                site.pinned
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                  : 'text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-600 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${site.pinned ? 'fill-amber-400' : ''}`} />
            </button>
            {canManage && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* 简介 */}
        {appearance.showDescription && !isCompact && (
          <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-[1.6] text-slate-500 dark:text-slate-400">
            {site.description}
          </p>
        )}

        {/* 精简徽标行 */}
        {appearance.showBadges && !isCompact && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${COST_BADGE_STYLE[site.costTier]}`}
            >
              {site.costLabel}
            </span>

            {site.clients && site.clients.length > 0 && site.clients[0] !== '网页端' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/8 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-300">
                <Smartphone className="h-3 w-3" />
                {site.clients.slice(0, 2).join(' / ')}
              </span>
            )}

            {site.searchRisk === 'cost' && (
              <span
                title={site.searchNote}
                className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300"
              >
                <AlertTriangle className="h-3 w-3" />
                扣币
              </span>
            )}

            {site.searchRisk === 'cooldown' && (
              <span
                title={site.searchNote}
                className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="h-3 w-3" />
                10s冷却
              </span>
            )}
          </div>
        )}
      </div>

      {/* 底部极简状态与入口 */}
      <div
        className={`flex items-center justify-between gap-2 border-t border-slate-100/90 dark:border-slate-800/70 ${
          isCompact ? 'mt-2.5 pt-2' : 'mt-3 pt-2.5'
        }`}
      >
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
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-slate-100/80 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot.color}`} />
          <span>{statusDot.label}</span>
        </button>

        <div className="flex items-center gap-1.5">
          {cleanedQuery && site.searchUrl && (
            <a
              href={buildSearchUrl(site.searchUrl, cleanedQuery)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) =>
                handleLinkClick(e, buildSearchUrl(site.searchUrl!, cleanedQuery), cleanedQuery)
              }
              title={site.searchNote || `在 ${site.name} 搜索「${cleanedQuery}」`}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--nya-accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--nya-accent)] transition hover:opacity-85"
            >
              <Search className="h-3 w-3" />
              直搜
            </a>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleLinkClick(e, site.url)}
            className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            访问
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
};
