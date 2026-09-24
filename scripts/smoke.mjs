// End-to-end smoke test: plays through the main flows in a phone-sized
// browser and fails on any page error.
//   node scripts/smoke.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173/'
const shots = process.argv[3]
const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(`console: ${m.text()}`)
})

const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    errors.push(`${name}: ${e.message}`)
    console.log('✗', name, e.message)
  }
  if (shots) await page.screenshot({ path: `${shots}/smoke-${name.replace(/\W+/g, '_')}.png` })
}
const click = (text) => page.getByRole('button', { name: text }).first().click()

await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

await step('onboarding', async () => {
  await click('เริ่มต้นสายบุญ')
  await page.fill('#player-name', 'น้องบุญ')
  await click('ผมยาวสลวย')
  await click('ต่อไป')
  await click('เข้าวัดกันเลย')
  await page.waitForSelector('.nav')
})

await step('daily login', async () => {
  await click('รับรางวัลวันนี้')
  await click('ไปวัดกันเลย')
})

await step('walk to koi pond', async () => {
  await page.getByRole('button', { name: 'รายการกิจกรรมในวัดนี้' }).click({ force: true })
  await page.getByRole('button', { name: /บ่อปลาคาร์ฟ/ }).click()
  await page.waitForSelector('.activity', { timeout: 15000 })
})

await step('feed koi', async () => {
  const canvas = page.locator('.activity canvas')
  const box = await canvas.boundingBox()
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + box.width * (0.3 + (i % 3) * 0.2), box.y + box.height * (0.3 + Math.floor(i / 3) * 0.2))
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(2500)
  await click(/กลับ/)
  await page.waitForTimeout(300)
  const done = page.getByRole('button', { name: 'สาธุ ๆ ๆ' })
  if (await done.count()) await done.click()
})

await step('alms round', async () => {
  await page.evaluate(() => window.__boondee.openActivity('alms'))
  await page.waitForSelector('.activity')
  await page.waitForFunction(() => document.body.innerText.includes('ถวายแด่'), null, { timeout: 15000 })
  await page.getByRole('button', { name: /แกงเขียวหวาน/ }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /กล้วยน้ำว้า/ }).click()
  await page.waitForTimeout(900)
  await click('นิมนต์รูปถัดไป')
})

await step('screens', async () => {
  await page.evaluate(() => window.__boondee.closeActivity())
  for (const t of ['ภารกิจ', 'ร้านค้า', 'แต่งตัว', 'เพื่อน', 'วัด']) {
    await page.getByRole('button', { name: t, exact: true }).click()
    await page.waitForTimeout(400)
  }
})

await step('coin store sandbox purchase', async () => {
  await page.getByRole('button', { name: 'เติมบุญคอยน์' }).first().click()
  await page.getByRole('button', { name: /ถุงบุญใบเล็ก/ }).click()
  await click('ยืนยันการซื้อ')
  await page.waitForTimeout(1300)
  await click('รับไว้')
})

await step('rewarded ad', async () => {
  await page.getByRole('button', { name: 'ดูเลย' }).first().click()
  await page.waitForTimeout(5600)
  await click(/รับรางวัล/)
  await page.waitForTimeout(400)
})

const state = await page.evaluate(() => JSON.parse(localStorage.getItem('boondee.save.v1') ?? '{}'))
console.log('coins', state.coins, 'merit', state.merit, 'stats', JSON.stringify(state.stats))
await browser.close()
if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nSmoke test passed')
