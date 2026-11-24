export type CategoryId =
  | 'private_vault'
  | 'acg_games'
  | 'acg_resources'
  | 'acg_community'
  | 'comics'
  | 'hentai_video'
  | 'asmr'
  | 'novels'
  | 'tg_channels'
  | 'anime_stream'
  | 'anime_download'
  | 'comics_sfw'
  | 'light_novels'
  | 'artworks'
  | 'media_ent'
  | 'anime_community'
  | 'ai_image_search'
  | 'web_tools'
  | 'tools'
  | 'dev_work';

export type CostTier = 'free' | 'checkin' | 'points' | 'paid';

export interface SiteItem {
  id: string;
  name: string;
  shortName?: string;
  url: string;
  category: CategoryId;
  description: string;
  tags: string[];
  costTier: CostTier;
  costLabel: string;
  /** 支持站外带词直搜的 URL 模板，用 {q} 表示编码后的关键词 */
  searchUrl?: string;
  /** 搜索方式备注或风险提示（如扣币、冷却、需登录） */
  searchNote?: string;
  /** 是否高成本搜索（如扣币/严格冷却），用于界面警示 */
  searchRisk?: 'cost' | 'cooldown' | 'login' | 'spa';
  /** 客户端 / PWA / 阅读器支持标签 */
  clients?: string[];
  /** 是否属于 NSFW 内容；工作模式下自动隐藏 */
  nsfw: boolean;
  /** 是否仅存在于站长私有仓库（严禁同步至公开 sites.json，仅站长登录后可见） */
  privateOnly?: boolean;
  /** 是否用户收藏/置顶 */
  pinned?: boolean;
  /** 卡片左上角图标色系或自定义字母 */
  accent?: string;
  /** 可选自定义图标 URL（留空则自动拉取网站原生 favicon） */
  icon?: string;
  /** 采集来源自带的备用图标 URL */
  fallbackIcon?: string;
}

export type AccentPreset = 'sakura' | 'sky' | 'violet' | 'emerald' | 'amber';
export type CardDensity = 'comfortable' | 'default' | 'compact';
export type CardRadius = 'soft' | 'medium' | 'sharp';
export type FontStyle = 'sans' | 'round' | 'mono';
export type FontSizeScale = 'sm' | 'md' | 'lg' | 'xl';
export type BackgroundStyle = 'glow' | 'dots' | 'minimal';

export interface AppearanceSettings {
  accent: AccentPreset;
  columns: 2 | 3 | 4;
  density: CardDensity;
  radius: CardRadius;
  fontStyle: FontStyle;
  fontSize: FontSizeScale;
  bgStyle: BackgroundStyle;
  showDescription: boolean;
  showDomain: boolean;
  showBadges: boolean;
  enablePortalConfirm: boolean;
  wallpaperUrl: string;
  wallpaperBlur: number;
  wallpaperOpacity: number;
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  workName?: string;
  description: string;
  icon: string;
  nsfwOnly?: boolean;
  privateOnly?: boolean;
  /** 是否在纯“工作模式”下展示（否则仅在摸鱼/NSFW模式下展示） */
  workAllowed?: boolean;
}

export type HealthState = 'idle' | 'checking' | 'online' | 'warn' | 'offline';

export interface HealthResult {
  state: HealthState;
  latency?: number;
  status?: number;
  note?: string;
  mode?: 'local-proxy' | 'browser-nocors';
  checkedAt?: number;
}

export type AppMode = 'work' | 'moyu' | 'nsfw';
export type SearchMode = 'filter' | 'direct';
