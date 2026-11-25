import type { SiteItem } from '../types';

/** 高频中文词 -> 拼音/首字母别名表，提升中文导航站拼音容错 */
const CN_ALIAS_MAP: Array<[string, string]> = [
  ['动漫', 'dongman dm'],
  ['番剧', 'fanju fj'],
  ['漫画', 'manhua mh'],
  ['本子', 'benzi bz'],
  ['小说', 'xiaoshuo xs'],
  ['轻小说', 'qingxiaoshuo qxs'],
  ['图床', 'tuchuang tc'],
  ['翻译', 'fanyi fy'],
  ['测速', 'cesu cs'],
  ['搜图', 'soutu st'],
  ['网盘', 'wangpan wp'],
  ['游戏', 'youxi yx'],
  ['影视', 'yingshi ys'],
  ['电影', 'dianying dy'],
  ['音乐', 'yinyue yy'],
  ['论坛', 'luntan lt'],
  ['邮箱', 'youxiang yx'],
  ['里番', 'lifan lf'],
  ['导航', 'daohang dh'],
  ['壁纸', 'bizhi bz'],
  ['美图', 'meitu mt'],
  ['工具', 'gongju gj'],
  ['软件', 'ruanjian rj'],
  ['扩展', 'kuozhan kz'],
  ['书库', 'shuku sk'],
  ['视频', 'shipin sp'],
  ['磁力', 'cili cl'],
  ['汉化', 'hanhua hh'],
  ['绅士', 'shenshi ss'],
  ['禁漫', 'jinman jm'],
  ['萌幻', 'menghuan mh'],
  ['维咔', 'weika wk'],
  ['芯幻', 'xinhuan xh'],
  ['真红', 'zhenhong zh'],
  ['真紅', 'zhenhong zh'],
  ['绯月', 'feiyue fy'],
  ['月幕', 'yuemu ym'],
  ['南+', 'nan+ n+ sp'],
  ['知乎', 'zhihu zh'],
  ['百度', 'baidu bd'],
  ['哔哩', 'bili bl'],
  ['蔚蓝', 'weilan wl ba'],
  ['碧蓝', 'bilan bl'],
  ['开源', 'kaiyuan ky'],
  ['文件', 'wenjian wj'],
  ['互传', 'huchuan hc'],
  ['临时', 'linshi ls'],
  ['短信', 'duanxin dx'],
];

/** 判断 needle 是否为 haystack 的有序模糊子序列，返回紧密度分数（0 表示不匹配） */
function subsequenceScore(needle: string, haystack: string): number {
  if (!needle || needle.length > haystack.length) return 0;
  let ni = 0;
  let firstIdx = -1;
  let lastIdx = -1;
  let consecutive = 0;

  for (let hi = 0; hi < haystack.length && ni < needle.length; hi++) {
    if (haystack[hi] === needle[ni]) {
      if (firstIdx === -1) firstIdx = hi;
      if (lastIdx === hi - 1) consecutive++;
      lastIdx = hi;
      ni++;
    }
  }

  if (ni !== needle.length) return 0;
  const span = lastIdx - firstIdx + 1;
  const compactness = needle.length / span; // 越紧凑分数越高
  return Math.round(18 + compactness * 22 + consecutive * 4);
}

function buildSearchAlias(text: string): string {
  let extra = '';
  for (const [cn, alias] of CN_ALIAS_MAP) {
    if (text.includes(cn)) {
      extra += ` ${alias}`;
    }
  }
  return extra;
}

/**
 * 计算单个站点与查询词的模糊匹配分（0 表示不匹配，分数越高越相关）：
 * - 支持空格拆词（多关键词 AND 匹配）
 * - 支持站名、简称、URL、简介、标签、客户端与中文拼音别名
 * - 支持有序模糊子序列容错（如 "nht" -> "nhentai" / "neohent"，"gm" -> "galgame"）
 */
export function scoreSiteMatch(site: SiteItem, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 1;

  const tokens = q.split(/\s+/).filter(Boolean);
  const name = site.name.toLowerCase();
  const shortName = (site.shortName || '').toLowerCase();
  const url = site.url.toLowerCase();
  const tags = (site.tags || []).join(' ').toLowerCase();
  const clients = (site.clients || []).join(' ').toLowerCase();
  const desc = (site.description || '').toLowerCase();
  const baseText = `${name} ${shortName} ${tags} ${desc}`;
  const alias = buildSearchAlias(baseText);
  const fullHaystack = `${name} ${shortName} ${url} ${tags} ${clients} ${desc} ${site.costLabel.toLowerCase()} ${alias}`;

  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    if (name === token || shortName === token) {
      tokenScore = 120;
    } else if (name.startsWith(token) || shortName.startsWith(token)) {
      tokenScore = 100;
    } else if (name.includes(token) || shortName.includes(token)) {
      tokenScore = 85;
    } else if (url.includes(token)) {
      tokenScore = 72;
    } else if (tags.includes(token) || clients.includes(token)) {
      tokenScore = 64;
    } else if (desc.includes(token) || alias.includes(token)) {
      tokenScore = 52;
    } else {
      // 模糊子序列容错匹配（优先在站名与域名里找）
      const cleanToken = token.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      if (cleanToken.length >= 2) {
        const nameSub = subsequenceScore(cleanToken, name.replace(/\s+/g, ''));
        const urlSub = subsequenceScore(cleanToken, url.replace(/^https?:\/\/(www\.)?/, ''));
        const fullSub = subsequenceScore(cleanToken, fullHaystack.replace(/\s+/g, ''));
        tokenScore = Math.max(
          nameSub > 0 ? nameSub + 12 : 0,
          urlSub > 0 ? urlSub + 6 : 0,
          fullSub,
        );
      }
    }

    if (tokenScore === 0) return 0;
    totalScore += tokenScore;
  }

  return totalScore;
}
