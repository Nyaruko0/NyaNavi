import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Copy, Check, Dices, Sparkles, X } from 'lucide-react';
import type { SiteItem } from '../types';
import { pickPortalMessage, type PortalMessage } from '../data/portalMessages';
import { isHighRiskSearch } from '../utils/siteRules';
import { SiteIcon } from './SiteIcon';

export interface PortalTarget {
  url: string;
  site: SiteItem;
  keyword?: string;
}

interface PortalModalProps {
  target: PortalTarget | null;
  message: PortalMessage | null;
  onReroll: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  target,
  message,
  onReroll,
  onConfirm,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose, onConfirm]);

  if (!target || !message) return null;

  const { site, url, keyword } = target;
  const isRisk = isHighRiskSearch(site.searchRisk);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#131829]">
        <div className="p-5">
          {/* 头部：二次元地名标签 + 换一句 + 关闭 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nya-accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--nya-accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                目的地 · {message.place}
              </span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                {message.badge}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onReroll}
                title="换一条二次元传送台词"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[var(--nya-accent)] dark:hover:bg-slate-800"
              >
                <Dices className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭弹窗"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 随机趣味文案 */}
          <p className="mt-3.5 text-[1rem] leading-relaxed font-medium text-slate-700 dark:text-slate-200">
            {message.body}
          </p>

          {/* 目标站点预览卡片 */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200/75 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <SiteIcon
              url={site.url}
              name={site.name}
              shortName={site.shortName}
              accent={site.accent}
              customIcon={site.icon}
              fallbackIcon={site.fallbackIcon}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {site.name}
                </span>
                {keyword && (
                  <span className="shrink-0 rounded bg-[var(--nya-accent-soft)] px-1.5 py-0.5 text-xs font-medium text-[var(--nya-accent)]">
                    直搜：{keyword}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                {url}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              title="复制目标链接"
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 扣币 / 冷却风险贴心提醒 */}
          {isRisk && site.searchNote && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{site.searchNote}</span>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="hidden text-xs text-slate-400 sm:inline dark:text-slate-500">
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-slate-800">
                Enter
              </kbd>{' '}
              立即前往
            </span>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full whitespace-nowrap rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:w-auto sm:py-2 sm:text-xs dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {message.cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  background: 'linear-gradient(135deg, var(--nya-accent), var(--nya-accent-2))',
                }}
                className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98] sm:w-auto sm:py-2 sm:text-xs"
              >
                {message.confirmText}
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { pickPortalMessage };
