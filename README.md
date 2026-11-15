# 维克托 · 资源合集

正式域名：**https://vktxy.com/**
短链入口：**https://s.vktxy.com/s**（也可用 `https://vktxy.com/s`）

品牌：维克托的星隐 / VIKTOR · VEILED STAR。V 标记 + 星点 + 轨道弧线（STAR GOLD `#E6C17E` / MIDNIGHT `#0B1119`）。

## 线上链路（已实测）

| 入口 | 结果 |
|---|---|
| `https://vktxy.com/` | 200，Cloudflare Pages 直出（直连 0.46s） |
| `https://www.vktxy.com/` | 301 → `https://vktxy.com/` |
| `https://vktxy.com/s?S800` | 302 → `https://vktxy.com/?S800` |
| `https://s.vktxy.com/s?S800` | 302 → `https://vktxy.com/?S800` |
| `https://vktxy.com/group` | 302 → `https://vktxy.com/?ch=group` |
| `https://vktxy.com/nope` | 404 |
| `https://vktxy.com/icon-32.png` | 200（静态优先，functions 不拦） |
| `https://shortlink.huzhiquan386.workers.dev/tg01` | 302 → `https://vktxy.com/?ch=tg01`（KV） |

## 域名与 DNS

```
注册：vktxy.com（浪浪云代理，Cloud Yuqu LLC 注册局实体，.com）
NS：  annabel.ns.cloudflare.com / emerson.ns.cloudflare.com   ← 已切到 Cloudflare
Zone：9e5c893c1ecd88a7cab58bb6408edeb6  状态 active

DNS 记录
  CNAME  vktxy.com      → viktor-hub.pages.dev   proxied
  CNAME  www.vktxy.com  → viktor-hub.pages.dev   proxied
  （s.vktxy.com 由 Workers Custom Domain 自动创建）

SSL/TLS：Full (strict) · Always Use HTTPS · min TLS 1.2 · Automatic HTTPS Rewrites
```

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
│   ├── functions/[[path]].js 短链 + www→根域 301 + 404
│   └── dist/                 部署产物（.gitignore，由脚本生成）
├── scripts/
│   ├── deploy-pages.ps1      同步 dist + 部署 Pages
│   ├── bind-domain.ps1       新域名一键绑定（Pages 域 + Worker 域 + SSL）
│   └── cdp.mjs               CDP 小工具（goto/shot/eval/wait）
└── preview-*.png             864×1200 实际渲染
```

## 出口

| 卡片 | 落点 |
|---|---|
| 维克托影视站 | `https://viktorx.com/` |
| 企鹅粉丝群 | 群号 `1125266288`（官方 `qun.qq.com/universal-share` 邀请页，手机拉起 QQ、桌面可申请加群） |
| 限时\|网盘 1TB | `https://pan.quark.cn/s/3453b4fa25f6` |

## 改文案

`index.html` 顶部 `window.SITE` 是唯一文案源（标题 / 徽章 / 大标题 / 副标题 / 分组 / 卡片 / 页脚）。
换出口要改**两处**：`cards[i].href` 和 HTML 里那张卡的 `href="..."`。

## 渠道码

```
https://vktxy.com/?S800      → 出口 ?from=800
https://vktxy.com/?from=tg01 → ?from=tg01
https://vktxy.com/?ch=wx     → ?from=wx
```

只作用于 `http(s)`；`mqqapi://` 和 `qun.qq.com` 分享链接会被跳过（带签名，不能加参数）。

## 访问统计（私有）

```
https://vktxy.com/stats?key=<口令>
```

- 口令存在 KV 的 `admin:stats_key`，不在代码里、不在本仓库里（仓库是 Public）。取法：
  `npx wrangler kv key get --binding=LINKS --remote admin:stats_key`
- 换口令：`npx wrangler kv key put --binding=LINKS --remote admin:stats_key <新口令>`
- 不带 key 或 key 不对 → 返回和普通 404 完全一样的响应，外人看不出这个路径存在

计数 key（同一个 KV 命名空间）：

```
v:2026-11-15:800     当日落地页访问，渠道 800（来自 ?S800 / ?from=800）
c:2026-11-15:800     当日短链点击，渠道 800
```

| 指标 | 含义 | 记录点 |
|---|---|---|
| 访问 | 落地页（`/`）被打开 | Pages Functions |
| 点击 | 短链（`/s`、`/film`…）被点 | Pages Functions + Worker |

KV 没有原子自增，高并发下会丢少量计数（读-改-写），做渠道对比完全够用。

## 评论区用的极短链

最短路形态：**`https://vktxy.com/a1`**（20 字符），没有子域、没有 query。

```
https://vktxy.com/a1   → 302 → https://vktxy.com/?ch=a1
```

短码存在 KV 的 `link:<code>`，随时能加、能换目标、能删，不用重新部署。

| 操作 | 命令 |
|---|---|
| 新增 | `powershell -File scripts\new-link.ps1 -Code a4` |
| 指定渠道 | `powershell -File scripts\new-link.ps1 -Code a5 -Channel 视频5` |
| 指向别的页面 | `powershell -File scripts\new-link.ps1 -Code f1 -Target "https://vktxy.com/film"` |
| 改目标 | 同一个 code 再跑一次，覆盖 |
| 删除 | `npx wrangler kv key delete --binding=LINKS --remote link:a4` |

规则：1~6 位 `[a-z0-9]`。**点击和访问都会按短码本身归因**，所以 `/stats` 里每个码单独一行，能直接对比「哪条视频/哪个群带来的量」。

当前已建：`a1` `a2` `a3` `v1` `v2`。

> 长度下限由域名决定：`vktxy.com/` 占 10 个字符，短码再短也压不下多少。想更短只能换更短的域名（如 4~6 字符的 `.com`）。

## 发布

```bash
# 站点（同步 dist + 部署 Pages）
powershell -File scripts/deploy-pages.ps1

# Worker 版短链
npx wrangler deploy

# 加一条 KV 短码
npx wrangler kv key put --binding=LINKS --remote "tg02" "https://vktxy.com/?ch=tg02"

# 代码版本管理
git add -A && git commit -m "update" && git push
```

## 备用线路

- `https://viktor-hub.pages.dev/`（同一份 Pages 项目）
- `https://clover-9.github.io/`（GitHub Pages，Public 仓库自动构建）

哪条被墙或变慢就换另一条贴，内容一致。

## 已知的坑

1. **免费账号的 GitHub Pages 只认公开仓库**，转 Private 会立刻下线。
2. **仓库改名拿不到 `v.github.io`** —— 用户站点域名固定是 `<用户名>.github.io`。
3. **`workers.dev` 国内直连不通**（实测 TCP 失败），所以短链必须搭自有域名；`pages.dev` 可直连。
4. **Cloudflare 的 OAuth（wrangler login）权限不含 Zone/DNS**，`/zones` 会 403，改 DNS 要么用 API Token，要么在控制台点。
5. **Edge/Chrome 157 的 cookie 是 `v20` App-Bound 加密**，第三方进程读不出来；Cookie 文件还被独占锁，只能走 VSS 快照。
6. **`waves.webp` 必须上传**，否则亮色主题缺底图。
7. **一律 302**，301 会被浏览器和 CDN 长期缓存。
