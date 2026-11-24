<div align="center">

<img src="./public/favicon.svg" width="84" height="84" alt="NyaNavi Logo" />

# NyaNavi

**清爽极简的二次元 ACG 导航与智能直搜站**

[![在线访问 NyaNavi](https://img.shields.io/badge/%F0%9F%9A%80_%E7%AB%8B%E5%8D%B3%E8%AE%BF%E9%97%AE_NyaNavi-https%3A%2F%2Fnyaruko0.github.io%2FNyaNavi%2F-ff6b9d?style=for-the-badge)](https://nyaruko0.github.io/NyaNavi/)

<h3>👉 在线访问：<a href="https://nyaruko0.github.io/NyaNavi/">https://nyaruko0.github.io/NyaNavi/</a> 👈</h3>

![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Online-22c55e?style=flat-square&logo=github&logoColor=white)

</div>

---

> [!TIP]
> **在线地址**：**[https://nyaruko0.github.io/NyaNavi/](https://nyaruko0.github.io/NyaNavi/)**（支持 PC 桌面端与 Android 手机端 PWA「添加到主屏幕」全屏使用）

## 核心特性

- **255+ 精选站点 & 清晰分类导航**：涵盖 ACG 游戏、Galgame、资源网盘磁力、社区论坛、在线漫画/本子、ASMR、番剧/轻小说、AI 绘画工具、以及工作/学习开发文档。
- **多功能搜索框 + 标题智能清洗**：
  - 实时过滤站内站点，按 `/` 快捷键快速聚焦搜索；
  - 粘贴带 `【...】`、`[...]` 或容量后缀（如 `30G`、`2.8GB`）的标题时自动清洗并高亮提取 `RJ/VJ/BJ` 编号，一键带词直搜各大源站，对扣币/冷却站自动标红提醒。
- **NSFW 模式 / 工作模式秒切**：
  - 点击右上角开关或按 **`Alt + W`** 一键切换；
  - 工作模式下自动隐藏全部 NSFW 站点与分类，页面切换为极简工作台视角（NyaDesk）。
- **二次元地名传送门弹窗**：
  - 每次跳转随机展示 Galgame / 二次元经典地标趣味台词（穗织镇、光坂小镇、鸟白岛、奥木染町、峰城大附属、雏见泽村、秋叶原、提瓦特等），支持 `Enter` 确认、`Esc` 取消、🎲 现场换一句，工作模式自动静默直跳。
- **高度可自定义的外观与版面设置**：
  - 5 套主题点缀色（樱花粉 / 天青蓝 / 紫罗兰 / 薄荷青 / 暖阳橙）+ 亮/暗主题；
  - **4 档全局字号**（精巧 / 标准 / 大字 / 特大）、3 种字体风格、2/3/4 列网格、卡片密度与圆角调节、背景纹理及自定义二次元壁纸（模糊度与可见度可调）。
- **双模连通性与存活检测**：
  - 本地 `npm run dev` 走内置代理获取精确 HTTP 状态码与 Cloudflare 盾识别；线上 GitHub Pages 自动切换浏览器端本机网络实时测速。
- **统一 GitHub 登录 & 权限分层**：
  - **站长模式**：使用仓库读写 Token 登录后解锁增删改查、一键同步至 `public/sites.json`，支持绑定独立 Private 私有仓库；
  - **好友只读私密库**：通过 Cloudflare Worker 实现 GitHub OAuth 一键登录，结合 **PBKDF2 + AES-256-GCM 加密密文 + 加密好友白名单**，验证身份与明文密钥后即可只读访问私密站点。

## 本地开发

```bash
npm install
npm run dev
```

启动后访问 `http://127.0.0.1:5173/` 即可体验本地完整功能。

## 自动部署

本项目通过 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建并发布至 **GitHub Pages**：

- 推送代码到 `main` 分支，或在网页站长模式下点击「同步到 GitHub」，约 1 分钟后线上站点自动更新。
