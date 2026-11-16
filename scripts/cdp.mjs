// 极简 CDP 客户端：node scripts/cdp.mjs <cmd> [args]
//   goto <url>            导航并等待 load
//   shot <path>           截图
//   eval <js>             在页面里执行表达式，打印结果
//   wait <ms>             等待
//   html                  打印页面标题 + 当前 URL
import fs from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;
const BASE = `http://127.0.0.1:${PORT}`;

async function pageTarget() {
  const list = await (await fetch(`${BASE}/json/list`)).json();
  const pages = list.filter((t) => t.type === 'page');
  if (!pages.length) throw new Error('没有可用的 page target');
  return pages[0];
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 0;
    ws.onopen = () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const mid = ++id;
          pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params }));
          setTimeout(() => {
            if (pending.has(mid)) { pending.delete(mid); rej(new Error(`timeout ${method}`)); }
          }, 60000);
        });
      },
      close() { try { ws.close(); } catch {} },
    });
    ws.onerror = (e) => reject(e);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    };
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [cmd, ...rest] = process.argv.slice(2);
const t = await pageTarget();
const c = await connect(t.webSocketDebuggerUrl);

try {
  if (cmd === 'goto') {
    await c.send('Page.enable');
    await c.send('Page.navigate', { url: rest[0] });
    await sleep(Number(process.env.SETTLE || 6000));
    const { result } = await c.send('Runtime.evaluate', { expression: 'location.href + " | " + document.title', returnByValue: true });
    console.log(result.value);
  } else if (cmd === 'shot') {
    const { data } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(rest[0], Buffer.from(data, 'base64'));
    console.log('saved ' + rest[0]);
  } else if (cmd === 'eval') {
    const { result, exceptionDetails } = await c.send('Runtime.evaluate', {
      expression: rest.join(' '), returnByValue: true, awaitPromise: true,
    });
    if (exceptionDetails) { console.error('EXCEPTION', JSON.stringify(exceptionDetails.exception?.description || exceptionDetails)); process.exitCode = 1; }
    else console.log(typeof result.value === 'string' ? result.value : JSON.stringify(result.value, null, 2));
  } else if (cmd === 'pdf') {
    // node cdp.mjs pdf <out.pdf> [paperWidthInch] [paperHeightInch]
    const [out, w, h] = rest;
    const { data } = await c.send('Page.printToPDF', {
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      paperWidth: Number(w || 4.06),
      paperHeight: Number(h || 11.8),
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    });
    fs.writeFileSync(out, Buffer.from(data, 'base64'));
    console.log('saved ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
  } else if (cmd === 'wait') {
    await sleep(Number(rest[0] || 2000));
    console.log('waited');
  } else if (cmd === 'html') {
    const { result } = await c.send('Runtime.evaluate', { expression: 'location.href + " | " + document.title', returnByValue: true });
    console.log(result.value);
  } else {
    console.log('unknown cmd');
  }
} finally {
  c.close();
}
