import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Fish, Flame, X } from 'lucide-react';
import type { AppMode, CategoryId, CategoryMeta, CostTier, SiteItem } from '../types';
import { getCategoriesForMode, inferSiteMode, isPrivateSite } from '../utils/siteRules';

interface SiteModalProps {
  open: boolean;
  editingSite: SiteItem | null;
  categories: CategoryMeta[];
  defaultMode: AppMode;
  onClose: () => void;
  onSave: (site: SiteItem) => void;
}

const ACCENT_PRESETS = [
  '#ec4899',
  '#38bdf8',
  '#8b5cf6',
  '#f97316',
  '#10b981',
  '#f43f5e',
  '#6366f1',
  '#1e293b',
];

const PREFERRED_CATEGORY_BY_MODE: Record<AppMode, CategoryId> = {
  work: 'dev_work',
  moyu: 'anime_stream',
  nsfw: 'acg_games',
};

export const SiteModal: React.FC<SiteModalProps> = ({
  open,
  editingSite,
  categories,
  defaultMode,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [url, setUrl] = useState('');
  const [siteMode, setSiteMode] = useState<AppMode>(defaultMode);
  const [category, setCategory] = useState<CategoryId>('acg_games');
  const [description, setDescription] = useState('');
  const [costTier, setCostTier] = useState<CostTier>('free');
  const [costLabel, setCostLabel] = useState('免费');
  const [searchUrl, setSearchUrl] = useState('');
  const [searchNote, setSearchNote] = useState('');
  const [clientsText, setClientsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [privateOnly, setPrivateOnly] = useState(false);
  const [accent, setAccent] = useState(ACCENT_PRESETS[0]);
  const [icon, setIcon] = useState('');

  const modeCategories = useMemo(
    () => getCategoriesForMode(categories, siteMode),
    [categories, siteMode],
  );

  const handleModeChange = (nextMode: AppMode) => {
    setSiteMode(nextMode);
    if (nextMode !== 'nsfw') {
      setPrivateOnly(false);
    }
    const allowed = getCategoriesForMode(categories, nextMode);
    if (!allowed.some((c) => c.id === category)) {
      const fallback = allowed.find((c) => c.id === PREFERRED_CATEGORY_BY_MODE[nextMode]) || allowed[0];
      if (fallback) setCategory(fallback.id);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (editingSite) {
      const inferred = inferSiteMode(editingSite, categories);
      setName(editingSite.name);
      setShortName(editingSite.shortName || '');
      setUrl(editingSite.url);
      setSiteMode(inferred);
      setCategory(editingSite.category);
      setDescription(editingSite.description);
      setCostTier(editingSite.costTier);
      setCostLabel(editingSite.costLabel);
      setSearchUrl(editingSite.searchUrl || '');
      setSearchNote(editingSite.searchNote || '');
      setClientsText((editingSite.clients || []).join(', '));
      setTagsText((editingSite.tags || []).join(', '));
      setPrivateOnly(isPrivateSite(editingSite));
      setAccent(editingSite.accent || ACCENT_PRESETS[0]);
      setIcon(editingSite.icon || '');
    } else {
      const allowed = getCategoriesForMode(categories, defaultMode);
      const initCat = allowed.find((c) => c.id === PREFERRED_CATEGORY_BY_MODE[defaultMode]) || allowed[0];
      setName('');
      setShortName('');
      setUrl('https://');
      setSiteMode(defaultMode);
      setCategory(initCat ? initCat.id : 'dev_work');
      setDescription('');
      setCostTier('free');
      setCostLabel('免费');
      setSearchUrl('');
      setSearchNote('');
      setClientsText('');
      setTagsText('');
      setPrivateOnly(false);
      setAccent(ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)]);
      setIcon('');
    }
  }, [open, editingSite, defaultMode, categories]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const normalizedUrl = /^https?:\/\//i.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`;

    const isPrivate = privateOnly || category === 'private_vault';
    const isNsfw = siteMode === 'nsfw' || isPrivate;

    const site: SiteItem = {
      id: editingSite?.id || `custom-${Date.now()}`,
      name: name.trim(),
      shortName: shortName.trim() || undefined,
      url: normalizedUrl,
      category,
      description: description.trim() || '自定义添加站点',
      costTier,
      costLabel: costLabel.trim() || '免费',
      searchUrl: searchUrl.trim() || undefined,
      searchNote: searchNote.trim() || undefined,
      searchRisk: editingSite?.searchRisk,
      clients: clientsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      tags: tagsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      nsfw: isNsfw,
      privateOnly: isPrivate ? true : undefined,
      pinned: editingSite?.pinned ?? false,
      accent,
      icon: icon.trim() || undefined,
    };

    onSave(site);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14192a]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {editingSite ? '编辑站点' : '添加自定义站点'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                站点名称 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：南+ (South Plus)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                简称 / 徽章
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="如：南+"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              站点网址 *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* 所属模式（工作 / 摸鱼 / NSFW）三段选择器 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              所属模式 *
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => handleModeChange('work')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  siteMode === 'work'
                    ? 'bg-white text-sky-600 shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                工作
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('moyu')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  siteMode === 'moyu'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Fish className="h-3.5 w-3.5" />
                摸鱼
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('nsfw')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  siteMode === 'nsfw'
                    ? 'bg-[var(--nya-accent)] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                NSFW
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                所属分类
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const nextCat = e.target.value as CategoryId;
                  setCategory(nextCat);
                  if (nextCat === 'private_vault') {
                    setPrivateOnly(true);
                    setSiteMode('nsfw');
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {modeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                收费 / 门槛
              </label>
              <div className="flex gap-2">
                <select
                  value={costTier}
                  onChange={(e) => {
                    const tier = e.target.value as CostTier;
                    setCostTier(tier);
                    const defaultLabels: Record<CostTier, string> = {
                      free: '免费',
                      checkin: '签到免费',
                      points: '积分/VIP',
                      paid: 'VIP/付费',
                    };
                    setCostLabel(defaultLabels[tier]);
                  }}
                  className="w-1/2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="free">免费</option>
                  <option value="checkin">签到</option>
                  <option value="points">积分</option>
                  <option value="paid">付费</option>
                </select>
                <input
                  type="text"
                  value={costLabel}
                  onChange={(e) => setCostLabel(e.target.value)}
                  placeholder="标签文案"
                  className="w-1/2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              站点简介
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="特色内容、资源类型、网盘说明等..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              自定义图标 URL（可选，留空自动抓取网站原生 Icon）
            </label>
            <input
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/favicon.png"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              站外直搜模板（可选，用 {'{q}'} 占位）
            </label>
            <input
              type="text"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              placeholder="例如：https://example.com/search?q={q}"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                客户端 / PWA（逗号分隔）
              </label>
              <input
                type="text"
                value={clientsText}
                onChange={(e) => setClientsText(e.target.value)}
                placeholder="原生 PWA, Mihon, Legado"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                标签（逗号分隔）
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="免登录, 3D二创, 汉化"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-pink-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
              <input
                type="checkbox"
                checked={privateOnly}
                onChange={(e) => {
                  setPrivateOnly(e.target.checked);
                  if (e.target.checked) {
                    setSiteMode('nsfw');
                  }
                }}
                className="h-4 w-4 rounded accent-violet-500"
              />
              仅存入站长私有扩展仓库（绝不发布到公开站点）
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">徽章色：</span>
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  className={`h-5 w-5 rounded-full transition ${
                    accent === c ? 'ring-2 ring-slate-800 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-pink-500 to-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
            >
              {editingSite ? '保存修改' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
