/**
 * Cloudflare Pages Functions —— 短链 + www 规范化 + 私有统计
 *
 * 公开行为：
 *   https://vktxy.com/xxx          → 落地页（静态）
 *   https://vktxy.com/s?S800       → 302 → https://vktxy.com/?S800
 *   https://vktxy.com/a1           → 302 → https://vktxy.com/?ch=a1（KV 极短码）
 *   https://www.vktxy.com/xxx      → 301 → https://vktxy.com/xxx
 *   https://vktxy.com/nope         → 404
 *
 * 私有行为（只有拿到 key 的人能看）：
 *   https://vktxy.com/stats?key=XXX → 统计页
 *   没带 key 或 key 不对 → 和普通 404 一模一样
 *
 * 计数存 KV（binding STATS）：
 *   v:2026-11-15:800    真实访问    c:2026-11-15:800    真实点击
 *   bv:2026-11-15:800   爬虫访问    bc:2026-11-15:800   爬虫点击
 *   admin:stats_key     统计页口令
 */

const BASE = 'https://vktxy.com/';
const APEX = 'vktxy.com';

const TABLE = {
  s:     BASE,
  film:  BASE + '?ch=film',
  group: BASE + '?ch=group',
  pan:   BASE + '?ch=pan',
};

// clean URL 的静态页面（Pages 会把 /hub.html 重定向到 /hub）
const STATIC_PAGES = new Set(['hub']);

// 疑似爬虫 / 监控 / 脚本的 UA 特征
const BOT_RE = /bot|crawl|spider|headless|python|curl|wget|scrapy|preview|monitor|uptime|pingdom|bytespider|petalbot|semrush|ahrefs|mj12|facebookexternalhit|telegrambot|slackbot|pinterest/i;

// ---------- 工具 ----------
const today = () => new Date().toISOString().slice(0, 10);
const isBot = (ua) => BOT_RE.test(ua || '');

function channelOf(url) {
  const q = url.searchParams;
  let ch = q.get('from') || q.get('ch') || q.get('S') || q.get('s');
  if (!ch) {
    // ?S800 这种不带等号的写法，遍历 key 找 S数字
    for (const [k] of q) {
      if (/^[Ss][0-9A-Za-z]{1,12}$/.test(k)) { ch = k.slice(1); break; }
    }
  }
  return (ch || 'direct').slice(0, 24);
}

async function bump(env, key) {
  if (!env.STATS) return;
  try {
    const cur = parseInt((await env.STATS.get(key)) || '0', 10);
    await env.STATS.put(key, String(cur + 1));
  } catch (e) { /* KV 写限流，忽略 */ }
}

const notFound = () => new Response('404 Not Found', {
  status: 404,
  headers: { 'content-type': 'text/plain; charset=utf-8' },
});

// ---------- 统计页 ----------
async function statsPage(env, days = 7) {
  const list = await env.STATS.list({ prefix: '' });
  const keys = list.keys
    .map((k) => k.name)
    .filter((n) => /^(bv|bc|v|c):\d{4}-\d{2}-\d{2}:/.test(n));

  const data = {};
  for (const k of keys) {
    const m = k.match(/^(bv|bc|v|c):(\d{4}-\d{2}-\d{2}):(.*)$/);
    if (!m) continue;
    const [, kind, d, ch] = m;
    const n = parseInt((await env.STATS.get(k)) || '0', 10);
    data[d] = data[d] || {};
    data[d][ch] = data[d][ch] || { v: 0, c: 0, b: 0 };
    if (kind === 'v') data[d][ch].v += n;
    else if (kind === 'c') data[d][ch].c += n;
    else data[d][ch].b += n;
  }

  const dates = Object.keys(data).sort().reverse().slice(0, days);
  let body = '';
  for (const d of dates) {
    const chs = Object.keys(data[d]).sort((a, b) => {
      // direct 排最后
      if (a === 'direct') return 1;
      if (b === 'direct') return -1;
      return a.localeCompare(b);
    });
    const sumV = chs.reduce((a, c) => a + data[d][c].v, 0);
    const sumC = chs.reduce((a, c) => a + data[d][c].c, 0);
    const sumB = chs.reduce((a, c) => a + data[d][c].b, 0);
    body += `<tr class="day"><td>${d}</td><td>${sumV}</td><td>${sumC}</td><td class="bot">${sumB}</td><td>合计</td></tr>`;
    for (const ch of chs) {
      const r = data[d][ch];
      body += `<tr><td>${d}</td><td>${r.v}</td><td>${r.c}</td><td class="bot">${r.b}</td><td>${ch}</td></tr>`;
    }
  }
  if (!body) body = '<tr><td colspan="5" class="empty">还没有数据</td></tr>';

  return new Response(`<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>统计</title>
<style>
 body{background:#07080f;color:#eef0ff;font:14px/1.6 -apple-system,"Microsoft YaHei",sans-serif;padding:24px}
 h1{font-size:18px;margin:0 0 4px}p{color:#8b90b5;margin:0 0 20px;font-size:12px;line-height:1.8}
 table{border-collapse:collapse;width:100%;max-width:820px}
 th,td{padding:8px 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,.08);font-variant-numeric:tabular-nums}
 th{color:#8b90b5;font-weight:500;font-size:12px}
 tr.day td{background:rgba(34,211,238,.06);font-weight:600}
 td.bot{color:#6b7280;font-size:13px}
 tr.day td.bot{color:#9aa3b2}
 td.empty{color:#8b90b5;text-align:center;padding:32px}
</style></head><body>
<h1>维克托 · 访问统计</h1>
<p>访问 = 落地页打开次数 · 点击 = 短链被点次数 · 爬虫 = UA 命中 bot/监控特征，不代表真人<br>
渠道来自 ?S800 / ?from= / ?ch=；direct 是没带渠道码的访问（含少量爬虫与自测）</p>
<table><thead><tr><th>日期</th><th>访问</th><th>点击</th><th>爬虫</th><th>渠道</th></tr></thead>
<tbody>${body}</tbody></table>
</body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- 入口 ----------
export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url);

  // www → 根域
  if (url.hostname === `www.${APEX}`) {
    return Response.redirect(new URL(url.pathname + url.search, BASE).toString(), 301);
  }

  const code = url.pathname.replace(/^\/+/, '').replace(/\/$/, '');
  const bot = isBot(ctx.request.headers.get('user-agent'));

  // 私有统计页
  if (code === 'stats') {
    if (!ctx.env.STATS) return notFound();
    const given = url.searchParams.get('key') || '';
    const real = await ctx.env.STATS.get('admin:stats_key');
    if (!real || given !== real) return notFound();
    return statsPage(ctx.env, 7);
  }

  // 短链
  const target = TABLE[code];
  if (target) {
    const ch = channelOf(url);
    ctx.waitUntil(bump(ctx.env, `${bot ? 'bc' : 'c'}:${today()}:${ch}`));
    const qs = url.search.slice(1);
    return Response.redirect(qs ? target + (target.includes('?') ? '&' : '?') + qs : target, 302);
  }

  // 极短码（KV 里的 link:<code>）：评论区用的就是这种
  if (/^[a-z0-9]{1,6}$/i.test(code) && ctx.env.STATS) {
    const k = code.toLowerCase();
    const dst = await ctx.env.STATS.get(`link:${k}`);
    if (dst) {
      ctx.waitUntil(bump(ctx.env, `${bot ? 'bc' : 'c'}:${today()}:${k}`));
      const qs = url.search.slice(1);
      return Response.redirect(qs ? dst + (dst.includes('?') ? '&' : '?') + qs : dst, 302);
    }
  }

  // 落地页访问（只有根路径算一次访问）
  if (code === '') {
    ctx.waitUntil(bump(ctx.env, `${bot ? 'bv' : 'v'}:${today()}:${channelOf(url)}`));
    return ctx.next();
  }

  // 静态资源优先（带扩展名）
  if (/\.[a-z0-9]{2,5}$/i.test(code)) return ctx.next();

  // clean URL 的静态页面白名单
  if (STATIC_PAGES.has(code.toLowerCase())) return ctx.next();

  return notFound();
};
