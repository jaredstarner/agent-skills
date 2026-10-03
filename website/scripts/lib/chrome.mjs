/**
 * Minimal headless Chrome driver over the DevTools protocol (Node 22+, no
 * dependencies). Shared by screenshot.mjs, og-image.mjs, and favicon.mjs.
 *
 * Driving Chrome over CDP instead of `chrome --screenshot` gives true small
 * viewports (the CLI window will not go below about 500px wide), media
 * emulation (color scheme, reduced motion), full-page captures, and script
 * injection.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const found = (CANDIDATES[process.platform] ?? []).find((p) => existsSync(p));
  if (!found) throw new Error('Chrome not found. Set the CHROME env var to the browser executable.');
  return found;
}

/** Turn a URL or a local file path into a URL Chrome can open. */
export function toUrl(target) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith('data:') || target === 'about:blank') return target;
  return pathToFileURL(isAbsolute(target) ? target : resolve(target)).href;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPort(dir, child) {
  const file = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
    if (existsSync(file)) {
      const [port] = readFileSync(file, 'utf8').split('\n');
      if (port) return Number(port);
    }
    await sleep(50);
  }
  throw new Error('Timed out waiting for Chrome to start');
}

/**
 * Launch Chrome and return a browser handle:
 *   const browser = await launch();
 *   const page = await browser.newPage();
 *   await page.setViewport(390, 844);
 *   await page.goto(url);
 *   const png = await page.screenshot();
 *   await browser.close();
 */
export async function launch({ chrome = findChrome() } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'site-chrome-'));
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${dir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-lcd-text',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let ws;
  try {
    const port = await waitForPort(dir, child);
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('Could not connect to Chrome'));
    });
  } catch (err) {
    child.kill();
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }

  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(`${msg.error.message} ${msg.error.data ?? ''}`.trim())) : res(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  // The returned promise may lose a race and reject later; mark it handled so a
  // late timeout cannot crash Node before browser.close() cleans up.
  const once = (method, sessionId, timeout = 30000) => {
    const p = new Promise((res, rej) => {
      const timer = setTimeout(() => {
        listeners.delete(fn);
        rej(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      const fn = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          clearTimeout(timer);
          listeners.delete(fn);
          res(msg.params);
        }
      };
      listeners.add(fn);
    });
    p.catch(() => {});
    return p;
  };

  async function newPage() {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    await s('Page.enable');
    await s('Runtime.enable');
    let viewport = { width: 1280, height: 800 };

    return {
      send: s,
      async setViewport(width, height = 800, { scale = 1, mobile = width < 600 } = {}) {
        viewport = { width, height };
        await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
      },
      /** features: { 'prefers-color-scheme': 'dark', 'prefers-reduced-motion': 'reduce' } */
      async emulateMedia(features = {}) {
        await s('Emulation.setEmulatedMedia', {
          features: Object.entries(features).map(([name, value]) => ({ name, value })),
        });
      },
      async transparentBackground() {
        await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
      },
      /** Run a script before any page script on every navigation. */
      async injectOnLoad(source) {
        await s('Page.addScriptToEvaluateOnNewDocument', { source });
      },
      async goto(target, { timeout = 30000 } = {}) {
        const loaded = once('Page.loadEventFired', sessionId, timeout);
        // Some navigations (e.g. a bare image) never answer Page.navigate; the load timeout bounds it.
        const { errorText } = await Promise.race([s('Page.navigate', { url: toUrl(target) }), loaded.then(() => ({}))]);
        if (errorText) throw new Error(`Navigation failed: ${errorText} (${target})`);
        await loaded;
      },
      async setContent(html) {
        const { frameTree } = await s('Page.getFrameTree');
        const loaded = once('Page.loadEventFired', sessionId);
        await s('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
        await Promise.race([loaded, sleep(1000)]);
      },
      async evaluate(expression) {
        const { result, exceptionDetails } = await s('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (exceptionDetails) throw new Error(`Script error: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
        return result.value;
      },
      /** Wait for web fonts, then the given extra milliseconds. */
      async settle(ms = 0) {
        await this.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true');
        if (ms) await sleep(ms);
      },
      /**
       * PNG buffer. fullPage captures the whole document height; clip is
       * { x, y, width, height } in CSS pixels.
       */
      async screenshot({ fullPage = false, clip } = {}) {
        const params = { format: 'png' };
        if (clip) {
          params.clip = { ...clip, scale: 1 };
        } else if (fullPage) {
          const { cssContentSize } = await s('Page.getLayoutMetrics');
          params.clip = { x: 0, y: 0, width: viewport.width, height: Math.ceil(cssContentSize.height), scale: 1 };
          params.captureBeyondViewport = true;
        }
        const { data } = await s('Page.captureScreenshot', params);
        return Buffer.from(data, 'base64');
      },
      async close() {
        await send('Target.closeTarget', { targetId }).catch(() => {});
      },
    };
  }

  async function close() {
    await send('Browser.close').catch(() => {});
    ws.close();
    for (let i = 0; i < 40 && child.exitCode === null; i++) await sleep(50);
    if (child.exitCode === null) child.kill();
    // Chrome can hold profile files for a moment after exit on Windows.
    for (let i = 0; i < 10; i++) {
      try {
        rmSync(dir, { recursive: true, force: true });
        return;
      } catch {
        await sleep(200);
      }
    }
    console.warn(`Could not remove temp profile ${dir}; delete it manually.`);
  }

  return { newPage, close };
}

/** Parse --flag value / --flag=value / --switch arguments. */
export function parseArgs(argv, { booleans = [] } = {}) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    let value;
    if (inline !== undefined) value = inline;
    else if (booleans.includes(key)) value = true;
    else value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    if (key in opts) opts[key] = [].concat(opts[key], value);
    else opts[key] = value;
  }
  return { opts, positional };
}

export const list = (v) => [].concat(v ?? []).flatMap((s) => String(s).split(',')).map((s) => s.trim()).filter(Boolean);
