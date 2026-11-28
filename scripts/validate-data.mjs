import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const sitesPath = path.join(rootDir, 'public', 'sites.json');
const categoriesPath = path.join(rootDir, 'public', 'categories.json');

const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));

const errors = [];

if (!Array.isArray(sites) || sites.length === 0) {
  errors.push('public/sites.json 必须为非空数组');
}
if (!Array.isArray(categories) || categories.length === 0) {
  errors.push('public/categories.json 必须为非空数组');
}

const categoryIds = new Set(categories.map((c) => c.id));
const workCategoryIds = new Set(categories.filter((c) => c.workAllowed).map((c) => c.id));
const nsfwOnlyCategoryIds = new Set(
  categories.filter((c) => c.nsfwOnly || c.privateOnly).map((c) => c.id),
);

const seenIds = new Set();
const seenUrls = new Set();
const localHostPattern = /^(127\.|localhost$|0\.0\.0\.0$|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i;
const sensitiveQueryPattern = /(?:^|[?&])(token|code|cuid|saml|session|auth|secret|password)=/i;

for (const site of sites) {
  if (!site || typeof site !== 'object') {
    errors.push('发现非法站点对象');
    continue;
  }

  if (!site.id || !site.name || !site.url || !site.category) {
    errors.push(`站点缺少必填字段: ${JSON.stringify(site).slice(0, 120)}`);
    continue;
  }

  // 红线 1：严禁泄露任何私密库站点
  if (site.privateOnly || site.category === 'private_vault') {
    errors.push(`[安全红线] 公开 sites.json 禁止包含私密站点: ${site.id} (${site.name})`);
  }

  // 唯一性校验
  if (seenIds.has(site.id)) {
    errors.push(`发现重复站点 ID: ${site.id}`);
  } else {
    seenIds.add(site.id);
  }

  const normUrl = String(site.url).trim().replace(/\/+$/, '').toLowerCase();
  if (seenUrls.has(normUrl)) {
    errors.push(`发现重复站点 URL: ${site.url} (${site.id})`);
  } else {
    seenUrls.add(normUrl);
  }

  // 分类完整性与三模式一致性
  if (!categoryIds.has(site.category)) {
    errors.push(`站点 ${site.id} 引用了不存在的分类: ${site.category}`);
  }
  if (site.nsfw && workCategoryIds.has(site.category)) {
    errors.push(`工作分类 ${site.category} 禁止包含 NSFW 站点: ${site.id}`);
  }
  if (!site.nsfw && nsfwOnlyCategoryIds.has(site.category)) {
    errors.push(`NSFW 专属分类 ${site.category} 包含未标 NSFW 的站点: ${site.id}`);
  }

  // URL 合法性与防敏感凭证泄露校验
  try {
    const parsed = new URL(site.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      errors.push(`站点 ${site.id} 使用了非法协议: ${site.url}`);
    }
    if (localHostPattern.test(parsed.hostname)) {
      errors.push(`[安全红线] 公开 sites.json 禁止包含本地/内网地址: ${site.id} -> ${site.url}`);
    }
    if (sensitiveQueryPattern.test(parsed.search)) {
      errors.push(`[安全红线] 站点 URL 疑似携带个人敏感查询参数: ${site.id} -> ${site.url}`);
    }
  } catch {
    errors.push(`站点 ${site.id} 的 URL 无法解析: ${site.url}`);
  }
}

if (errors.length > 0) {
  console.error(`\n[validate-data] 校验失败，共发现 ${errors.length} 处问题：`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `[validate-data] 校验通过：${sites.length} 个公开站点、${categories.length} 个分类目录均符合安全与完整性规范。`,
);
