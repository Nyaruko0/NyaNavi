import React from 'react';
import { Image, LayoutGrid, Palette, RotateCcw, Sparkles, Type, X } from 'lucide-react';
import type {
  AccentPreset,
  AppearanceSettings,
  BackgroundStyle,
  CardDensity,
  CardRadius,
  FontSizeScale,
  FontStyle,
} from '../types';

export const FONT_SIZE_SCALES: Record<FontSizeScale, { label: string; rootPx: string }> = {
  sm: { label: '精巧', rootPx: '15px' },
  md: { label: '标准', rootPx: '16.5px' },
  lg: { label: '大字', rootPx: '18px' },
  xl: { label: '特大', rootPx: '19.5px' },
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: 'sakura',
  columns: 3,
  density: 'default',
  radius: 'soft',
  fontStyle: 'sans',
  fontSize: 'md',
  bgStyle: 'glow',
  showDescription: true,
  showDomain: true,
  showBadges: true,
  enablePortalConfirm: true,
  enableNsfwMode: false,
  wallpaperUrl: '',
  wallpaperBlur: 8,
  wallpaperOpacity: 18,
};

export const ACCENT_THEMES: Record<
  AccentPreset,
  { name: string; primary: string; secondary: string; soft: string; border: string }
> = {
  sakura: {
    name: '樱花粉',
    primary: '#ec4899',
    secondary: '#38bdf8',
    soft: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.35)',
  },
  sky: {
    name: '天青蓝',
    primary: '#0ea5e9',
    secondary: '#6366f1',
    soft: 'rgba(14, 165, 233, 0.1)',
    border: 'rgba(14, 165, 233, 0.35)',
  },
  violet: {
    name: '紫罗兰',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    soft: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  emerald: {
    name: '薄荷青',
    primary: '#10b981',
    secondary: '#0ea5e9',
    soft: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  amber: {
    name: '暖阳橙',
    primary: '#f59e0b',
    secondary: '#f43f5e',
    soft: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
};

interface SettingsDrawerProps {
  open: boolean;
  settings: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
  onReset: () => void;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  settings,
  onChange,
  onReset,
  onClose,
}) => {
  if (!open) return null;

  const update = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* 右侧抽屉（移动端宽屏舒适触控） */}
      <aside className="relative z-10 flex h-full w-[90vw] max-w-sm flex-col border-l border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#111626]/95">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--nya-accent)]" />
            <h2 className="text-base font-semibold tracking-tight text-slate-800 dark:text-white">
              外观与版面设置
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="关闭设置"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 text-sm">
          {/* 1. 主题点缀色 */}
          <section>
            <div className="mb-2.5 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <Palette className="h-3.5 w-3.5 text-slate-400" />
              主题点缀色
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(ACCENT_THEMES) as AccentPreset[]).map((key) => {
                const t = ACCENT_THEMES[key];
                const active = settings.accent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update('accent', key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-2 transition ${
                      active
                        ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                        : 'border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})`,
                      }}
                    />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. 版面与网格 */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              版面布局
            </div>

            {/* 桌面端列数 */}
            <div>
              <div className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                桌面端每行列数
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                {([2, 3, 4] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => update('columns', col)}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.columns === col
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {col} 列
                  </button>
                ))}
              </div>
            </div>

            {/* 卡片紧凑度 */}
            <div>
              <div className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                卡片密度
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                {(
                  [
                    ['comfortable', '舒展'],
                    ['default', '标准'],
                    ['compact', '紧凑'],
                  ] as Array<[CardDensity, string]>
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update('density', val)}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.density === val
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 圆角风格 */}
            <div>
              <div className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                卡片圆角
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                {(
                  [
                    ['soft', '柔和'],
                    ['medium', '适中'],
                    ['sharp', '利落'],
                  ] as Array<[CardRadius, string]>
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update('radius', val)}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.radius === val
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. 字体与视觉元素 */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Type className="h-4 w-4 text-slate-400" />
              字号、字体与信息精简
            </div>

            {/* 全局字号 4 档调节 */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>全局字号大小</span>
                <span className="font-mono text-[0.75rem] text-[var(--nya-accent)]">
                  {FONT_SIZE_SCALES[settings.fontSize]?.label} · {FONT_SIZE_SCALES[settings.fontSize]?.rootPx}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                {(['sm', 'md', 'lg', 'xl'] as FontSizeScale[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update('fontSize', val)}
                    className={`rounded-lg py-2 text-xs font-medium transition ${
                      settings.fontSize === val
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {FONT_SIZE_SCALES[val].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">
                字体风格
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
                {(
                  [
                    ['sans', '现代黑体'],
                    ['round', '轻圆风格'],
                    ['mono', '极客等宽'],
                  ] as Array<[FontStyle, string]>
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update('fontStyle', val)}
                    className={`rounded-lg py-2 text-xs font-medium transition ${
                      settings.fontStyle === val
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">显示站点简介</span>
                <input
                  type="checkbox"
                  checked={settings.showDescription}
                  onChange={(e) => update('showDescription', e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--nya-accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">显示站点域名</span>
                <input
                  type="checkbox"
                  checked={settings.showDomain}
                  onChange={(e) => update('showDomain', e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--nya-accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">显示收费/客户端徽标</span>
                <input
                  type="checkbox"
                  checked={settings.showBadges}
                  onChange={(e) => update('showBadges', e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--nya-accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">开启二次元传送门跳转确认</span>
                <input
                  type="checkbox"
                  checked={settings.enablePortalConfirm}
                  onChange={(e) => update('enablePortalConfirm', e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--nya-accent)]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between border-t border-slate-200/70 pt-2 dark:border-slate-800">
                <div>
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    开启 NSFW 里站模式（18+）
                  </span>
                  <p className="text-[11px] text-slate-400">
                    默认关闭锁定，开启后可在顶栏切换进入 NSFW 分类
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableNsfwMode}
                  onChange={(e) => update('enableNsfwMode', e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded accent-rose-500"
                />
              </label>
            </div>
          </section>

          {/* 4. 背景氛围与自定义壁纸 */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <Image className="h-3.5 w-3.5 text-slate-400" />
              背景氛围与壁纸
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
              {(
                [
                  ['glow', '柔和微光'],
                  ['dots', '极简点阵'],
                  ['minimal', '纯色留白'],
                ] as Array<[BackgroundStyle, string]>
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => update('bgStyle', val)}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    settings.bgStyle === val
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                自定义背景壁纸 URL（可选，支持图床/二次元壁纸）
              </label>
              <input
                type="url"
                value={settings.wallpaperUrl}
                onChange={(e) => update('wallpaperUrl', e.target.value)}
                placeholder="https://example.com/wallpaper.jpg"
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[var(--nya-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {settings.wallpaperUrl.trim() && (
              <div className="space-y-2.5 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>壁纸可见度</span>
                    <span>{settings.wallpaperOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={settings.wallpaperOpacity}
                    onChange={(e) => update('wallpaperOpacity', Number(e.target.value))}
                    className="w-full accent-[var(--nya-accent)]"
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>毛玻璃模糊度</span>
                    <span>{settings.wallpaperBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={settings.wallpaperBlur}
                    onChange={(e) => update('wallpaperBlur', Number(e.target.value))}
                    className="w-full accent-[var(--nya-accent)]"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 底部重置 */}
        <div className="border-t border-slate-200/70 p-4 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onReset}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认外观
          </button>
        </div>
      </aside>
    </div>
  );
};
