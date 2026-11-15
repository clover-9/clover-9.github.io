# 维克托 · 资源合集 — 双线路落地页

品牌：维克托的星隐 / VIKTOR · VEILED STAR。V 标记 + 星点 + 轨道弧线（STAR GOLD `#E6C17E` / MIDNIGHT `#0B1119`）。

## 线上地址（两条线，同一份代码）

| 线路 | 地址 | 直连实测 |
|---|---|---|
| GitHub Pages（主） | https://clover-9.github.io/ | 200，0.14~1.4s |
| Cloudflare Pages（备，国内更稳） | https://viktor-hub.pages.dev/ | 200，0.47s |

两份内容完全一致，哪条被墙/变慢就换另一条贴。GitHub 仓库保持 **Public**（免费账号的 Pages 只认公开仓库）。

## 短链

| 入口 | 地址 | 状态 |
|---|---|---|
| Pages Functions | `https://viktor-hub.pages.dev/s` | ✅ 可用，国内直连通 |
| Worker（KV） | `https://shortlink.huzhiquan386.workers.dev/s` | ⚠️ 功能正常，但 `workers.dev` 国内直连不通，**待绑自有域名** |

已验证的跳转：

```
https://viktor-hub.pages.dev/s         → 302 → https://viktor-hub.pages.dev/
https://viktor-hub.pages.dev/s?S800    → 302 → https://viktor-hub.pages.dev/?S800
https://viktor-hub.pages.dev/film      → 302 → https://viktor-hub.pages.dev/?ch=film
https://viktor-hub.pages.dev/nope      → 静态资源/404（不拦）
https://shortlink.huzhiquan386.workers.dev/tg01 → 302 → https://clover-9.github.io/?ch=tg01
```

**绑自有域名后**（需域名 NS 托管到 Cloudflare）：
Workers → shortlink → Triggers → Custom Domains → `s.你的域名.com`。之后短链就是 `https://s.你的域名.com/s`。

## 目录

```
pansou-link/
├── index.html                落地页本体（单文件、零外部依赖）
├── waves.webp                亮色主题波浪底图（漏传 → 亮色变紫底紫字）
├── site.webmanifest          PWA 清单
├── favicon.ico / icon-16…512 / apple-touch-icon   V 标记图标全套
├── viktor-star-1024.png      分享卡（og:image）
├── _worker.js                Worker 版短链（KV + 渠道码透传 + UA 门控）
├── wrangler.toml             Worker 配置（name=shortlink, KV=LINKS）
├── pages-site/               Cloudflare Pages 子项目
│   ├── wrangler.toml         name=viktor-hub, pages_build_output_dir=dist
│   ├── functions/[[path]].js 短链兜底（/s /film /group /pan）
│   └── dist/                 部署产物（.gitignore，由脚本生成）
├── scripts/deploy-pages.ps1  同步 dist + 部署 Pages
└── preview-*.png             864×1200 实际渲染
```

## 出口

| 卡片 | 落点 |
|---|---|
| 维克托影视站 | `https://viktorx.com/` |
| 企鹅粉丝群 | 群号 `1125266288`（`mqqapi://` 拉起 QQ，桌面走 `qun.qq.com` 兜底） |
| 限时\|网盘 1TB | `https://pan.quark.cn/s/3453b4fa25f6` |

想桌面也能一键加群：手机 QQ → 群设置 → 分享群 → 复制链接，得到 `https://qm.qq.com/q/xxxxx`，同时填进 `href` 和 `data-fallback`。

## 改文案

`index.html` 顶部 `window.SITE` 是唯一文案源：

```js
window.SITE = {
  title:    '维克托 · 资源合集',
  badge:    '资源站运行中',
  brand:    '维克托资源库',
  brandIcon: null,                 // 已改用 SVG V 图标
  slogan:   '网盘资源 · 游戏 · 影视 · 软件 · DLC 一应俱全',
  chip:     '资源均免费分享 · 无任何套路',
  go:       '前往',
  groups:   ['资源合集（每日更新）', '资源频道'],
  cards:    [ /* title / note / href / tags */ ],
  footer:   ['维克托 · 资源合集站', '加群 1125266288 · 请勿用于商业用途'],
};
```

换出口要改**两处**：`cards[i].href` 和 HTML 里那张卡的 `href="..."`。

## 渠道码

```
?S800 → 出口 ?from=800    ?from=tg01 → ?from=tg01    ?ch=wx → ?from=wx
```

只作用于 `http(s)`，`mqqapi://` 会被跳过。

## 发布

```bash
# GitHub Pages（推了就自动构建，约 30~60 秒）
git add -A && git commit -m "update" && git push

# Cloudflare Pages（同步 dist + 部署）
powershell -File scripts/deploy-pages.ps1

# Worker 版短链
npx wrangler deploy

# 往 KV 加一条短码
npx wrangler kv key put --binding=LINKS --remote "tg02" "https://viktor-hub.pages.dev/?ch=tg02"
```

## 已知的坑

1. **免费账号的 GitHub Pages 只认公开仓库**。仓库转 Private 后 Pages 会立即下线（要 Private + Pages 得 GitHub Pro $4/月），所以这个仓库保持 Public。
2. **仓库改名拿不到 `v.github.io`**。GitHub 用户站点域名的格式是 `<你的用户名>.github.io`，仓库名叫 `v.github.io` 只会变成项目页 `clover-9.github.io/v.github.io/`，而 `v.github.io` 属于另一个叫 `v` 的账号。
3. **`workers.dev` 国内直连不通**（实测 TCP 失败），短链先走 `pages.dev`；要贴到平台评论区，最终还是要自有域名。
4. **GitHub Pages 设不了响应头**，出不了 302，壳页只能客户端跳转。
5. **一律 302**，301 会被浏览器和 CDN 长期缓存，改目标后老访客还跳旧地址。
6. **`waves.webp` 必须上传**，否则亮色主题缺底图。
7. **Pages 不认自定义 wrangler 配置路径**，所以 Pages 单独一个子目录。
8. 渠道码别加在 `mqqapi://` 和 QQ 群分享链接上，脚本已做白名单跳过。
