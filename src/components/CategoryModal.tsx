import React, { useEffect, useState } from 'react';
import {
  AppWindow,
  BookMarked,
  BookOpen,
  Bot,
  Briefcase,
  Clapperboard,
  DownloadCloud,
  FileText,
  Film,
  Fish,
  Flame,
  Folder,
  FolderArchive,
  Gamepad2,
  Globe,
  Headphones,
  Image,
  ImageUp,
  Languages,
  Library,
  Mail,
  Pencil,
  Plus,
  Puzzle,
  ScanSearch,
  Send,
  Share2,
  Sparkles,
  Terminal,
  Trash2,
  Tv,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { AppMode, CategoryId, CategoryMeta } from '../types';

interface CategoryModalProps {
  open: boolean;
  categories: CategoryMeta[];
  siteCounts: Record<string, number>;
  defaultMode: AppMode;
  onClose: () => void;
  onSaveCategory: (cat: CategoryMeta, isEdit: boolean) => void;
  onDeleteCategory: (catId: CategoryId) => void;
}

const ICON_OPTIONS: Array<{ name: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { name: 'Folder', label: '文件夹', Icon: Folder },
  { name: 'Sparkles', label: '星光', Icon: Sparkles },
  { name: 'Gamepad2', label: '游戏', Icon: Gamepad2 },
  { name: 'Tv', label: '动漫', Icon: Tv },
  { name: 'BookOpen', label: '阅读', Icon: BookOpen },
  { name: 'Image', label: '图片', Icon: Image },
  { name: 'Film', label: '视频', Icon: Film },
  { name: 'Headphones', label: '音频', Icon: Headphones },
  { name: 'Clapperboard', label: '影音', Icon: Clapperboard },
  { name: 'Users', label: '社区', Icon: Users },
  { name: 'Send', label: '频道', Icon: Send },
  { name: 'Terminal', label: '开发', Icon: Terminal },
  { name: 'Bot', label: 'AI', Icon: Bot },
  { name: 'ScanSearch', label: '搜图', Icon: ScanSearch },
  { name: 'Wrench', label: '工具', Icon: Wrench },
  { name: 'Languages', label: '翻译', Icon: Languages },
  { name: 'ImageUp', label: '图床', Icon: ImageUp },
  { name: 'Mail', label: '邮箱', Icon: Mail },
  { name: 'Share2', label: '传输', Icon: Share2 },
  { name: 'Globe', label: '网络', Icon: Globe },
  { name: 'Puzzle', label: '扩展', Icon: Puzzle },
  { name: 'AppWindow', label: '软件', Icon: AppWindow },
  { name: 'FolderArchive', label: '资源', Icon: FolderArchive },
  { name: 'Library', label: '书库', Icon: Library },
  { name: 'DownloadCloud', label: '下载', Icon: DownloadCloud },
  { name: 'BookMarked', label: '漫画', Icon: BookMarked },
  { name: 'FileText', label: '小说', Icon: FileText },
];

function inferCategoryMode(cat: CategoryMeta): AppMode {
  if (cat.workAllowed) return 'work';
  if (cat.nsfwOnly || cat.privateOnly) return 'nsfw';
  return 'moyu';
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  categories,
  siteCounts,
  defaultMode,
  onClose,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [editingId, setEditingId] = useState<CategoryId | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMode, setTargetMode] = useState<AppMode>(defaultMode);
  const [icon, setIcon] = useState('Folder');
  const [listFilter, setListFilter] = useState<AppMode | 'all'>(defaultMode);

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
                {ICON_OPTIONS.map(({ name: iconName, label, Icon }) => {
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
              {filteredList.map((cat) => {
                const catMode = inferCategoryMode(cat);
                const count = siteCounts[cat.id] ?? 0;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/75 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {cat.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            catMode === 'work'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300'
                              : catMode === 'moyu'
                                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300'
                                : 'bg-pink-500/10 text-pink-600 dark:text-pink-300'
                          }`}
                        >
                          {catMode === 'work' ? '工作' : catMode === 'moyu' ? '摸鱼' : 'NSFW'}
                        </span>
                        <span className="text-xs text-slate-400">{count} 站</span>
                      </div>
                      {cat.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{cat.description}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
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
