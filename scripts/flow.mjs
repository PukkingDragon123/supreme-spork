// Dev helper: node scripts/flow.mjs <url> <out.png> [step ...]
// Steps: "click:<text>" clicks a button/img by visible text or alt, "wait:<ms>", "shot:<file>".
// The daily login reward is dismissed automatically.
import { chromium } from 'playwright'
const [url, out, ...steps] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const claim = page.getByText('รับรางวัลวันนี้')
if (await claim.count()) {
  await claim.first().click({ force: true })
  await page.waitForTimeout(400)
  const ok = page.getByText(/ไปวัดกันเลย|สาธุ/)
  if (await ok.count()) await ok.first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(300)
}
for (const s of steps) {
  const [k, ...rest] = s.split(':')
  const v = rest.join(':')
  if (k === 'wait') await page.waitForTimeout(+v)
  else if (k === 'shot') await page.screenshot({ path: v })
  else if (k === 'click') {
    const loc = page.locator(`button:has(img[alt*="${v}"]), button:has-text("${v}"), [aria-label="${v}"]`)
    if (await loc.count()) await loc.first().click({ force: true })
    else console.log('[flow] not found', v)
    await page.waitForTimeout(300)
  }
}
await page.screenshot({ path: out })
await browser.close()
