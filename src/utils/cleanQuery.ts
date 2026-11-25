/**
 * 清洗 ACG 资源标题：
 * 1. 提取 RJ/VJ/BJ/d_ 编号供精准直搜；
 * 2. 去除 【...】、[...]、〔...〕 前缀标签、容量后缀与搬运修饰词，防止源站 LIKE 匹配失败。
 */
interface CleanedQueryResult {
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

  const codeRegex = /\b([RBV]J\d{6,8}|d_\d{5,7})\b/i;
  const codeMatch = raw.match(codeRegex)?.[1]?.toUpperCase() ?? null;

  let text = raw
    .replace(/[【\[〔][^】\]〕]{1,40}[】\]〕]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:TB|GB|MB|KB|G|M)\b/gi, ' ')
    .replace(/\b(?:ver\.?|v)\s*\d+(?:\.\d+)+[a-z]?\b/gi, ' ')
    .replace(/(?:度盘|夸克|迅雷|秒传|步兵|骑兵|汉化版|官中|机翻|AI汉化|精翻|完整版|全CG|存档|直装)/gi, ' ')
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
