/**
 * 依据 HANDOFF.md 的实测防踩坑经验清洗 ACG 资源标题：
 * 1. 若含 RJ/VJ/BJ 编号，可高亮提取供一键精准直搜；
 * 2. 自动去除 【...】、[...]、(...) 中的搬运前缀/汉化组标签；
 * 3. 去除末尾容量后缀（如 30G、2.8GB、650MB、V1.02）；
 * 4. 归一化全半角符号与多余空格，防止站内 LIKE 匹配失败。
 */
export interface CleanedQueryResult {
  raw: string;
  cleaned: string;
  codeMatch: string | null;
  wasCleaned: boolean;
}

export function cleanSearchQuery(rawInput: string): CleanedQueryResult {
  const raw = rawInput.trim();
  if (!raw) {
    return { raw: '', cleaned: '', codeMatch: null, wasCleaned: false };
  }

  // 提取常见作品编号（RJ/VJ/BJ/FC2/d_ 等）
  const codeRegex = /\b([RBV]J\d{6,8}|d_\d{5,7})\b/i;
  const codeMatch = raw.match(codeRegex)?.[1]?.toUpperCase() ?? null;

  let text = raw
    // 去除【...】、[... ]、〔...〕、《...》中的常见前缀/标签
    .replace(/[【\[〔][^】\]〕]{1,40}[】\]〕]/g, ' ')
    // 去除常见网盘/容量后缀，例如 30G / 2.8GB / 500MB / 1.2TB
    .replace(/\b\d+(?:\.\d+)?\s*(?:TB|GB|MB|KB|G|M)\b/gi, ' ')
    // 去除常见版本号尾巴（如 Ver1.02 / v2.3）
    .replace(/\b(?:ver\.?|v)\s*\d+(?:\.\d+)+[a-z]?\b/gi, ' ')
    // 去除常见搬运修饰词
    .replace(/(?:度盘|夸克|迅雷|秒传|步兵|骑兵|汉化版|官中|机翻|AI汉化|精翻|完整版|全CG|存档|直装)/gi, ' ')
    // 全角标点与特殊符号转空格
    .replace(/[\/\\|_+~～・·—\-–:：,，。！？!?（）()「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 如果清洗过度变成空，回退原词
  if (!text) {
    text = raw;
  }

  return {
    raw,
    cleaned: text,
    codeMatch,
    wasCleaned: text !== raw,
  };
}

export function buildSearchUrl(template: string, keyword: string): string {
  if (!template.includes('{q}')) {
    return template;
  }
  return template.replace('{q}', encodeURIComponent(keyword.trim()));
}
