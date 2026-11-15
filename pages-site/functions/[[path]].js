/**
 * Cloudflare Pages Functions —— 短链兜底
 *
 * 为什么放在 Pages 上：workers.dev 在国内直连不通，pages.dev 通。
 * 于是短链同时有两个入口，任选其一贴在评论区：
 *   https://viktor-hub.pages.dev/s?S800     ← 本文件（国内可直连）
 *   https://shortlink.huzhiquan386.workers.dev/s?S800  ← 绑了自有域名后再用
 *
 * 静态资源优先：TABLE 里没有的路径一律 next()，交给 dist 里的文件。
 */

const BASE = 'https://viktor-hub.pages.dev/';

const TABLE = {
  s:     BASE,
  film:  BASE + '?ch=film',
  group: BASE + '?ch=group',
  pan:   BASE + '?ch=pan',
};

export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.pathname.replace(/^\/+/, '').replace(/\/$/, '');

  const target = TABLE[code];
  if (!target) return ctx.next();          // 不是短码 → 静态文件 / 404

  // 渠道码透传：?S800 → ?ch=S800 之外，直接把原 query 拼上去
  const qs = url.search.slice(1);
  const dest = qs ? target + (target.includes('?') ? '&' : '?') + qs : target;

  return Response.redirect(dest, 302);
};
