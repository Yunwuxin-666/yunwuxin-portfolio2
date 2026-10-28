# 云无心作品集 2.0

React + Vite 作品集，包含首页轮播、项目详情和滚动卡片。

## 本地运行

```bash
npm ci
npm run dev
```

## 内容与备份

`public/portfolio-defaults.json` 和 `public/portfolio-media/` 包含发布时的作品内容。用户在页面中的后续编辑保存于当前浏览器的本地存储，不会自动同步给其他访客；可以通过项目详情顶部的“导出备份”保存数据。`作品集素材/` 保存项目原始素材。

## 发布

推送到 main 后，GitHub Actions 会构建 GitHub Pages。仓库的 Pages 来源应设置为 GitHub Actions。页面路径为 `/yunwuxin-portfolio2/`。
