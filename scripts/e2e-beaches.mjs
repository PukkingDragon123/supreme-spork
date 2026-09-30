// E2E: travel to every beach from the Thailand map in the real app, tapping
// the pin on the map canvas, buying the unlock and pressing the travel button.
//   node scripts/e2e-beaches.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://localhost:5173/'
const OUT = process.argv[3] ? process.argv[3].replace(/\/?$/, '/') : null
const IDS = ['beach_bangsaen', 'beach_huahin', 'beach_samila', 'beach_samui', 'beach_patong', 'beach_railay']
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(BASE + '?skipintro', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
for (const t of ['รับรางวัลวันนี้', 'ไปวัดกันเลย']) {
  const b = page.getByRole('button', { name: t })
  if (await b.count()) await b.first().click().catch(() => {})
  await page.waitForTimeout(300)
}
await page.waitForFunction(() => !!window.__boondee)
// Rich enough to buy the star unlocks with coins (real unlock flow).
await page.evaluate(() => {
  const g = window.__boondee.game
  g.value = { ...g.value, coins: 20000 }
})
const results = []
for (const id of IDS) {
  const r = { id, pinTapped: false, bought: false, arrived: false }
  const coins0 = await page.evaluate(() => window.__boondee.game.value.coins)
  await page.getByRole('button', { name: 'แผนที่' }).first().click()
  await page.waitForFunction(() => !!window.__thaimap)
  await page.waitForTimeout(600)
  // Pan the pin into view, then tap it on the canvas like a player would.
  const pos = await page.evaluate((id) => {
    const sc = window.__thaimap
    sc.focus(id, true)
    const pl = sc.placed.find((p) => p.id === id)
    const canv = [...document.querySelectorAll('canvas')].filter((x) => x.getBoundingClientRect().width > 0).pop()
    const rect = canv.getBoundingClientRect()
    const k = rect.width / sc.vw
    const z = sc.getZoom()
    return { x: rect.left + (pl.x - sc.camX) * z * k, y: rect.top + (pl.y - 9 - sc.camY) * z * k }
  }, id)
  await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(700)
  const card = page.locator('.place-card')
  r.pinTapped = (await card.count()) > 0
  if (!r.pinTapped) {
    results.push(r)
    await page.keyboard.press('Escape')
    continue
  }
  const unlock = card.getByRole('button', { name: /ปลดล็อก/ })
  if (await unlock.count()) {
    await unlock.first().click()
    await page.waitForTimeout(400)
    r.bought = true
    r.paid = coins0 - (await page.evaluate(() => window.__boondee.game.value.coins))
  }
  if (OUT && id === 'beach_samila') await page.screenshot({ path: OUT + 'e2e_card_samila.png' })
  await card.getByRole('button', { name: 'ออกเดินทาง' }).click()
  // Wait out the travel cutscene (skip it if it offers a skip button).
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(400)
    const skip = page.getByRole('button', { name: /ข้าม/ })
    if (await skip.count()) await skip.first().click().catch(() => {})
    const at = await page.evaluate(() => window.__boondee.worldScene()?.map?.id)
    if (at === id) {
      r.arrived = true
      break
    }
  }
  await page.waitForTimeout(1500)
  r.visited = await page.evaluate((id) => window.__boondee.game.value.places.visited.includes(id) && window.__boondee.game.value.beach.visited.includes(id), id)
  if (OUT) await page.screenshot({ path: OUT + `e2e_${id}.png` })
  results.push(r)
}
console.log(JSON.stringify(results, null, 1))
console.log('errors', errs)
await browser.close()
process.exit(results.every((r) => r.arrived && r.visited) && !errs.length ? 0 : 1)
