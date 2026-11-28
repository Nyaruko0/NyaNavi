import React from 'react';
import type { AppMode, CategoryMeta } from '../types';
import { getCategoryDisplayName, isCategoryVisibleInMode } from '../utils/siteRules';

interface MobileCategoryBarProps {
  categories: CategoryMeta[];
  activeSection: string;
  mode: AppMode;
  canViewPrivate: boolean;
  totalCount: number;
  pinnedCount: number;
  categoryCounts: Record<string, number>;
  onSelectSection: (sectionId: string) => void;
}

export const MobileCategoryBar: React.FC<MobileCategoryBarProps> = ({
  categories,
  activeSection,
  mode,
  canViewPrivate,
  totalCount,
  pinnedCount,
  categoryCounts,
  onSelectSection,
}) => {
  return (
    <div className="no-scrollbar -mx-3.5 mb-5 flex items-center gap-2 overflow-x-auto px-3.5 pb-1 lg:hidden">
      <button
        type="button"
        onClick={() => onSelectSection('all')}
        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          activeSection === 'all'
            ? 'border-transparent bg-[var(--nya-accent)] text-white shadow-xs'
            : 'border-slate-200/80 bg-white/85 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
        }`}
      >
        全部 ({totalCount})
      </button>
      <button
        type="button"
        onClick={() => onSelectSection('pinned')}
        className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          activeSection === 'pinned'
            ? 'border-transparent bg-amber-500 text-white shadow-xs'
            : 'border-slate-200/80 bg-white/85 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
        }`}
      >
        站长爱看😋 ({pinnedCount})
      </button>
      {categories
        .filter((c) => isCategoryVisibleInMode(c, mode, canViewPrivate))
        .map((cat) => {
          const count = categoryCounts[cat.id] ?? 0;
          if (count === 0) return null;
          const active = activeSection === cat.id;
          const label = getCategoryDisplayName(cat, mode);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectSection(cat.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-transparent bg-[var(--nya-accent)] text-white'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
    </div>
  );
};
