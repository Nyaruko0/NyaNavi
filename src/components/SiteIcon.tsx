import React, { useEffect, useMemo, useState } from 'react';

interface SiteIconProps {
  url: string;
  name: string;
  shortName?: string;
  accent?: string;
  customIcon?: string;
  fallbackIcon?: string;
  size?: 'sm' | 'md';
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 提取干净的首字或 2 字符缩写：
 * - 纯英文/数字站名：提取前 2 个大写字母（或首字母缩写，如 "H-Mirror" -> "HM"）
 * - 中文站名：优先用 shortName，否则取前 1-2 个汉字
 */
function getMonogram(name: string, shortName?: string): string {
  if (shortName && shortName.trim()) {
    return shortName.trim().slice(0, 2);
  }
  const clean = name.replace(/^[\s\[\]【】()（）]+/, '').trim();
  if (/^[A-Za-z0-9]/.test(clean)) {
    const words = clean.split(/[\s\-_.]+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.slice(0, 1) || 'N';
}

/**
 * 网站原生图标组件（高清多源 + 智能过滤 16px 默认小地球 + 极简首字/缩写回退）：
 * 1. 用户手动填写的 customIcon
 * 2. Google S2 高清 Favicon（sz=128，但若返回 <=16px 默认地球则自动跳过！）
 * 3. Favicon.im（对中文小站覆盖率高）
 * 4. DuckDuckGo IP3 图标源
 * 5. 采集来源自带的 fallbackIcon（若有）
 * 6. 直连目标站 /favicon.ico
 * 7. 全部失败或低清时，优雅回退为柔和渐变 + 首字/缩写徽章
 */
export const SiteIcon: React.FC<SiteIconProps> = ({
  url,
  name,
  shortName,
  accent = '#ec4899',
  customIcon,
  fallbackIcon,
  size = 'md',
}) => {
  const candidates = useMemo(() => {
    const list: Array<{ src: string; rejectTiny?: boolean }> = [];
    if (customIcon?.trim()) {
      list.push({ src: customIcon.trim(), rejectTiny: false });
    }
    const host = getHostname(url);
    if (host) {
      // Google S2 找不到真实图标时会返回 16x16 灰色默认小地球，rejectTiny=true 自动跳过
      list.push({
        src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
        rejectTiny: true,
      });
      list.push({
        src: `https://favicon.im/${encodeURIComponent(host)}?larger=true`,
        rejectTiny: true,
      });
      list.push({
        src: `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
        rejectTiny: false,
      });
    }
    if (fallbackIcon?.trim()) {
      list.push({ src: fallbackIcon.trim(), rejectTiny: false });
    }
    if (host) {
      list.push({ src: `https://${host}/favicon.ico`, rejectTiny: false });
    }
    return list;
  }, [url, customIcon, fallbackIcon]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const current = candidates[index];
  const monogram = useMemo(() => getMonogram(name, shortName), [name, shortName]);
  const boxClass = size === 'sm' ? 'h-9 w-9 rounded-xl text-xs' : 'h-10 w-10 rounded-xl text-[13px]';

  if (!current) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center font-semibold tracking-tight text-white shadow-2xs ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105 dark:ring-white/10 ${boxClass}`}
        style={{
          background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 72%, #1e293b))`,
        }}
      >
        {monogram}
      </div>
    );
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-slate-100/70 p-1 shadow-2xs ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105 dark:bg-slate-800/75 dark:ring-white/10 ${boxClass}`}
    >
      <img
        src={current.src}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-[8px] object-contain"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (
            img.naturalWidth === 0 ||
            img.naturalHeight === 0 ||
            (current.rejectTiny && img.naturalWidth <= 16 && img.naturalHeight <= 16)
          ) {
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
