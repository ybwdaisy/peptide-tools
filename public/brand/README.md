# PeptideTools — 周期连接

用户于 2026-11-16 选定的第三版标志。三段开环与右侧短延伸保持选定稿轮廓，采用平面色彩，不附加动效或状态含义。

| 资源 | 用途 |
|---|---|
| `mark.svg` / `mark.png` | 深蓝独立标志，PNG 为透明 1024×1024 |
| `mark-inverse.svg` / `mark-inverse.png` | 白色独立标志，适合深色底 |
| `logo.svg` / `logo.png` | 标志与 PeptideTools 字标，PNG 为透明 880×160 |
| `logo-inverse.svg` / `logo-inverse.png` | 反白组合字标 |
| `../favicon.svg` / `../favicon.ico` | 浏览器图标；ICO 内含原生 16、32、48px |
| `../favicon-16x16.png` / `../favicon-32x32.png` | 独立小尺寸图标 |
| `../apple-touch-icon.png` | 不透明、满版 180×180 iOS 主屏图标；由 iOS 添加圆角 |

标志色 `#205b7a`，字标和图标底色 `#10283d`，反白 `#ffffff`。页头以 32px 图形与真实文本组合，保持原有主页链接和可访问名称；组合 SVG 内嵌 Schibsted Grotesk 字体，无远程字体请求。字体遵循随附 `FONT-LICENSE.txt`，SVG 元数据中也包含许可。

从保留的选定稿重建：

```sh
node scripts/build-cycle-logo.mjs
node scripts/generate-icons.mjs
npm run build
node scripts/verify-cycle-logo.mjs
```

最后一步使用本地 `http://127.0.0.1:4333` 静态预览，导出透明 PNG、检查页头并保存验证图。所有源脚本位于仓库根目录的 `scripts/`。
