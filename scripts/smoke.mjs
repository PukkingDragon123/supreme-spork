// End-to-end smoke test: plays through the main flows in a phone-sized
// browser and fails on any page error.
//   node scripts/smoke.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright'

// `?notutorial` keeps Bot Noi's tutorial and tips from popping up (scripts/tutorial.mjs covers them).
const baseArg = process.argv[2] ?? 'http://localhost:5173/'
const base = baseArg + (baseArg.includes('?') ? '&' : '?') + 'notutorial'
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
/** The menu keeps six big buttons; the rest are under "เพิ่มเติม". */
const openMore = async (text) => {
  await page.waitForSelector('.menu-grid')
  const win = page.locator('.win-backdrop').last()
  if (!(await win.getByRole('button', { name: text }).count())) await win.getByRole('button', { name: '▼ เพิ่มเติม' }).click()
  return win
}

await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

await step('intro cutscene', async () => {
  await page.waitForSelector('.cine')
  await page.waitForTimeout(800)
  await page.locator('.cine-skip').click()
  await page.waitForSelector('.title-screen')
})

await step('sign up', async () => {
  await page.getByPlaceholder(/ชื่อเล่นในเกม/).fill('น้องบุญ')
  await page.getByPlaceholder('อีเมล').fill('nongboon@example.com')
  await page.getByPlaceholder(/รหัสผ่าน/).fill('boondee2026')
  await click('ชาย')
  await click('สร้างบัญชี')
  await page.waitForSelector('.create', { timeout: 15000 })
})

await step('dress up', async () => {
  await page.getByRole('tab', { name: 'ทรงผม' }).click()
  await page.locator('.dress-grid .slot').nth(1).click()
  await page.getByRole('tab', { name: 'เสื้อ' }).click()
  await page.locator('.dress-grid .slot').first().click()
  await click('เสร็จแล้ว ไปต่อ')
  await click('ออกเดินทางไปวัด')
  await page.locator('.cine-skip').click({ timeout: 3000 }).catch(() => {})
  await page.waitForSelector('.hotbar')
})

await step('daily login', async () => {
  await click('รับรางวัลวันนี้')
  await click('ไปวัดกันเลย')
})

await step('pray a stage', async () => {
  await page.locator('.hot.big').click()
  await click('เริ่มสวดมนต์')
  await page.waitForSelector('.pray')
  await click(/แตะตามจังหวะ/)
  const tapBtn = page.locator('.kara-tap')
  await tapBtn.waitFor()
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.bows').count()) break
    await tapBtn.dispatchEvent('pointerdown').catch(() => {})
    await page.waitForTimeout(350)
  }
  await page.waitForSelector('.bows', { timeout: 20000 })
  await click('กราบพระ')
  await page.waitForSelector('.result-win', { timeout: 8000 })
  await click('กลับ')
})

await step('walk to koi pond', async () => {
  await page.evaluate(() => window.__boondee.openActivity('koi'))
  await page.waitForSelector('.activity', { timeout: 15000 })
  await click('เริ่มเลย')
})

await step('feed koi', async () => {
  const canvas = page.locator('.activity canvas')
  const box = await canvas.boundingBox()
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + box.width * (0.3 + (i % 3) * 0.2), box.y + box.height * (0.3 + Math.floor(i / 3) * 0.2))
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(2500)
  await click('กลับ')
  await page.waitForTimeout(300)
  const done = page.getByRole('button', { name: 'สาธุ ๆ ๆ' })
  if (await done.count()) await done.click()
})

await step('home and crafting', async () => {
  await page.evaluate(() => window.__boondee.closeActivity())
  await page.locator('.hot').first().click()
  await page.waitForSelector('.house')
  await page.getByRole('button', { name: 'ทำเฟอร์นิเจอร์' }).click()
  await page.waitForSelector('.craft-locked, .craft-grid')
  await page.locator('.win-x').last().click()
  await page.getByRole('button', { name: 'จัดห้อง' }).click()
  await page.waitForSelector('.edit-tray')
  await click('เสร็จ')
  await page.locator('.hot').first().click()
  await page.locator('.cine-skip').click({ timeout: 3000 }).catch(() => {})
  await page.waitForSelector('.hotbar')
})

await step('menu screens', async () => {
  for (const t of ['ภารกิจ', 'ร้านค้า', 'เพื่อน']) {
    await page.getByRole('button', { name: 'เมนู' }).click()
    const menu = await openMore(t)
    await menu.getByRole('button', { name: new RegExp(t) }).first().click()
    await page.waitForTimeout(400)
    await page.locator('.win-x').last().click()
  }
  for (const t of ['บทสวด', 'ลูกประคำ', 'เตือนสวด']) {
    await page.getByRole('button', { name: 'เมนู' }).click()
    const menu = await openMore(t)
    await menu.getByRole('button', { name: t }).first().click()
    await page.waitForTimeout(300)
    await page.locator('.win-x').last().click()
  }
})

await step('coin store sandbox purchase', async () => {
  await page.locator('.hud2-coins').click()
  await page.getByRole('button', { name: /ถุงบุญใบเล็ก/ }).click()
  await click('ยืนยันการซื้อ')
  await page.waitForTimeout(1300)
  await click('รับไว้')
  await page.getByRole('button', { name: 'ปิด' }).first().click()
})

await step('rewarded ad', async () => {
  await page.getByRole('button', { name: 'เมนู' }).click()
  await click(/ภารกิจ/)
  await page.getByRole('button', { name: 'ดูเลย' }).first().click()
  await page.waitForTimeout(5600)
  await click(/รับรางวัล/)
  await page.waitForTimeout(400)
})

const state = await page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => x.startsWith('boondee.save.v1:')) ?? 'boondee.save.v1'
  return JSON.parse(localStorage.getItem(k) ?? '{}')
})
console.log('account', state.account?.email, 'coins', state.coins, 'merit', state.merit, 'stars', JSON.stringify(state.prayer?.stars), 'mats', JSON.stringify(state.materials))
await browser.close()
if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nSmoke test passed')
