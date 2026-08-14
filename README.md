# Echoin 的网络安全博客

基于 [Hexo](https://hexo.io/zh-cn/) + [Butterfly](https://butterfly.js.org/) 主题搭建的个人安全博客，浅紫色主题，自动部署到 GitHub Pages。

定位：记录 **Web 安全、渗透测试、CTF Writeup、靶场笔记**。

## 目录结构

```
blog/
├── _config.yml              # Hexo 站点配置（标题/URL/主题/插件）
├── _config.butterfly.yml    # Butterfly 主题配置（紫色配色、菜单、侧边栏等）
├── scaffolds/               # 文章模板
├── source/
│   ├── _posts/              # 文章（markdown）
│   ├── about/index.md       # 关于页
│   ├── tags/index.md        # 标签页
│   ├── categories/index.md  # 分类页
│   └── CNAME                # 接入自定义域名时创建（见下文）
├── .github/workflows/pages.yml  # GitHub Actions 自动部署
└── public/                  # 构建产物（本地 hexo g 生成，已 gitignore）
```

## 快速开始

### 本地预览

```bash
npm install          # 首次安装依赖
npx hexo server      # 启动本地预览 http://localhost:4000
```

### 写新文章

```bash
npx hexo new "文章标题"
```

会在 `source/_posts/` 下生成 `文章标题.md`（同时创建一个同名文件夹用于放截图）。

文章顶部 front-matter 示例：

```yaml
---
title: 我的第一篇文章
date: 2026-08-14 10:00:00
categories:
  - Web安全          # 分类：Web安全 / 渗透测试 / CTF / 靶场 / 学习笔记
tags:
  - SQL注入
  - Web安全
description: 文章摘要
---
```

> 分类支持嵌套：`- [Web安全, XSS]` 表示「Web安全」下的「XSS」子分类。

### 插入图片

图片放在与文章同名的资源文件夹里（例如 `source/_posts/文章标题/1.png`），正文用：

```markdown
{% asset_img 1.png 图片描述 %}
```

## 部署到 GitHub Pages

### 1. 创建仓库

在 GitHub 新建仓库，命名为 **`Echoin-613.github.io`**（必须与用户名一致，选 Public，**不要**勾选初始化 README）。

### 2. 推送代码

```bash
git init
git add .
git commit -m "init: 安全博客搭建"
git branch -M main
git remote add origin git@github.com:Echoin-613/Echoin-613.github.io.git
git push -u origin main
```

### 3. 开启 Pages

推送后 GitHub Actions 会自动构建并部署到 `gh-pages` 分支。然后在仓库 **Settings → Pages** 里：

- Source 选择 **Deploy from a branch**
- Branch 选择 **`gh-pages`** / **`/ (root)`**，保存

稍等几分钟，访问 `https://echoin-613.github.io` 即可看到博客。

> 每次 `git push` 到 `main` 分支，Actions 都会自动重新构建部署。

## 接入自定义域名

1. 在项目根目录 `source/` 下创建 `CNAME` 文件，内容为你的域名（例如 `blog.example.com`）：

   ```
   blog.example.com
   ```

2. 在域名服务商处添加 DNS 解析（以 `blog.example.com` 为例）：

   - 类型 `CNAME`，主机记录 `blog`，记录值 `Echoin-613.github.io`

   > 若使用裸域 `example.com`，则添加 `A` 记录指向 GitHub Pages 的 IP（`185.199.108.153` 等，以 GitHub 官方为准）。

3. 到仓库 **Settings → Pages → Custom domain** 填入域名并保存，等待 HTTPS 证书签发即可。

4. 记得把 `_config.yml` 里的 `url` 改成 `https://你的域名`，再 push 一次。

## 主题定制（浅紫色）

紫色配色集中在 `_config.butterfly.yml` 的 `theme_color` 段，可直接修改：

```yaml
theme_color:
  enable: true
  main: "#8b7cf6"          # 主色（链接、按钮、标题）
  paginator: "#a78bfa"
  button_hover: "#7c3aed"
  # ... 其余见文件内注释
```

- 页面背景色：`background: '#f4f1fb'`（浅紫）
- 想要粒子/彩带动效，可开启 `canvas_ribbon` / `canvas_nest` / `fireworks` 段
- 头像、站点图标：替换 `source/` 下 `img/` 里的图片，或改 `favicon` / `avatar` 配置

## 常用插件（已安装）

| 插件 | 作用 |
| --- | --- |
| hexo-theme-butterfly | 主题 |
| hexo-renderer-pug / stylus | 主题渲染引擎 |
| hexo-wordcount | 字数统计与阅读时长 |
| hexo-generator-searchdb | 本地搜索 |
| hexo-generator-feed | RSS 订阅 |
| hexo-generator-sitemap | Google/Bing 站点地图 |
| hexo-generator-baidu-sitemap | 百度站点地图（国内 SEO） |

## 后续可选

- **评论系统**：推荐 [Giscus](https://giscus.app/)（基于 GitHub Discussions，免费），在 `_config.butterfly.yml` 的 `comments` 段配置
- **百度统计**：在 `baidu_analytics` 填入统计 ID
- **站点收录**：到百度/Google Search Console 提交 `baidusitemap.xml` / `sitemap.xml`

---

> 本站内容仅供学习交流，请勿用于非法用途。
