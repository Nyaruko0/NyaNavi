import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Fish,
  Flame,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORY_ICON_OPTIONS } from '../config/categoryIcons';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { AppMode, CategoryId, CategoryMeta } from '../types';
import { inferCategoryMode } from '../utils/siteRules';

interface CategoryModalProps {
  open: boolean;
  categories: CategoryMeta[];
  siteCounts: Record<string, number>;
  defaultMode: AppMode;
  onClose: () => void;
  onSaveCategory: (cat: CategoryMeta, isEdit: boolean) => void;
  onDeleteCategory: (catId: CategoryId) => void;
  onReorderCategories: (nextCategories: CategoryMeta[]) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  categories,
  siteCounts,
  defaultMode,
  onClose,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategories,
}) => {
  const [editingId, setEditingId] = useState<CategoryId | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMode, setTargetMode] = useState<AppMode>(defaultMode);
  const [icon, setIcon] = useState('Folder');
  const [listFilter, setListFilter] = useState<AppMode | 'all'>(defaultMode);
  const [draggingId, setDraggingId] = useState<CategoryId | null>(null);

  useEscapeKey(open, onClose);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setName('');
    setDescription('');
    setTargetMode(defaultMode);
    setIcon(defaultMode === 'work' ? 'Wrench' : defaultMode === 'moyu' ? 'Sparkles' : 'Flame');
    setListFilter(defaultMode);
  }, [open, defaultMode]);

  if (!open) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setTargetMode(defaultMode);
    setIcon('Folder');
  };

  const startEdit = (cat: CategoryMeta) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setTargetMode(inferCategoryMode(cat));
    setIcon(cat.icon || 'Folder');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = editingId ? categories.find((c) => c.id === editingId) : undefined;
    const isPrivateVault = existing?.id === 'private_vault';

    const cat: CategoryMeta = {
      id: editingId || `cat-${Date.now()}`,
      name: trimmed,
      workName: targetMode === 'work' ? trimmed : undefined,
      description: description.trim() || `${trimmed}相关站点合集`,
      icon,
      workAllowed: !isPrivateVault && targetMode === 'work' ? true : undefined,
      hideInMoyu: !isPrivateVault && targetMode === 'work' ? true : undefined,
      nsfwOnly: !isPrivateVault && targetMode === 'nsfw' ? true : undefined,
      privateOnly: isPrivateVault ? true : undefined,
    };

    onSaveCategory(cat, Boolean(editingId));
    resetForm();
  };

  const filteredList = categories.filter((c) => {
    if (c.privateOnly) return false;
    if (listFilter === 'all') return true;
    return inferCategoryMode(c) === listFilter;
  });

  // 在当前筛选视图内精确移动相邻两项（交换它们在主 categories 数组中的位置）
  const moveInFiltered = (catId: CategoryId, direction: -1 | 1) => {
    const pos = filteredList.findIndex((c) => c.id === catId);
    const swapPos = pos + direction;
    if (pos < 0 || swapPos < 0 || swapPos >= filteredList.length) return;
    const otherId = filteredList[swapPos].id;
    const next = [...categories];
    const idxA = next.findIndex((c) => c.id === catId);
    const idxB = next.findIndex((c) => c.id === otherId);
    if (idxA < 0 || idxB < 0) return;
    [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
    onReorderCategories(next);
  };

  // 拖拽重排：把 draggingId 放到 targetId 的位置
  const handleDropOn = (targetId: CategoryId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const next = [...categories];
    const fromIdx = next.findIndex((c) => c.id === draggingId);
    const toIdx = next.findIndex((c) => c.id === targetId);
    if (fromIdx >= 0 && toIdx >= 0) {
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      onReorderCategories(next);
    }
    setDraggingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#14192a]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              管理分类目录（站长专属）
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              自由新增、重命名或删除目录，修改后点顶部“同步到 GitHub”即可全网生效
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* 新增 / 编辑表单 */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {editingId ? '编辑现有目录' : '新建分类目录'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  取消编辑，改为新建
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  目录名称 *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：音游 / 模组 / 摸鱼小游戏"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--nya-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  所属模式 *
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setTargetMode('work')}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      targetMode === 'work'
                        ? 'bg-white text-sky-600 shadow-2xs dark:bg-slate-700 dark:text-sky-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    工作
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('moyu')}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      targetMode === 'moyu'
                        ? 'bg-teal-500 text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Fish className="h-3.5 w-3.5" />
                    摸鱼
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('nsfw')}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      targetMode === 'nsfw'
                        ? 'bg-[var(--nya-accent)] text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    NSFW
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                目录简介（可选）
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话描述该分类收录的内容..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--nya-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                选择图标
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_ICON_OPTIONS.map(({ name: iconName, label, icon: Icon }) => {
                  const selected = icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      title={label}
                      onClick={() => setIcon(iconName)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        selected
                          ? 'border-[var(--nya-accent)] bg-[var(--nya-accent-soft)] text-[var(--nya-accent)]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, var(--nya-accent), var(--nya-accent-2))',
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                {editingId ? '保存目录修改' : '添加目录'}
              </button>
            </div>
          </form>

          {/* 现有目录列表 */}
          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                已有目录（{filteredList.length}）
              </span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
                {(
                  [
                    ['all', '全部'],
                    ['work', '工作'],
                    ['moyu', '摸鱼'],
                    ['nsfw', 'NSFW'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setListFilter(val)}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      listFilter === val
                        ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {filteredList.map((cat, idx) => {
                const catMode = inferCategoryMode(cat);
                const count = siteCounts[cat.id] ?? 0;
                const isFirst = idx === 0;
                const isLast = idx === filteredList.length - 1;
                return (
                  <div
                    key={cat.id}
                    draggable
                    onDragStart={() => setDraggingId(cat.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOn(cat.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 transition dark:bg-slate-900/60 ${
                      draggingId === cat.id
                        ? 'border-[var(--nya-accent)] opacity-60'
                        : 'border-slate-200/75 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        title="按住拖拽排序"
                        className="hidden cursor-grab text-slate-300 active:cursor-grabbing sm:inline-flex dark:text-slate-600"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {cat.name}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              catMode === 'work'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                                : catMode === 'moyu'
                                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300'
                                  : 'bg-pink-500/10 text-pink-600 dark:text-pink-300'
                            }`}
                          >
                            {catMode === 'work' ? '工作' : catMode === 'moyu' ? '摸鱼' : 'NSFW'}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">{count} 站</span>
                        </div>
                        {cat.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveInFiltered(cat.id, -1)}
                        title="上移一位"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveInFiltered(cat.id, 1)}
                        title="下移一位"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        title="编辑/重命名目录"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        title="删除目录"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
