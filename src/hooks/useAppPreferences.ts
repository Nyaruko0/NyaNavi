import { useCallback, useEffect, useState } from 'react';
import {
  ACCENT_THEMES,
  DEFAULT_APPEARANCE,
  FONT_SIZE_SCALES,
  SITE_ICON_PRESETS,
} from '../config/appearance';
import type { AppearanceSettings, AppMode } from '../types';

const STORAGE_PINS_KEY = 'nyanavi_pins_v1';
const STORAGE_MODE_KEY = 'nyanavi_mode_v1';
const STORAGE_THEME_KEY = 'nyanavi_theme_v1';
const STORAGE_APPEARANCE_KEY = 'nyanavi_appearance_v1';

function loadLocalPins(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_PINS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadInitialAppearance(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function useAppPreferences(showToast: (msg: string) => void) {
  const [localPins, setLocalPins] = useState<Record<string, boolean>>(loadLocalPins);
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadInitialAppearance);

  const [mode, setMode] = useState<AppMode>(() => {
    const initApp = loadInitialAppearance();
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'work' || saved === 'moyu') return saved;
    if (saved === 'nsfw' && initApp.enableNsfwMode) return 'nsfw';
    return 'moyu';
  });

  const [lastNonWorkMode, setLastNonWorkMode] = useState<'moyu' | 'nsfw'>(() => {
    const initApp = loadInitialAppearance();
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    return saved === 'nsfw' && initApp.enableNsfwMode ? 'nsfw' : 'moyu';
  });

  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_PINS_KEY, JSON.stringify(localPins));
  }, [localPins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_APPEARANCE_KEY, JSON.stringify(appearance));
    const theme = ACCENT_THEMES[appearance.accent] || ACCENT_THEMES.sakura;
    const fontScale = FONT_SIZE_SCALES[appearance.fontSize] || FONT_SIZE_SCALES.md;
    const root = document.documentElement;
    root.style.setProperty('--nya-root-size', fontScale.rootPx);
    root.style.setProperty('--nya-accent', mode === 'work' ? '#0284c7' : theme.primary);
    root.style.setProperty('--nya-accent-2', mode === 'work' ? '#6366f1' : theme.secondary);
    root.style.setProperty(
      '--nya-accent-soft',
      mode === 'work' ? 'rgba(2, 132, 199, 0.1)' : theme.soft,
    );
    root.style.setProperty(
      '--nya-accent-border',
      mode === 'work' ? 'rgba(2, 132, 199, 0.35)' : theme.border,
    );
  }, [appearance, mode]);

  useEffect(() => {
    const iconPreset = SITE_ICON_PRESETS[appearance.siteIcon] || SITE_ICON_PRESETS.neko;
    const fav = document.getElementById('nya-favicon') as HTMLLinkElement | null;
    if (fav) fav.href = iconPreset.favicon;
    const apple = document.getElementById('nya-apple-icon') as HTMLLinkElement | null;
    if (apple) apple.href = iconPreset.apple;
    const manifest = document.getElementById('nya-manifest') as HTMLLinkElement | null;
    if (manifest) manifest.href = iconPreset.manifest;
  }, [appearance.siteIcon]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    if (mode !== 'work') setLastNonWorkMode(mode);
    document.title =
      mode === 'work'
        ? 'NyaDesk · 开发与效率工作台'
        : mode === 'moyu'
          ? 'NyaNavi · 全年龄二次元摸鱼导航'
          : 'NyaNavi · 二次元与 ACG 精选导航';
  }, [mode]);

  useEffect(() => {
    if (!appearance.enableNsfwMode && mode === 'nsfw') {
      setMode('moyu');
      setLastNonWorkMode('moyu');
      showToast('NSFW 模式已关闭锁定，已切回摸鱼模式');
    }
  }, [appearance.enableNsfwMode, mode, showToast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // 快捷键 Alt+W 秒切模式，/ 快捷聚焦搜索框
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setMode((prev) => {
          if (prev !== 'work') {
            showToast('已秒切工作模式（仅保留开发与效率工具）');
            return 'work';
          }
          const targetMode: 'moyu' | 'nsfw' =
            lastNonWorkMode === 'nsfw' && appearance.enableNsfwMode ? 'nsfw' : 'moyu';
          showToast(targetMode === 'moyu' ? '已恢复至摸鱼模式' : '已恢复至 NSFW 完整模式');
          return targetMode;
        });
        return;
      }
      const target = e.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable) {
        e.preventDefault();
        document.getElementById('nyanavi-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appearance.enableNsfwMode, lastNonWorkMode, showToast]);

  const handleSelectMode = useCallback(
    (next: AppMode) => {
      setMode(next);
      showToast(
        next === 'work'
          ? '已切换至工作模式（仅保留工具与文档）'
          : next === 'moyu'
            ? '已切换至摸鱼模式（全年龄表站，安全摸鱼）'
            : '已切换至 NSFW 完整模式',
      );
    },
    [showToast],
  );

  return {
    localPins,
    setLocalPins,
    appearance,
    setAppearance,
    mode,
    setMode,
    dark,
    setDark,
    handleSelectMode,
  };
}
