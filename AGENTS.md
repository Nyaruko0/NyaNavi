# NyaNavi — AGENTS.md（项目开发基准）

> 本文档为 **NyaNavi** 项目的最高工程与产品基准，汇总了架构设计、权限安全边界、模式隔离规则、UI/UX 规范与协作防踩坑约定。所有后续迭代及多代理协作均须以此为准。

---

## 1. 项目概览与部署

- **定位**：清爽极简、支持 **工作 / 摸鱼 / NSFW 三段严格隔离** 的二次元 ACG 与效率导航站，支持 Android PWA 与 PC 宽屏双端体验，零后端纯静态托管于 GitHub Pages，通过 GitHub Contents API 实现站长云端管理与双仓私密同步。
- **线上地址**：`https://nyaruko0.github.io/NyaNavi/`
- **公开主仓库**：`https://github.com/Nyaruko0/NyaNavi`（分支 `main`，由 `.github/workflows/deploy.yml` 自动构建部署）
- **独立私有扩展库**：单独的 GitHub Private 仓库（通过站长面板配置，保存 `private-sites.json`，绝不与公开仓混用）
- **OAuth 中转服务**：Cloudflare Worker（源码见 `cloudflare-worker/oauth-worker.js`，仅申请 `read:user` 最小身份权限）
- **常用命令**：
  - 本地开发（带 `/api/check` 精准探测中间件）：`npm run dev`（默认 `http://127.0.0.1:5173/`）
  - 类型检查 + 生产构建（提交前必跑且必须零错误）：`npm run build`（`tsc -b && vite build`）

---

## 2. 技术栈与文件地图

- **技术栈**：Vite 6 + React 19 + TypeScript 5.8 + Tailwind CSS v4（`@tailwindcss/vite` + `@custom-variant dark`）+ Lucide React
- **核心目录结构**：
  - `vite.config.ts`：配置 `base: './'`（GitHub Pages 相对路径）及本地开发 `/api/check` 精准 HTTP 存活检测中间件（识别状态码与 Cloudflare 盾）
  - `public/sites.json`：线上公开站点唯一真源（站长同步直接更新此文件）
  - `public/categories.json`：线上动态分类目录配置（支持站长新增、重命名、拖拽/上下重排、删除）
  - `public/vault.enc`：AES-256-GCM + PBKDF2-SHA256 加密密文库（含私密站点与加密好友白名单，不含任何明文网址）
  - `public/manifest.webmanifest` & `index.html`：Android PWA 清单、安全区 `viewport-fit=cover`、Google Fonts（`Plus Jakarta Sans` + `Noto Sans SC` + `JetBrains Mono`）
  - `src/App.tsx`：主应用状态中枢（三模式严格过滤、站点/分类/私密库加载、GitHub 双仓分流同步、全局快捷键、吸顶搜索框、回顶/到底双键）
  - `src/types.ts`：核心类型定义（`SiteItem`、`CategoryMeta`、`AppMode = 'work' | 'moyu' | 'nsfw'`、`AppearanceSettings`）
  - `src/data/`：
    - `defaultSites.ts`：默认分类目录（`CATEGORIES`）与核心站点兜底数据
    - `acgboxSites.ts` / `chromeSites.ts`：整理去重后的内置站点集合
    - `portalMessages.ts`：二次元与经典 Galgame 地标随机传送门文案库（17 条）
  - `src/components/`：
    - `Sidebar.tsx`：桌面固定侧边栏 / 移动端抽屉、独立滚动分类目录、站长管理入口（访客隐藏 JSON 导出）
    - `SearchBar.tsx`：全局吸顶居中搜索框（站内即时过滤 + ACG 标题自动清洗/RJ 号提取 + 站外直搜胶囊）
    - `SiteCard.tsx` & `SiteIcon.tsx`：极简卡片、多级高清原生 Favicon 抓取（自动过滤 16×16 灰色小地球，回退柔和渐变首字/缩写）
    - `PortalModal.tsx`：外链二次元地名随机确认弹窗（支持 `Enter` 直跳、`Esc` 取消、🎲 换台词、扣币/冷却提醒；工作模式静默直跳）
    - `SettingsDrawer.tsx`：右侧毛玻璃「外观与版面设置」抽屉（5 主题色、2/3/4 列、卡片密度/圆角、3 字体风格、4 档全局字号、信息显隐、背景纹理与自定义壁纸模糊度/透明度、传送门开关）
    - `SiteModal.tsx`：站长新增/编辑站点弹窗（含「所属模式：工作 / 摸鱼 / NSFW」三段选择器与分类下拉联动、私有库标记）
    - `CategoryModal.tsx`：站长分类目录管理弹窗（新增/重命名/选模式/选图标/删除并安全转移站点/↑↓ 与拖拽排序）
    - `AdminModal.tsx`：统一 GitHub 登录、站长 Token & 私有仓库配置、好友 OAuth 登录与密文密钥解锁弹窗
  - `src/utils/`：
    - `githubSync.ts`：GitHub Contents API 读写（`sites.json`、`categories.json`、`private-sites.json`、`vault.enc`）与仓库私有性安全校验
    - `vaultCrypto.ts`：浏览器原生 Web Crypto API 加解密（PBKDF2 150,000 次迭代 + AES-256-GCM）
    - `oauthConfig.ts`：Cloudflare Worker OAuth 跳转与 URL hash 会话消费
    - `cleanQuery.ts`：ACG 标题去 `【...】`/`[...]`/容量后缀与 RJ/VJ/BJ 编号提取
    - `healthCheck.ts`：双模存活检测（本地 `/api/check` 精准探测 → 静态部署自动降级浏览器 `no-cors` 本机测速）

---

## 3. 核心业务规则与安全红线（不可违背）

### 3.1 三模式严格目录隔离
三个模式彼此独立，**每个模式只展示其专属目录与对应站点**，且非站长视图自动隐藏 0 站点的空目录：
1. **工作模式（`work`）**：
   - 仅展示 `workAllowed: true` 的 11 个纯生产力目录（名称对齐 `acgbox.link`）：`论坛/学习`、`AI网站`、`以图搜图`、`网页工具箱`、`在线翻译`、`图床`、`临时邮箱 / 短信`、`文件互传`、`IP查询与测速`、`扩展程序`、`软件推荐与分享`。
   - 品牌切换为 `NyaDesk`，标题为工作台视角；外链点击静默直跳，不弹二次元传送门。
2. **摸鱼模式（`moyu`）**：
   - **仅展示全年龄娱乐表站**（`!site.nsfw && !cat.workAllowed && !cat.nsfwOnly`）：在线动漫、动漫下载、在线漫画、日轻小说、次元美图、影视·音乐·书库、番剧百科与导航、全年龄游戏与社区（S1/NGA/X岛等）、表站电报频道。
   - **严禁**混入办公工具、开源软件、技术论坛或任何 NSFW 里站。
3. **NSFW 模式（`nsfw`）**：
   - **仅展示 NSFW 里站目录与已解锁的私密库**（`site.nsfw || site.category === 'private_vault'`，排除 `workAllowed` 目录），不混入工作工具与纯表站。
4. **置顶分区命名**：侧边栏、移动端胶囊条与首页置顶分区统一命名为 **「站长爱看😋」**。
5. **快捷键**：`Alt + W` 智能老板键（从摸鱼/NSFW 一键秒切工作模式，再按恢复原模式）；`/` 快捷聚焦搜索框。

### 3.2 权限分级与双仓零泄露红线
- **三种身份**：
  - `none`（匿名访客）：只读公开站点，支持本地星标收藏与外观自定义；**禁止**增删改站点/分类，**禁止**下载导出 JSON。
  - `member`（普通 GitHub 登录好友，无主仓写权限）：只读公开站点 + 可凭站长给的明文密钥校验白名单后只读解锁 `public/vault.enc`；同样**禁止**管理与导出 JSON。
  - `admin`（站长，Token 拥有主仓 `push/admin` 权限）：全功能管理（站点/分类增删改排、私密库管理、导出/导入、同步到 GitHub）。
- **双仓绝对隔离（防泄露铁律）**：
  - `public/sites.json` 在任何同步或脚本合并中必须二次过滤，**绝对禁止**写入任何 `privateOnly`、`private_vault` 站点，也**禁止**提交机场/VPN/代理面板、学校个人入口、本地 `127.0.0.1` 链接、带个人 `token`/`code`/`cuid`/SAML 参数的链接以及真人成人站点。
  - 写入独立私有扩展仓库前，必须通过 `verifyPrivateRepo` 校验目标仓库确为 `private: true` 且非主仓本身。
  - 站长导入私密库 JSON 必须执行**增量去重合并**，严禁直接覆盖清空原有私密站点。
  - 内部调研交接文档 `HANDOFF.md` 必须保留在 `.gitignore` 中，绝不推送到公开仓库。

### 3.3 ACG 业务防踩坑约定
- **严禁对高成本/限流站做自动结果数预检**：`moezone.app` 每次搜索扣 3 萌币、`south-plus.net` 有 10 秒搜索冷却；仅允许用户主动点击直搜，并在卡片与传送门弹窗中给出风险提示。
- **原生 Favicon 抓取规范**：`SiteIcon.tsx` 多源顺序为 `customIcon → Google S2 (sz=128，过滤 <=16px 灰色默认地球) → Favicon.im → DuckDuckGo → fallbackIcon → /favicon.ico → 柔和渐变首字/缩写徽章`，所有外链图标必须带 `referrerPolicy="no-referrer"` 与 `loading="lazy"`。

---

## 4. UI / UX 与双端适配标准

- **视觉风格**：明亮通透、极简克制（支持亮/暗切换与 5 套动态 `--nya-accent` 主题色变量），通过 `html` 根字号 `--nya-root-size` 驱动全站 `rem` 等比缩放，提供 **精巧（15px）/ 标准（16.5px，默认）/ 大字（18px）/ 特大（19.5px）** 4 档调节。
- **吸顶与滚动体验**：
  - 顶栏与居中 `<SearchBar />` 置于同一个 `sticky top-0 z-20` 容器内，保证在任意字号档位下均零缝隙、零遮挡；
  - 右下角常驻「回到顶部 / 直达底部」双毛玻璃悬浮按钮。
- **Android 移动端适配**：
  - 搜索框下方提供横向滑动分类胶囊栏（`lg:hidden`）；
  - 卡片收藏与管理按钮在移动端常显且放大触控热区（仅 `sm:` 以上采用 hover 显现）；
  - 输入框保持 `text-base` 防手机浏览器自动缩放；传送门弹窗在移动端底部对齐、确认/取消按钮通栏堆叠防长梗文案折行。

---

## 5. Git 协作与开发工作流

1. **站长网页端会随时直接提交 `public/sites.json`、`public/categories.json`、`public/vault.enc` 到 GitHub `main`**。因此：
   - 任何本地修改数据文件或执行 `git push` 前，必须先 `git pull --rebase origin main`；
   - 若 `public/sites.json`、`public/categories.json` 或 `public/vault.enc` 发生冲突，**优先保留远端（站长网页同步的）最新数据**，再在其上增量重放本地改动，绝不使用 `git push --force` 覆盖远端。
2. 每次提交前必须执行 `npm run build` 确保 TypeScript（`tsc -b`）与 Vite 生产构建均零错误。
3. 临时脚本、中间抓取结果与书签备份统一存放于会话 scratch 目录，不遗留在项目根目录或提交进 Git。
