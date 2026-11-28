import type {
  AccentPreset,
  AppearanceSettings,
  FontSizeScale,
  SiteIconPreset,
} from '../types';

export const SITE_ICON_PRESETS: Record<
  SiteIconPreset,
  {
    name: string;
    subtitle: string;
    preview: string;
    favicon: string;
    apple: string;
    manifest: string;
  }
> = {
  neko: {
    name: '紫喵飞吻',
    subtitle: '默认',
    preview: './icons/neko-192.png',
    favicon: './icons/neko-64.png',
    apple: './icons/neko-apple.png',
    manifest: './manifest-neko.webmanifest',
  },
  maid: {
    name: '星海女仆',
    subtitle: '蓝发虎牙',
    preview: './icons/maid-192.png',
    favicon: './icons/maid-64.png',
    apple: './icons/maid-apple.png',
    manifest: './manifest-maid.webmanifest',
  },
  amber: {
    name: '暖橘呆萌',
    subtitle: '蜜桃暖阳',
    preview: './icons/amber-192.png',
    favicon: './icons/amber-64.png',
    apple: './icons/amber-apple.png',
    manifest: './manifest-amber.webmanifest',
  },
  dragon: {
    name: '冰晶龙角',
    subtitle: '傲娇龙娘',
    preview: './icons/dragon-192.png',
    favicon: './icons/dragon-64.png',
    apple: './icons/dragon-apple.png',
    manifest: './manifest-dragon.webmanifest',
  },
};

export const FONT_SIZE_SCALES: Record<FontSizeScale, { label: string; rootPx: string }> = {
  sm: { label: '精巧', rootPx: '15px' },
  md: { label: '标准', rootPx: '16.5px' },
  lg: { label: '大字', rootPx: '18px' },
  xl: { label: '特大', rootPx: '19.5px' },
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: 'sakura',
  siteIcon: 'neko',
  columns: 3,
  density: 'default',
  radius: 'soft',
  fontStyle: 'sans',
  fontSize: 'md',
  bgStyle: 'minimal',
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

/** 仅允许合法的 http/https 图片地址，避免 CSS backgroundImage 注入或畸形 URL */
export function sanitizeWallpaperUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}
