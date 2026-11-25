import React from 'react';
import { Flame, Lock, SlidersHorizontal, X } from 'lucide-react';

interface NsfwUnlockModalProps {
  open: boolean;
  onUnlock: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const NsfwUnlockModal: React.FC<NsfwUnlockModalProps> = ({
  open,
  onUnlock,
  onOpenSettings,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-[#131829]/95">
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Lock className="h-3.5 w-3.5" />
              NSFW 模式已锁定
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭弹窗"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-white">
            确认开启 NSFW 里站模式？
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            为保护日常浏览隐私，NSFW 模式默认关闭。开启后将展示成人向 ACG / Galgame / 本子 / 里番等资源目录，随时可在右上角「外观设置」中重新关闭锁定。
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={onUnlock}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
            >
              <Flame className="h-4 w-4" />
              我已满 18 岁，一键解锁并进入
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                前往外观设置
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
              >
                保持锁定
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
