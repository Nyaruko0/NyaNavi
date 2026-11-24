# NyaNavi

> 清爽明亮的二次元 ACG 导航与智能直搜站 — 基于 Vite + React + TypeScript + Tailwind CSS 双模架构，支持 **NSFW / 工作模式秒切**、**双模存活检测** 与 **GitHub Pages 一键部署**。

## 核心特性

- **左侧分类导航 + 明亮卡片风**：参考经典清爽卡片布局，支持明亮/暗黑主题一键切换与移动端抽屉导航。
- **多功能搜索框 + 标题智能清洗**：
  - 实时过滤站内卡片（按名称、简介、标签、客户端与域名）；
  - 粘贴带 `【...】`、`[...]` 或容量后缀（如 `30G`、`2.8GB`）的资源标题时自动清洗，并高亮提取 `RJ/VJ/BJ` 编号；
  - 一键带词直搜各大支持搜索的源站，并对扣币站（如 `moezone`）与冷却站（如 `south-plus`）做醒目提醒。
- **NSFW 模式 / 工作模式一键切换**：
  - 点击右上角分段开关或按快捷键 `Alt + W` 秒切；
  - 工作模式下自动隐藏全部 NSFW 分类与站点，品牌与标题同步切换为极简工作台视角（NyaDesk）。
- **双模站点连通性与存活检测**：
  - **本地开发模式**（`npm run dev`）：通过 Vite 内置 `/api/check` 中间件直接发起真实 HTTP 探测，精确返回状态码、延迟并识别 Cloudflare 盾；
  - **GitHub Pages 纯静态模式**：自动无感降级为浏览器 `no-cors` 实时探测，直接反映你本机网络的真实可达性与延迟。
- **自定义站点管理 & 收藏置顶**：
  - 支持新增、编辑、删除站点，以及星标置顶；
  - 数据保存在浏览器 `localStorage`，支持 JSON 一键导出、导入备份与恢复默认。

## 本地运行

```bash
npm install
npm run dev
```

打开终端提示的 `http://localhost:5173/` 即可体验完整本地双模功能。

## 部署到 GitHub Pages

项目已内置 `.github/workflows/deploy.yml`：

1. 将本仓库推送到你的 GitHub 仓库 `main` 分支；
2. 在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**；
3. 每次推送到 `main` 分支都会自动构建并发布在线页面。
