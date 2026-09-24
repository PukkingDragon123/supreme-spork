// Screenshot helper for development: node scripts/shot.mjs <url> <out.png> [width] [height] [dpr]
import { chromium } from 'playwright'
const [url, out, w = '420', h = '860', dpr = '2'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr })
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(process.env.WAIT ?? 600))
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' })
await browser.close()
