import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CornerDownLeft, ExternalLink, Search, Sparkles, X } from 'lucide-react';
import type { AppMode, SiteItem } from '../types';
import { buildSearchUrl, cleanSearchQuery } from '../utils/cleanQuery';

export interface SearchEngineItem {
  id: string;
  label: string;
  url: string;
  placeholder: string;
  risk?: 'cost' | 'cooldown';
  note?: string;
}

export interface SearchGroup {
  id: string;
  label: string;
  modes: AppMode[];
  engines: SearchEngineItem[];
}

const SEARCH_GROUPS: SearchGroup[] = [
  {
    id: 'site',
    label: '站内',
    modes: ['work', 'moyu', 'nsfw'],
    engines: [],
  },
  {
    id: 'web',
    label: '搜索',
    modes: ['work', 'moyu', 'nsfw'],
    engines: [
      { id: 'google', label: 'Google', url: 'https://www.google.com/search?q={q}', placeholder: 'Google 搜索...' },
      { id: 'bing', label: 'Bing', url: 'https://cn.bing.com/search?q={q}', placeholder: '微软 Bing 搜索...' },
      { id: 'baidu', label: '百度', url: 'https://www.baidu.com/s?wd={q}', placeholder: '百度一下...' },
      { id: 'github', label: 'GitHub', url: 'https://github.com/search?q={q}', placeholder: '搜索 GitHub 仓库与代码...' },
      { id: 'ddg', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}', placeholder: 'DuckDuckGo 隐私搜索...' },
      { id: 'yandex', label: 'Yandex', url: 'https://yandex.com/search/?text={q}', placeholder: 'Yandex 搜索...' },
    ],
  },
  {
    id: 'anime',
    label: '动漫',
    modes: ['moyu', 'nsfw'],
    engines: [
      { id: 'bgm', label: 'Bangumi', url: 'https://bgm.tv/subject_search/{q}?cat=all', placeholder: 'Bangumi 查番剧 / 条目评分...' },
      { id: 'bilibili', label: '哔哩哔哩', url: 'https://search.bilibili.com/bangumi?keyword={q}', placeholder: '哔哩哔哩搜番剧...' },
      { id: 'cyc', label: '次元城动漫', url: 'https://www.cyc-anime.net/search.html?wd={q}', placeholder: '次元城动漫搜索...' },
      { id: 'giri', label: 'girigiri爱动漫', url: 'https://anime.girigirilove.icu/search/-------------/?wd={q}', placeholder: 'girigiri爱动漫搜索...' },
      { id: 'jzacg', label: '橘子动漫', url: 'https://www.jzacg.com/search/-------------/?wd={q}', placeholder: '橘子动漫搜索...' },
      { id: 'age', label: 'AGE动漫', url: 'https://www.agemys.org/search?query={q}', placeholder: 'AGE动漫搜索...' },
      { id: 'gamer', label: '动画疯', url: 'https://ani.gamer.com.tw/search.php?keyword={q}', placeholder: '巴哈姆特动画疯（建议繁体）...' },
    ],
  },
  {
    id: 'download',
    label: '下载',
    modes: ['moyu', 'nsfw'],
    engines: [
      { id: 'dmhy', label: '动漫花园', url: 'https://share.dmhy.org/topics/list?keyword={q}', placeholder: '动漫花园搜字幕组 BT...' },
      { id: 'nyaa', label: 'Nyaa', url: 'https://nyaa.si/?f=0&c=0_0&q={q}', placeholder: 'Nyaa.si 搜动漫种子...' },
      { id: 'mikan', label: '蜜柑计划', url: 'https://mikanime.tv/Home/Search?searchstr={q}', placeholder: '蜜柑计划搜新番订阅...' },
    ],
  },
  {
    id: 'manga',
    label: '漫画',
    modes: ['moyu', 'nsfw'],
    engines: [
      { id: 'copy', label: '拷贝漫画', url: 'https://www.mangacopy.com/search?q={q}', placeholder: '拷贝漫画搜索...' },
      { id: 'komiic', label: 'Komiic', url: 'https://komiic.com/search/{q}', placeholder: 'Komiic 漫画搜索...' },
      { id: 'hisoman', label: '搜漫', url: 'https://www.hisoman.com/search.html?keyword={q}', placeholder: '搜漫聚合检索...' },
      { id: 'dmzj', label: '动漫之家', url: 'https://manhua.dmzj.com/tags/search.shtml?s={q}', placeholder: '动漫之家漫画搜索...' },
    ],
  },
  {
    id: 'pixiv',
    label: '美图',
    modes: ['moyu', 'nsfw'],
    engines: [
      { id: 'px-tag', label: 'Pixiv标签', url: 'https://www.pixiv.net/tags/{q}', placeholder: 'Pixiv 按标签搜索插画...' },
      { id: 'px-art', label: 'Pixiv作品ID', url: 'https://www.pixiv.net/artworks/{q}', placeholder: '输入 Pixiv 作品 PID 直达...' },
      { id: 'px-user', label: 'Pixiv画师ID', url: 'https://www.pixiv.net/users/{q}/artworks', placeholder: '输入 Pixiv 画师 UID 直达...' },
      { id: 'px-re', label: 'Pixiv反代图', url: 'https://pixiv.re/{q}.png', placeholder: '输入 PID 直出反代原图...' },
    ],
  },
  {
    id: 'imgsearch',
    label: '搜图',
    modes: ['work', 'moyu', 'nsfw'],
    engines: [
      { id: 'saucenao', label: 'SauceNAO', url: 'https://saucenao.com/search.php?url={q}', placeholder: '粘贴图片 URL 识图找画师...' },
      { id: 'ascii2d', label: 'ascii2d', url: 'https://ascii2d.net/search/url/{q}', placeholder: '粘贴图片 URL 二次元特征检索...' },
      { id: 'tracemoe', label: '以图搜番', url: 'https://trace.moe/?auto&url={q}', placeholder: '粘贴番剧截图 URL 查出处...' },
      { id: 'glens', label: 'Google Lens', url: 'https://lens.google.com/uploadbyurl?url={q}', placeholder: '粘贴图片 URL 谷歌识图...' },
      { id: 'yandex-img', label: 'Yandex识图', url: 'https://yandex.com/images/search?rpt=imageview&url={q}', placeholder: '粘贴图片 URL Yandex 识图...' },
      { id: 'tineye', label: 'TinEye', url: 'https://www.tineye.com/search/?url={q}', placeholder: '粘贴图片 URL 反向查源...' },
    ],
  },
  {
    id: 'tools',
    label: '工具',
    modes: ['work', 'moyu', 'nsfw'],
    engines: [
      { id: 'gtrans', label: '在线翻译', url: 'https://translate.google.com/?sl=auto&tl=zh-CN&text={q}', placeholder: '输入文本，Google 自动译为中文...' },
      { id: 'archive', label: '网页时光机', url: 'https://web.archive.org/web/*/{q}', placeholder: '输入网址查看历史快照...' },
      { id: 'itdog', label: '在线Ping', url: 'https://www.itdog.cn/ping/{q}', placeholder: '输入域名（不带 https://）测速...' },
      { id: 'mshot', label: '网站预览', url: 'https://s0.wp.com/mshots/v1/{q}', placeholder: '输入完整网址生成页面缩略图...' },
    ],
  },
  {
    id: 'nsfw_hub',
    label: '里站/Gal',
    modes: ['nsfw'],
    engines: [
      { id: 'neohent', label: '芯幻', url: 'https://neohent.ai/search?q={q}', placeholder: '芯幻搜资源（自动清洗标题/RJ号）...' },
      { id: 'vikacg', label: '维咔V站', url: 'https://www.vikacg.com/search?s={q}', placeholder: '维咔 V 站搜 3D/二次元...' },
      { id: 'galdev', label: '真紅論壇', url: 'https://galgame.dev/search?in=titlesposts&term={q}', placeholder: '真紅論壇搜 RPG/SLG...' },
      { id: 'jm', label: '禁漫天堂', url: 'https://18comic.vip/search/photos?main_tag=0&search_query={q}', placeholder: '禁漫天堂搜本子或车牌号...' },
      { id: 'wnacg', label: '绅士漫画', url: 'https://www.wnacg.com/search/?q={q}&f=_all&s=create_time_DESC', placeholder: '绅士漫画搜同人志...' },
      { id: 'vndb', label: 'VNDB', url: 'https://vndb.org/v?sq={q}', placeholder: 'VNDB 反查日文原名与社团...' },
      { id: 'hm', label: 'H-Mirror', url: 'https://h-mirror.com/search?q={q}', placeholder: 'H-Mirror 搜 3D/Iwara 视频...' },
      {
        id: 'sp',
        label: '南+',
        url: 'https://www.south-plus.net/search.php',
        placeholder: '南+（10秒冷却，跳转后站内搜索）...',
        risk: 'cooldown',
        note: '10 秒搜索冷却，严禁高频重复提交',
      },
      {
        id: 'moezone',
        label: '萌の领域',
        url: 'https://www.moezone.app/?s={q}',
        placeholder: '萌の领域（⚠️每次搜索扣3萌币）...',
        risk: 'cost',
        note: '⚠️ 每次搜索扣 3 萌币，确认后再跳转',
      },
    ],
  },
];

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  searchableSites: SiteItem[];
  mode: AppMode;
  onNavigate: (url: string, site: SiteItem, keyword?: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  searchableSites,
  mode,
  onNavigate,
}) => {
  const visibleGroups = useMemo(
    () => SEARCH_GROUPS.filter((g) => g.modes.includes(mode)),
    [mode],
  );

  const [groupId, setGroupId] = useState<string>('site');
  const [engineByGroup, setEngineByGroup] = useState<Record<string, string>>({});
  const [useRaw, setUseRaw] = useState(false);

  // 模式切换导致当前分组不可见时自动回落到“站内”
  useEffect(() => {
    if (!visibleGroups.some((g) => g.id === groupId)) {
      setGroupId('site');
    }
  }, [visibleGroups, groupId]);

  useEffect(() => {
    setUseRaw(false);
  }, [query]);

  const activeGroup = visibleGroups.find((g) => g.id === groupId) || visibleGroups[0];
  const activeEngine = useMemo(() => {
    if (!activeGroup || activeGroup.engines.length === 0) return null;
    const savedId = engineByGroup[activeGroup.id];
    return activeGroup.engines.find((e) => e.id === savedId) || activeGroup.engines[0];
  }, [activeGroup, engineByGroup]);

  const cleanedInfo = useMemo(() => cleanSearchQuery(query), [query]);
  const effectiveQuery = useRaw ? cleanedInfo.raw : cleanedInfo.cleaned;

  // 站内模式且输入了关键词时，附带展示当前模式可直搜的高频源站胶囊
  const quickSiteEngines = useMemo(() => {
    return [...searchableSites]
      .filter((s) => Boolean(s.searchUrl))
      .sort((a, b) => {
        const riskScore = (s: SiteItem) =>
          s.searchRisk === 'cost' ? 3 : s.searchRisk === 'cooldown' ? 2 : s.pinned ? 0 : 1;
        return riskScore(a) - riskScore(b);
      })
      .slice(0, 8);
  }, [searchableSites]);

  const isSiteFilter = activeGroup.id === 'site';

  const handleExternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSiteFilter || !activeEngine) return;
    const raw = query.trim();
    if (!raw) return;

    // 仅在里站/动漫/下载等 ACG 组自动用清洗词；搜图/工具/网页搜索保持原词（避免破坏 URL）
    const shouldClean =
      activeGroup.id === 'nsfw_hub' ||
      activeGroup.id === 'anime' ||
      activeGroup.id === 'download' ||
      activeGroup.id === 'manga';
    const kw = shouldClean ? effectiveQuery : raw;
    const targetUrl = buildSearchUrl(activeEngine.url, kw);

    const syntheticSite: SiteItem = {
      id: `engine-${activeEngine.id}`,
      name: activeEngine.label,
      shortName: activeEngine.label.slice(0, 2),
      url: targetUrl,
      category: 'dev_work',
      description: activeEngine.placeholder,
      tags: [activeGroup.label],
      costTier: activeEngine.risk === 'cost' ? 'paid' : 'free',
      costLabel: activeEngine.risk === 'cost' ? '扣币' : '搜索',
      searchRisk: activeEngine.risk,
      searchNote: activeEngine.note,
      nsfw: activeGroup.id === 'nsfw_hub',
    };
    onNavigate(targetUrl, syntheticSite, kw);
  };

  const placeholderText = isSiteFilter
    ? mode === 'work'
      ? '站内模糊搜工具/文档（支持拼音首字母，如 tc 图床、fy 翻译）...'
      : mode === 'moyu'
        ? '站内模糊搜表站（如 dm 动漫、mh 漫画、bgm），或切上方标签外搜...'
        : '站内模糊搜站点，或粘贴资源标题 / RJ号 一键清洗直搜...'
    : activeEngine?.placeholder || '输入关键词按回车搜索...';

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* 第一层：acgbox.link 风格分组 Tab */}
      <div className="no-scrollbar mb-1.5 flex items-center gap-1 overflow-x-auto px-1">
        {visibleGroups.map((group) => {
          const active = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setGroupId(group.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                active
                  ? 'bg-[var(--nya-accent)] text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* 主搜索输入条 */}
      <form
        onSubmit={handleExternalSubmit}
        className="group relative rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-md transition-all focus-within:border-[var(--nya-accent-border)] focus-within:bg-white focus-within:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800/90 dark:bg-[#141929]/95 dark:focus-within:bg-[#161c2e]"
      >
        <div className="flex items-center gap-2 px-3 py-1">
          <Search className="h-4.5 w-4.5 shrink-0 text-slate-400 transition-colors group-focus-within:text-[var(--nya-accent)]" />
          <input
            id="nyanavi-search-input"
            type="text"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholderText}
            className="w-full bg-transparent text-base text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />

          {query && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {!isSiteFilter && activeEngine && (
            <button
              type="submit"
              disabled={!query.trim()}
              style={{
                background: 'linear-gradient(135deg, var(--nya-accent), var(--nya-accent-2))',
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:opacity-95 disabled:opacity-40"
              title={`在 ${activeEngine.label} 中搜索`}
            >
              <span>搜{activeEngine.label.slice(0, 4)}</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 第二层 A：非站内分组时，展示该组子引擎单选条（复刻 acgbox.link 胶囊） */}
        {!isSiteFilter && activeGroup.engines.length > 0 && (
          <div className="no-scrollbar mt-1 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 px-2.5 pt-2 pb-1 dark:border-slate-800/80">
            {activeGroup.engines.map((eng) => {
              const selected = activeEngine?.id === eng.id;
              const isRisk = eng.risk === 'cost' || eng.risk === 'cooldown';
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() =>
                    setEngineByGroup((prev) => ({ ...prev, [activeGroup.id]: eng.id }))
                  }
                  title={eng.note || eng.placeholder}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    selected
                      ? 'bg-[var(--nya-accent-soft)] text-[var(--nya-accent)] ring-1 ring-[var(--nya-accent-border)]'
                      : isRisk
                        ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {isRisk && <AlertTriangle className="h-3 w-3" />}
                  {eng.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 第二层 B：站内分组且输入了关键词时，展示标题清洗 + 快捷直搜胶囊 */}
        {isSiteFilter && query.trim() && (
          <div className="mt-1 border-t border-slate-100 px-3 pt-2 pb-1.5 dark:border-slate-800/80">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-[var(--nya-accent)]" />
                站外直搜：
              </span>
              <code className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {effectiveQuery}
              </code>

              {cleanedInfo.wasCleaned && (
                <button
                  type="button"
                  onClick={() => setUseRaw((v) => !v)}
                  className="text-[11px] text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                >
                  {useRaw ? '使用智能清洗词' : '已自动去标签/容量 · 改用原词'}
                </button>
              )}

              {cleanedInfo.codeMatch && cleanedInfo.codeMatch !== effectiveQuery && (
                <button
                  type="button"
                  onClick={() => onChange(cleanedInfo.codeMatch!)}
                  className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-semibold text-pink-600 hover:bg-pink-100 dark:bg-pink-500/20 dark:text-pink-300"
                >
                  仅搜编号 {cleanedInfo.codeMatch}
                </button>
              )}
            </div>

            {quickSiteEngines.length > 0 && (
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {quickSiteEngines.map((site) => {
                  const isRisk = site.searchRisk === 'cost' || site.searchRisk === 'cooldown';
                  const targetHref = buildSearchUrl(site.searchUrl!, effectiveQuery);

                  return (
                    <a
                      key={site.id}
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                          return;
                        }
                        e.preventDefault();
                        onNavigate(targetHref, site, effectiveQuery);
                      }}
                      title={site.searchNote || `在 ${site.name} 中搜索「${effectiveQuery}」`}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                        isRisk
                          ? 'border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'border-slate-200 bg-slate-50/90 text-slate-700 hover:border-[var(--nya-accent-border)] hover:text-[var(--nya-accent)] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                      }`}
                    >
                      {isRisk && <AlertTriangle className="h-3 w-3 shrink-0" />}
                      <span>{site.shortName || site.name}</span>
                      {site.searchRisk === 'cost' && <span className="text-[10px] opacity-80">扣币</span>}
                      {site.searchRisk === 'cooldown' && <span className="text-[10px] opacity-80">10s</span>}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
