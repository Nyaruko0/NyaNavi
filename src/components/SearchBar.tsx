import React, { useMemo } from 'react';
import { AlertTriangle, ExternalLink, Search, Sparkles, X } from 'lucide-react';
import type { AppMode, SiteItem } from '../types';
import { buildSearchUrl, cleanSearchQuery } from '../utils/cleanQuery';

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  searchableSites: SiteItem[];
  mode: AppMode;
  onNavigate: (url: string, site: SiteItem, keyword?: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  searchableSites,
  mode,
  onNavigate,
}) => {
  const cleanedInfo = useMemo(() => cleanSearchQuery(query), [query]);
  const [useRaw, setUseRaw] = React.useState(false);

  React.useEffect(() => {
    setUseRaw(false);
  }, [query]);

  const effectiveQuery = useRaw ? cleanedInfo.raw : cleanedInfo.cleaned;

  // 站外直搜快捷胶囊：优先展示免费、无扣币、高命中率站点，扣币/冷却站排后并标提醒
  const quickEngines = useMemo(() => {
    return [...searchableSites]
      .filter((s) => Boolean(s.searchUrl))
      .sort((a, b) => {
        const riskScore = (s: SiteItem) =>
          s.searchRisk === 'cost' ? 3 : s.searchRisk === 'cooldown' ? 2 : s.pinned ? 0 : 1;
        return riskScore(a) - riskScore(b);
      })
      .slice(0, 10);
  }, [searchableSites]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="group relative rounded-2xl border border-slate-200/80 bg-white/90 p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-md transition-all focus-within:border-[var(--nya-accent-border)] focus-within:bg-white focus-within:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/90 dark:bg-[#141929]/90 dark:focus-within:bg-[#161c2e]">
        <div className="flex items-center gap-2.5 px-3 py-1.5">
          <Search className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-[var(--nya-accent)]" />
          <input
            id="nyanavi-search-input"
            type="text"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              mode === 'work'
                ? '搜索开发文档、工具或直搜 GitHub / MDN...'
                : mode === 'moyu'
                  ? '摸鱼时间到～筛选表站，或直搜番剧 / 漫画 / 轻小说...'
                  : '筛选站点，或粘贴标题 / RJ号 一键直搜...'
            }
            className="w-full bg-transparent text-base text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 当输入了关键词时，自动展开清洗结果 + 一键跨站直搜快捷条 */}
        {query.trim() && (
          <div className="mt-1 border-t border-slate-100 px-3 pt-2.5 pb-2 dark:border-slate-800/80">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                  <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                  站外直搜关键词：
                </span>
                <code className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  {effectiveQuery}
                </code>

                {cleanedInfo.wasCleaned && (
                  <button
                    type="button"
                    onClick={() => setUseRaw((v) => !v)}
                    className="text-[11px] text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                  >
                    {useRaw ? '使用智能清洗词' : '已自动去标签/容量 · 改用原词'}
                  </button>
                )}

                {cleanedInfo.codeMatch && cleanedInfo.codeMatch !== effectiveQuery && (
                  <button
                    type="button"
                    onClick={() => onChange(cleanedInfo.codeMatch!)}
                    className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold text-pink-600 hover:bg-pink-100 dark:bg-pink-500/20 dark:text-pink-300"
                  >
                    仅搜编号 {cleanedInfo.codeMatch}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickEngines.map((site) => {
                const isRisk = site.searchRisk === 'cost' || site.searchRisk === 'cooldown';
                const targetHref = buildSearchUrl(site.searchUrl!, effectiveQuery);

                return (
                  <a
                    key={site.id}
                    href={targetHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                        return;
                      }
                      e.preventDefault();
                      onNavigate(targetHref, site, effectiveQuery);
                    }}
                    title={site.searchNote || `在 ${site.name} 中搜索「${effectiveQuery}」`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 ${
                      isRisk
                        ? 'border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'border-slate-200 bg-slate-50/90 text-slate-700 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-pink-500/50 dark:hover:text-pink-300'
                    }`}
                  >
                    {isRisk && <AlertTriangle className="h-3 w-3 shrink-0" />}
                    <span>{site.shortName || site.name}</span>
                    {site.searchRisk === 'cost' && (
                      <span className="text-[10px] opacity-80">扣币</span>
                    )}
                    {site.searchRisk === 'cooldown' && (
                      <span className="text-[10px] opacity-80">10s冷却</span>
                    )}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
