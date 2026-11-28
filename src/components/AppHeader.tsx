import React from 'react';
import {
  Activity,
  Briefcase,
  CloudUpload,
  Fish,
  Flame,
  Loader2,
  Lock,
  Menu,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { AppMode, SiteItem } from '../types';
import { SearchBar } from './SearchBar';

interface AppHeaderProps {
  mode: AppMode;
  dark: boolean;
  enableNsfwMode: boolean;
  canManage: boolean;
  syncing: boolean;
  anyUnsynced: boolean;
  batchChecking: boolean;
  healthSummary: { online: number; warn: number; offline: number; total: number };
  query: string;
  modeSites: SiteItem[];
  onOpenMobileMenu: () => void;
  onSyncToGitHub: () => void;
  onBatchCheck: () => void;
  onSelectMode: (next: AppMode) => void;
  onRequestNsfwUnlock: () => void;
  onOpenSettings: () => void;
  onToggleDark: () => void;
  onQueryChange: (val: string) => void;
  onNavigate: (url: string, site: SiteItem, keyword?: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  mode,
  dark,
  enableNsfwMode,
  canManage,
  syncing,
  anyUnsynced,
  batchChecking,
  healthSummary,
  query,
  modeSites,
  onOpenMobileMenu,
  onSyncToGitHub,
  onBatchCheck,
  onSelectMode,
  onRequestNsfwUnlock,
  onOpenSettings,
  onToggleDark,
  onQueryChange,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0c101b]/95">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="shrink-0 rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="truncate text-sm font-bold tracking-tight text-slate-800 lg:hidden dark:text-white">
            {mode === 'work' ? 'NyaDesk' : 'NyaNavi'}
          </span>

          {healthSummary.total > 0 && (
            <span className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-500 md:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400">
                ● {healthSummary.online}
              </span>
              <span className="text-amber-500">● {healthSummary.warn}</span>
              <span className="text-rose-500">● {healthSummary.offline}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {canManage && (
            <button
              type="button"
              disabled={syncing}
              onClick={onSyncToGitHub}
              className={`relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                anyUnsynced
                  ? 'bg-[var(--nya-accent)] text-white hover:opacity-90'
                  : 'border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
              }`}
              title="公开站点同步至公开仓库，私密站点仅同步至独立 Private 私有仓库"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {syncing ? '同步中' : anyUnsynced ? '同步到 GitHub' : '已同步'}
              </span>
              {anyUnsynced && !syncing && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
          )}

          <button
            type="button"
            disabled={batchChecking}
            onClick={onBatchCheck}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 sm:inline-flex dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600"
            title="批量检测当前可见站点的连通性与延迟"
          >
            {batchChecking ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
            ) : (
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>{batchChecking ? '检测中' : '测速'}</span>
          </button>

          {/* 工作 / 摸鱼 / NSFW 三段切换开关 */}
          <div
            className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/80"
            title="快捷键 Alt+W 一键秒切工作模式"
          >
            <button
              type="button"
              onClick={() => onSelectMode('work')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all sm:px-2.5 ${
                mode === 'work'
                  ? 'bg-white text-sky-600 shadow-2xs dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Briefcase className="hidden h-3.5 w-3.5 sm:inline" />
              工作
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('moyu')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all sm:px-2.5 ${
                mode === 'moyu'
                  ? 'bg-teal-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Fish className="hidden h-3.5 w-3.5 sm:inline" />
              摸鱼
            </button>
            <button
              type="button"
              onClick={() => {
                if (!enableNsfwMode) {
                  onRequestNsfwUnlock();
                  return;
                }
                onSelectMode('nsfw');
              }}
              title={
                enableNsfwMode
                  ? '切换至 NSFW 里站模式'
                  : 'NSFW 模式默认锁定，点击解锁或在外观设置中开启'
              }
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all sm:px-2.5 ${
                mode === 'nsfw'
                  ? 'bg-[var(--nya-accent)] text-white shadow-2xs'
                  : !enableNsfwMode
                    ? 'text-slate-400/80 hover:bg-white/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {enableNsfwMode ? (
                <Flame className="hidden h-3.5 w-3.5 sm:inline" />
              ) : (
                <Lock className="h-3 w-3 opacity-80" />
              )}
              NSFW
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-1.5 text-xs font-medium text-slate-600 transition hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] sm:px-2.5 sm:py-1.5 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200"
            title="自定义字号、主题色、列数、密度与背景壁纸"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden md:inline">外观</span>
          </button>

          <button
            type="button"
            onClick={onToggleDark}
            className="rounded-xl border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-amber-300"
            aria-label="切换明暗主题"
            title={dark ? '切换至明亮模式' : '切换至暗黑模式'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 全局吸顶搜索框 */}
      <div className="mx-auto max-w-[1440px] px-3 pb-2.5 sm:px-6">
        <SearchBar
          query={query}
          onChange={onQueryChange}
          searchableSites={modeSites}
          mode={mode}
          onNavigate={onNavigate}
        />
      </div>
    </header>
  );
};
