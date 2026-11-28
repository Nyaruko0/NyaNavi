import React from 'react';
import type { SiteItem } from '../types';

interface SiteModalSearchFieldsProps {
  icon: string;
  searchUrl: string;
  searchRisk: SiteItem['searchRisk'] | '';
  searchNote: string;
  clientsText: string;
  tagsText: string;
  onChangeIcon: (v: string) => void;
  onChangeSearchUrl: (v: string) => void;
  onChangeSearchRisk: (v: SiteItem['searchRisk'] | '') => void;
  onChangeSearchNote: (v: string) => void;
  onChangeClientsText: (v: string) => void;
  onChangeTagsText: (v: string) => void;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export const SiteModalSearchFields: React.FC<SiteModalSearchFieldsProps> = ({
  icon,
  searchUrl,
  searchRisk,
  searchNote,
  clientsText,
  tagsText,
  onChangeIcon,
  onChangeSearchUrl,
  onChangeSearchRisk,
  onChangeSearchNote,
  onChangeClientsText,
  onChangeTagsText,
}) => {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          自定义图标 URL（可选，留空自动抓取网站原生 Icon）
        </label>
        <input
          type="url"
          value={icon}
          onChange={(e) => onChangeIcon(e.target.value)}
          placeholder="https://example.com/favicon.png"
          className={INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            站外直搜模板（可选，用 {'{q}'} 占位）
          </label>
          <input
            type="text"
            value={searchUrl}
            onChange={(e) => onChangeSearchUrl(e.target.value)}
            placeholder="例如：https://example.com/search?q={q}"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            搜索风险提示
          </label>
          <select
            value={searchRisk}
            onChange={(e) => onChangeSearchRisk((e.target.value || '') as SiteItem['searchRisk'] | '')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">无风险</option>
            <option value="cost">扣币/消耗</option>
            <option value="cooldown">冷却限流</option>
            <option value="login">需登录</option>
            <option value="spa">SPA 直跳</option>
          </select>
        </div>
      </div>

      {(searchUrl.trim() || searchRisk || searchNote.trim()) && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            搜索备注 / 警示说明（可选）
          </label>
          <input
            type="text"
            value={searchNote}
            onChange={(e) => onChangeSearchNote(e.target.value)}
            placeholder="例如：每次搜索扣 3 萌币 / 10 秒搜索冷却"
            className={INPUT_CLASS}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            客户端 / PWA（逗号分隔）
          </label>
          <input
            type="text"
            value={clientsText}
            onChange={(e) => onChangeClientsText(e.target.value)}
            placeholder="原生 PWA, Mihon, Legado"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            标签（逗号分隔）
          </label>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => onChangeTagsText(e.target.value)}
            placeholder="免登录, 3D二创, 汉化"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </>
  );
};
