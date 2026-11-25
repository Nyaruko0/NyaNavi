<div align="center">

<img src="./public/icons/neko-192.png" width="84" height="84" alt="NyaNavi" style="border-radius: 20px;" />

# NyaNavi

清爽极简、支持 **工作 / 摸鱼 / NSFW 三段严格隔离** 的二次元 ACG 与效率导航站。

在线访问：**[https://nyaruko0.github.io/NyaNavi/](https://nyaruko0.github.io/NyaNavi/)**（支持 PC 宽屏与 Android / iOS PWA「添加到主屏幕」）

</div>

---

## 核心功能

- **三段严格模式隔离**：
  - **工作模式（NyaDesk）**：仅保留 11 个开发与效率目录，外链静默直跳；
  - **摸鱼模式（默认）**：仅展示全年龄娱乐表站（动漫 / 漫画 / 轻小说 / 美图 / 影视 / 社区）；
  - **NSFW 模式（默认锁定）**：首次进入默认关闭，可在顶栏弹窗或外观设置中自由开关，支持 `Alt + W` 一键老板键切回工作模式。
- **双层分组搜索 + 站内模糊匹配**：
  - 顶部支持 `站内 / 搜索 / 动漫 / 下载 / 漫画 / 美图 / 搜图 / 工具 / 里站·Gal` 分组外搜（随模式自动过滤）；
  - 站内支持多词空格 AND、常用中文/ACG 拼音首字母别名与有序子序列容错评分；粘贴带 `【...】`、`[...]`、容量后缀的标题时自动清洗并提取 `RJ/VJ/BJ` 编号。
- **4 套无白边二次元图标 & 可选 PWA 桌面图标**：
  - 外观设置内可一键切换 4 款满出血二次元图标（紫喵飞吻 / 星海女仆 / 暖橘呆萌 / 冰晶龙角），实时同步标签页 Favicon、侧边栏头像与同源 PWA manifest。
- **站长云端管理与双仓隔离**：
  - 通过 Cloudflare Worker GitHub OAuth 统一登录（全员仅申请 `read:user`，站长账号可配置一键自动进入站长模式）；
  - 支持站点与分类的增删改、同分类卡片拖拽与按钮排序、批量连通性测速，一键同步至 GitHub；
  - 私密站点与好友白名单严格存放于独立私有仓库，公开仓库仅保留 AES-256-GCM 加密后的 `public/vault.enc`。

## 本地开发

```bash
npm install
npm run dev
```

启动后访问 `http://127.0.0.1:5173/`（本地开发自带 `/api/check` 精确 HTTP 存活探测，线上静态部署自动降级为浏览器端实时测速）。

## 自动部署

通过 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建并发布至 GitHub Pages：推送到 `main` 分支，或在站长模式下点击「同步到 GitHub」，约 1 分钟后自动生效。
