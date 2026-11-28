import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { AppearanceSettings, HealthResult, SiteItem } from '../types';
import { SiteCard } from './SiteCard';

export interface SiteSectionGroup {
  id: string;
  title: string;
  description: string;
  items: SiteItem[];
}

interface SiteSectionsProps {
  sections: SiteSectionGroup[];
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  gridColsClass: string;
  healthMap: Record<string, HealthResult>;
  cleanedQuery: string;
  query: string;
  canManage: boolean;
  appearance: AppearanceSettings;
  onMoveSiteInSection: (sectionItems: SiteItem[], siteId: string, dir: -1 | 1) => void;
  onReorderSiteInSection: (sectionItems: SiteItem[], fromId: string, toId: string) => void;
  onNavigate: (url: string, site: SiteItem, keyword?: string) => void;
  onTogglePin: (id: string) => void;
  onEditSite: (site: SiteItem) => void;
  onDeleteSite: (id: string) => void;
  onCheckHealth: (site: SiteItem) => void;
  onAddSite: () => void;
}

export const SiteSections: React.FC<SiteSectionsProps> = ({
  sections,
  loading,
  loadError,
  onRetryLoad,
  gridColsClass,
  healthMap,
  cleanedQuery,
  query,
  canManage,
  appearance,
  onMoveSiteInSection,
  onReorderSiteInSection,
  onNavigate,
  onTogglePin,
  onEditSite,
  onDeleteSite,
  onCheckHealth,
  onAddSite,
}) => {
  const [draggingSite, setDraggingSite] = useState<{ id: string; sectionId: string } | null>(null);
  const [dragOverSiteId, setDragOverSiteId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800" />
        <div className={`grid gap-3 ${gridColsClass}`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800 dark:bg-[#141929]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-200/80 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/70" />
                </div>
              </div>
              <div className="mt-4 h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sections.length === 0 || sections.every((g) => g.items.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {loadError ? `站点加载失败：${loadError}` : '当前筛选下没有匹配的站点'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {loadError
            ? '请检查网络后点击下方按钮重新加载'
            : `可直接点击上方搜索框内的站点胶囊进行站外直搜${canManage ? '，或添加一个新站点' : ''}`}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {loadError && (
            <button
              type="button"
              onClick={onRetryLoad}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nya-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新加载
            </button>
          )}
          {canManage && !loadError && (
            <button
              type="button"
              onClick={onAddSite}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nya-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              添加站点
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="mb-3.5 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="flex items-baseline gap-2 text-base font-semibold tracking-tight text-slate-800 sm:text-lg dark:text-white">
                {section.title}
                <span className="text-xs font-normal text-slate-400">{section.items.length}</span>
              </h2>
              {section.description && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {section.description}
                </p>
              )}
            </div>
          </div>

          <div className={`grid gap-3 ${gridColsClass}`}>
            {section.items.map((site, idx) => {
              const isReorderable =
                canManage &&
                !query.trim() &&
                section.id !== 'pinned-top' &&
                section.id !== 'pinned' &&
                section.id !== 'search-results' &&
                section.items.length > 1;

              return (
                <SiteCard
                  key={site.id}
                  site={site}
                  health={healthMap[site.id]}
                  cleanedQuery={cleanedQuery}
                  canManage={canManage}
                  appearance={appearance}
                  canReorder={isReorderable}
                  isFirst={idx === 0}
                  isLast={idx === section.items.length - 1}
                  isDragging={
                    draggingSite?.id === site.id && draggingSite?.sectionId === section.id
                  }
                  isDragOver={
                    dragOverSiteId === site.id &&
                    draggingSite?.sectionId === section.id &&
                    draggingSite?.id !== site.id
                  }
                  onMove={(dir) => onMoveSiteInSection(section.items, site.id, dir)}
                  onDragStart={() => setDraggingSite({ id: site.id, sectionId: section.id })}
                  onDragOver={() => {
                    if (
                      draggingSite &&
                      draggingSite.sectionId === section.id &&
                      draggingSite.id !== site.id
                    ) {
                      setDragOverSiteId(site.id);
                    }
                  }}
                  onDrop={() => {
                    if (
                      draggingSite &&
                      draggingSite.sectionId === section.id &&
                      draggingSite.id !== site.id
                    ) {
                      onReorderSiteInSection(section.items, draggingSite.id, site.id);
                    }
                    setDraggingSite(null);
                    setDragOverSiteId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingSite(null);
                    setDragOverSiteId(null);
                  }}
                  onNavigate={onNavigate}
                  onTogglePin={onTogglePin}
                  onEdit={onEditSite}
                  onDelete={onDeleteSite}
                  onCheckHealth={onCheckHealth}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
