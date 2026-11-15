/**
 * 短链 / 跳转网关 —— Cloudflare Worker（第一跳，负责出 302）
 *
 * 部署：Cloudflare Dashboard → Workers & Pages → Create Worker → 粘贴本文件 → Deploy
 * 绑定：Workers → 你的 Worker → Settings → Variables → KV Namespace 绑定 LINKS
 * 域名：Workers → Triggers → Custom Domains 绑 s.你的域名.com（不要用裸域名）
 *
 * 用法：https://s.你的域名.com/lY1j7Xh?S800
 *      → 302 → https://your-name.github.io/link/?S800（渠道码原样透传）
 */

// ── 方式 A：内置映射表（改代码即生效，适合十几条以内）────────────────
const TABLE = {
  // 短码 → 落地页。正式域名：https://vktxy.com/
  's':      'https://vktxy.com/',
  'film':   'https://vktxy.com/?ch=film',
  'group':  'https://vktxy.com/?ch=group',
};

// ── 方式 B：KV（适合成百上千条，后台随时增删，不用重新部署）──────────
// 写入：await env.LINKS.put('lY1j7Xh', 'https://your-name.github.io/link/')
// 附加 TTL：await env.LINKS.put('lY1j7Xh', '...', { expirationTtl: 604800 })

const NOT_FOUND = '{"code":-404,"message":"啥都木有"}';

// ---- 统计（与 Pages Functions 共用同一个 KV 命名空间）----
const today = () => new Date().toISOString().slice(0, 10);

function channelOf(url) {
  const q = url.searchParams;
  let ch = q.get('from') || q.get('ch') || q.get('S') || q.get('s');
  if (!ch) {
    for (const [k] of q) {
      if (/^[Ss][0-9A-Za-z]{1,12}$/.test(k)) { ch = k.slice(1); break; }
    }
  }
  return (ch || 'direct').slice(0, 24);
}

async function bump(env, key) {
  if (!env.LINKS) return;
  try {
    const cur = parseInt((await env.LINKS.get(key)) || '0', 10);
    await env.LINKS.put(key, String(cur + 1));
  } catch (e) { /* KV 写限流，忽略 */ }
}

export default {
  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const code = url.pathname.replace(/^\/+/, '').split('/')[0];
    const ua   = request.headers.get('user-agent') || '';
    const ref  = request.headers.get('referer') || '';

    if (!code) return json(NOT_FOUND, 404);

    // 查表：先 KV，再内置表
    let target = null;
    if (env && env.LINKS) target = await env.LINKS.get(code);
    if (!target) target = TABLE[code] || null;
    if (!target) return json(NOT_FOUND, 404);

    // ── 可选 1：来源门控 —— 只放行 App 内置浏览器，普通浏览器看到无关页面 ──
    // const fromApp = /bili|BiliApp|MicroMessenger|QQ\//i.test(ua) || /bilibili\.com/.test(ref);
    // if (!fromApp) return new Response('<h1>404</h1>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });

    // ── 可选 2：UA 黑名单 —— 爬虫/审核机直接给 404，省得落地页被爬 ──
    // if (/spider|bot|crawler|headless|python-requests|curl|wget|preview/i.test(ua)) {
    //   return new Response('Not Found', { status: 404 });
    // }

    // 渠道码透传：?S800 / ?from=xxx 原样带到落地页
    const params = url.search.slice(1);           // 去掉 "?"
    const dest = params ? target + (target.includes('?') ? '&' : '?') + params : target;

    // 记一次点击（异步，不阻塞跳转）
    if (ctx && ctx.waitUntil) ctx.waitUntil(bump(env, `c:${today()}:${channelOf(url)}`));

    // 一定是 302：301 会被浏览器和 CDN 长期缓存，改了目标用户还在跳旧地址
    return Response.redirect(dest, 302);
  },
};

function json(body, status) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
