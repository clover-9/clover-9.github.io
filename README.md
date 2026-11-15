# 维克托 · 资源合集 — 落地页

线上地址：**https://clover-9.github.io/**（GitHub Pages，仓库 `clover-9/clover-9.github.io`）

品牌：维克托的星隐 / VIKTOR · VEILED STAR。图标为 V 标记 + 星点 + 轨道弧线（STAR GOLD `#E6C17E` / MIDNIGHT `#0B1119`）。

## 结构

```
短链（Cloudflare Worker）
      ↓ 302
clover-9.github.io        ← 本仓库：纯静态壳页
      ↓ 点卡片
维克托影视站 / QQ 群 / 夸克网盘
```

| 文件 | 作用 |
|---|---|
| `index.html` | 落地页本体，单文件、零外部依赖（不引 CDN、不引统计脚本） |
| `waves.webp` | 亮色主题的紫色波浪底图（暗色下 `display:none` 不加载），**漏传会导致亮色变紫底紫字** |
| `_worker.js` | Cloudflare Worker 短链网关：短码 → 302，渠道码透传 + UA/来源门控 |
| `site.webmanifest` | PWA 清单（安卓「添加到桌面」用） |
| `favicon.ico` `icon-16/32/48/64/180/192/512.png` | 图标全套，均已替换为 V 标记 |
| `viktor-star-1024.png` | 分享卡（og:image）用大图 |

## 出口

| 卡片 | 落点 |
|---|---|
| 维克托影视站 | `https://viktorx.com/` |
| 企鹅粉丝群 | 群号 `1125266288`，`mqqapi://` 拉起 QQ + `qun.qq.com` 兜底 |
| 限时\|网盘 1TB | `https://pan.quark.cn/s/3453b4fa25f6` |

**QQ 群为什么这样做**：裸群号不能当链接。卡片 `href` 用 `mqqapi://card/show_pslcard?...&uin=1125266288&card_type=group`，手机上点直接拉起群资料卡；`data-fallback` 兜底到 `qun.qq.com/joinGroup.html?gc=1125266288`，桌面点击或 scheme 拉不起来时 1.5 秒后自动跳过去。

想桌面也能一键加群：手机 QQ → 群设置 → 分享群 → 复制链接，拿到 `https://qm.qq.com/q/xxxxx`，把它同时填进 `href` 和 `data-fallback` 即可（`href` 里那段 `mqqapi://` 可以删掉）。

## 改文案：只动一处

`index.html` 顶部有 `window.SITE` 配置块，页面所有文字、卡片、标签配色都从它渲染：

```js
window.SITE = {
  title:    '维克托 · 资源合集',   // 标签页标题
  badge:    '资源站运行中',
  brand:    '维克托资源库',        // 大标题
  brandIcon: null,                // 已改用 SVG V 图标，留空
  slogan:   '网盘资源 · 游戏 · 影视 · 软件 · DLC 一应俱全',
  chip:     '资源均免费分享 · 无任何套路',
  go:       '前往',
  groups:   ['资源合集（每日更新）', '资源频道'],
  cards:    [ /* title / note / href / tags */ ],
  footer:   ['维克托 · 资源合集站', '加群 1125266288 · 请勿用于商业用途'],
};
```

- `tags` 配色：`r` 紫粉渐变 / `v` 品红描边 / `n` 紫色描边；`v opt` 在窄屏自动隐藏
- 增删卡片：同时改 `cards` 数组项 **和** 对应的 `<a class="item">` 节点
- 换出口要改**两处**：`cards[i].href` 和 HTML 里那张卡的 `href="..."`

## 渠道码透传

第一跳带上的渠道码，会由页面脚本自动拼到每个出口：

```
https://clover-9.github.io/?S800        → 出口变成 ?from=800
https://clover-9.github.io/?from=tg01   → ?from=tg01
https://clover-9.github.io/?ch=wx       → ?from=wx
```

只对 `http(s)` 链接生效，`mqqapi://` 这类 scheme 会被跳过。

## 部署与更新

```bash
git add -A && git commit -m "update" && git push
```

Push 后 GitHub Pages 约 30~60 秒重建。查看状态：仓库 Settings → Pages，或 `curl -sI https://clover-9.github.io/ | head -3`。

## 短链层（Cloudflare Worker）

```bash
npm i -g wrangler
wrangler login
wrangler deploy _worker.js --name shortlink
```

然后：Workers → shortlink → Settings → 绑 KV 命名空间 `LINKS`；Triggers → Custom Domains 绑 `s.你的域名.com`。

`_worker.js` 里的 `TABLE` 已经是占位，把 `https://your-name.github.io/link/` 换成 `https://clover-9.github.io/` 即可；量大就改用 KV，后台随时增删不用重新部署。

## 已知的坑

1. **GitHub Pages 设不了 HTTP 响应头**，出不了 302，所以壳页只能靠 HTML/JS 跳转——这反而成了最好的伪装。
2. **一律用 302，别用 301**。301 会被浏览器和 CDN 长期缓存，改了目标老访客还在跳旧地址。
3. **`waves.webp` 必须上传**，否则亮色主题缺底图。
4. **`file://` 下 localStorage 可能被拦**，主题切换会退回默认暗色，属正常。
5. **渠道码别加在 `mqqapi://` 上**，脚本已做 scheme 白名单。
