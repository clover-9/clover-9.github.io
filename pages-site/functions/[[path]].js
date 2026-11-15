/**
 * Cloudflare Pages Functions —— 短链 + www 规范化
 *
 * 正式域名：vktxy.com
 *   https://vktxy.com/s?S800      → 302 → https://vktxy.com/?S800
 *   https://www.vktxy.com/xxx     → 301 → https://vktxy.com/xxx
 *
 * 静态资源优先：TABLE 里没有的路径一律 next()，交给 dist 里的文件。
 */

const BASE = 'https://vktxy.com/';
const APEX = 'vktxy.com';

const TABLE = {
  s:     BASE,
  film:  BASE + '?ch=film',
  group: BASE + '?ch=group',
  pan:   BASE + '?ch=pan',
};

export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url);

  // www → 根域（301，永久，避免重复收录）
  if (url.hostname === `www.${APEX}`) {
    const dest = new URL(url.pathname + url.search, BASE);
    return Response.redirect(dest.toString(), 301);
  }

  const code = url.pathname.replace(/^\/+/, '').replace(/\/$/, '');
  const target = TABLE[code];
  if (!target) {
    // 带扩展名的交给静态资源（icon-32.png、waves.webp…）
    if (code === '' || /\.[a-z0-9]{2,5}$/i.test(code)) return ctx.next();
    // 其余当作不存在的短码，直接 404
    return new Response('404 Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const qs = url.search.slice(1);
  const dest = qs ? target + (target.includes('?') ? '&' : '?') + qs : target;

  return Response.redirect(dest, 302);
};
