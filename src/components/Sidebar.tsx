import React from 'react';
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Compass,
  Download,
  DownloadCloud,
  FileText,
  Flame,
  FolderArchive,
  Gamepad2,
  Headphones,
  Image,
  KeyRound,
  Library,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { AppMode, CategoryId, CategoryMeta } from '../types';

interface SidebarProps {
  categories: CategoryMeta[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  counts: Record<string, number>;
  pinnedCount: number;
  totalCount: number;
  mode: AppMode;
  authRole: 'none' | 'member' | 'admin';
  canManage: boolean;
  canViewPrivate: boolean;
  friendUnlocked: boolean;
  authUser?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAdmin: () => void;
  onAddSite: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Lock,
  Flame,
  Gamepad2,
  FolderArchive,
  Users,
  BookOpen,
  Headphones,
  Library,
  Tv,
  DownloadCloud,
  BookMarked,
  FileText,
  Image,
  Sparkles,
  Wrench,
  Briefcase,
};

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeSection,
  onSelectSection,
  counts,
  pinnedCount,
  totalCount,
  mode,
  authRole,
  canManage,
  canViewPrivate,
  friendUnlocked,
  authUser,
  mobileOpen,
  onCloseMobile,
  onOpenAdmin,
  onAddSite,
  onExport,
  onImport,
  onReset,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const visibleCategories = categories.filter((c) => {
    if (mode === 'work' && !c.workAllowed) return false;
    if (mode === 'moyu' && c.nsfwOnly) return false;
    if (c.privateOnly && !canViewPrivate) return false;
    return true;
  });

  const handleNavClick = (id: string) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* 顶部固定：品牌头部 */}
      <div className="shrink-0">
        {/* 品牌头部 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition-all ${
                mode === 'work'
                  ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                  : 'bg-gradient-to-br from-pink-500 via-rose-400 to-sky-400'
              }`}
            >
              {mode === 'work' ? (
                <Briefcase className="h-5 w-5 text-white" />
              ) : (
                <img src="./favicon.svg" alt="NyaNavi" className="h-8 w-8 rounded-xl" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                  {mode === 'work' ? 'NyaDesk' : 'NyaNavi'}
                </h1>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    mode === 'work'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                      : mode === 'moyu'
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                        : 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300'
                  }`}
                >
                  {mode === 'work' ? 'WORK' : mode === 'moyu' ? '摸鱼' : 'ACG'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {mode === 'work'
                  ? '效率与文档工作台'
                  : mode === 'moyu'
                    ? '全年龄表站摸鱼导航'
                    : '二次元精选资源导航'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden dark:hover:bg-slate-800"
            aria-label="关闭侧边栏"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 快捷总览 */}
        <div className="px-3 py-1">
          <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            总览
          </div>
          <button
            type="button"
            onClick={() => handleNavClick('all')}
            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeSection === 'all'
                ? 'bg-[var(--nya-accent-soft)] text-[var(--nya-accent)]'
                : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Compass className="h-4 w-4" />
              全部站点
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('pinned')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeSection === 'pinned'
                ? 'bg-amber-50 text-amber-700 shadow-xs dark:bg-amber-500/15 dark:text-amber-300'
                : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Star className="h-4 w-4 text-amber-500" />
              站长推荐😋
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {pinnedCount}
            </span>
          </button>
        </div>
      </div>

      {/* 分类目录（独立可滚动） */}
      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            分类目录
          </div>
          <nav className="space-y-1">
            {visibleCategories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Sparkles;
              const isActive = activeSection === cat.id;
              const displayName = mode === 'work' && cat.workName ? cat.workName : cat.name;
              const count = counts[cat.id as CategoryId] ?? 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleNavClick(cat.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--nya-accent-soft)] text-[var(--nya-accent)]'
                      : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{displayName}</span>
                  </span>
                  <span className="ml-2 shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
      </div>

      {/* 底部管理操作区 */}
      <div className="shrink-0 border-t border-slate-200/70 p-3 dark:border-slate-800/80">
        {canManage ? (
          <>
            <button
              type="button"
              onClick={() => {
                onAddSite();
                onCloseMobile();
              }}
              className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${
                mode === 'work'
                  ? 'bg-sky-600 hover:bg-sky-500'
                  : 'bg-gradient-to-r from-pink-500 to-sky-500 hover:opacity-95'
              }`}
            >
              <Plus className="h-4 w-4" />
              添加站点
            </button>

            <div className="mb-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onExport}
                title="导出 JSON 配置"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                导出
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="导入 JSON 配置"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                导入
              </button>

              <button
                type="button"
                onClick={onReset}
                title="恢复默认站点"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:text-rose-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重置
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenAdmin();
                onCloseMobile();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              站长已登录{authUser ? ` (@${authUser})` : ''}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenAdmin();
                onCloseMobile();
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                authRole === 'member'
                  ? friendUnlocked
                    ? 'border-violet-300/80 bg-violet-50 text-violet-700 hover:bg-violet-100/70 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300'
                    : 'border-sky-300/80 bg-sky-50 text-sky-700 hover:bg-sky-100/70 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'border-slate-200/90 bg-white/90 text-slate-700 hover:border-pink-300 hover:text-pink-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-pink-500/40'
              }`}
            >
              {authRole === 'member' ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="truncate">
                    @{authUser} · {friendUnlocked ? '已解锁' : '输密钥'}
                  </span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  GitHub 登录
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onExport}
              title="导出当前公开站点 JSON"
              className="flex items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImport(file);
              e.target.value = '';
            }
          }}
        />

        <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          快捷键 <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">Alt+W</kbd> 秒切工作模式
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端固定侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white/85 backdrop-blur-xl lg:block dark:border-slate-800/80 dark:bg-[#131828]/90">
        {sidebarContent}
      </aside>

      {/* 移动端抽屉遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* 移动端抽屉 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 border-r border-slate-200/80 bg-white shadow-2xl transition-transform duration-200 lg:hidden dark:border-slate-800 dark:bg-[#131828] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
