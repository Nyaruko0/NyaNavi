import React, { useMemo, useState } from 'react';

interface SiteIconProps {
  url: string;
  name: string;
  shortName?: string;
  accent?: string;
  customIcon?: string;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 网站原生图标组件（多级高清回退）：
 * 1. 用户自定义 icon URL（若有）
 * 2. Google S2 高清 Favicon 服务（绕过目标站防盗链与 CF 盾）
 * 3. DuckDuckGo IP3 图标服务
 * 4. 目标站直连 /favicon.ico
 * 5. 全部失败时回退为彩色渐变简称徽章
 */
export const SiteIcon: React.FC<SiteIconProps> = ({
  url,
  name,
  shortName,
  accent = '#ec4899',
  customIcon,
}) => {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (customIcon?.trim()) {
      list.push(customIcon.trim());
    }
    const host = getHostname(url);
    if (host) {
      list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`);
      list.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`);
      list.push(`https://${host}/favicon.ico`);
    }
    return list;
  }, [url, customIcon]);

  const [index, setIndex] = useState(0);

  // 当候选列表变化时重置索引
  React.useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const currentSrc = candidates[index];
  const badgeText = (shortName || name).slice(0, 2);

  if (!currentSrc) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        {badgeText}
      </div>
    );
  }

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xs transition-transform group-hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800/90">
      <img
        src={currentSrc}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-md object-contain"
        onLoad={(e) => {
          // 某些情况下 favicon 服务会返回极小占位图（<= 16px 且为默认地球），仅在宽或高为 0 时回退
          const img = e.currentTarget;
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            setIndex((i) => i + 1);
          }
        }}
        onError={() => {
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
};
