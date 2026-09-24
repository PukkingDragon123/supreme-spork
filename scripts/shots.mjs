// Multi-screenshot helper: node scripts/shots.mjs <outdir> name=url[@wait] ...
import { chromium } from 'playwright'
const [outdir, ...specs] = process.argv.slice(2)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
for (const spec of specs) {
  const eq = spec.indexOf('=')
  const name = spec.slice(0, eq)
  const rest = spec.slice(eq + 1)
  const at = rest.lastIndexOf('@')
  const url = at > 0 ? rest.slice(0, at) : rest
  const wait = at > 0 ? rest.slice(at + 1) : undefined
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}] console`, m.text()) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(Number(wait ?? 1500))
  console.log(name, await page.evaluate(() => (document.querySelector('.activity') ? 'activity' : 'none') + ' ' + location.search))
  await page.screenshot({ path: `${outdir}/${name}.png` })
  await page.close()
}
await browser.close()
