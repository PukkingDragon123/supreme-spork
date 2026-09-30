// Two-tab online test against the dev server's room shim (BroadcastChannel):
// two players see each other walk, chat, emote, สาธุ, gift and trade.
//   node scripts/online-two-tab.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173/'
const shots = process.argv[3]
const errors = []
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

async function open(slot, as, setup) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${as} pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(`${as} console: ${m.text()}`)
  })
  await page.goto(`${base}?skipintro&nologin&map=wat&roomshim&slot=${slot}&as=${encodeURIComponent(as)}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.hotbar')
  await page.evaluate(setup)
  return page
}

const shot = async (page, name, settle = 450) => {
  await page.waitForTimeout(settle)
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` })
}

const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    errors.push(`${name}: ${e.message}`)
    console.log('✗', name, e.message)
  }
}

const A = await open('a', 'มะปราง ใจดี', () => {
  const b = window.__boondee
  const s = b.game.value
  b.game.value = {
    ...s,
    player: { ...s.player, name: 'มะปราง', look: { ...s.player.look, gender: 'f', hair: 'hair_twin', hairColor: 4, top: 'top_sabai_pink', bottom: 'bot_pinkskirt' } },
    inventory: { ...s.inventory, lotus: 4, garland: 3 },
  }
})
const B = await open('b', 'ต้นกล้า สายบุญ', () => {
  const b = window.__boondee
  const s = b.game.value
  b.game.value = {
    ...s,
    player: { ...s.player, name: 'ต้นกล้า', look: { ...s.player.look, gender: 'm', hair: 'hair_twoblock', hairColor: 0, top: 'top_hawaii', bottom: 'bot_jeans' } },
    inventory: { ...s.inventory, fruit: 3, rice: 5 },
  }
})

const realTags = (page) => page.locator('.nametag.real').count()

await step('both see each other', async () => {
  for (let i = 0; i < 40; i++) {
    if ((await realTags(A)) >= 1 && (await realTags(B)) >= 1) return
    await A.waitForTimeout(250)
  }
  throw new Error('players did not appear')
})

await step('B walks, A watches', async () => {
  await B.evaluate(() => {
    const sc = window.__boondee.worldScene()
    sc.walkTo(sc.player.x - 26, sc.player.y - 6)
  })
  await A.waitForTimeout(450)
  await shot(A, 'online-a-sees-b-walk')
  await A.waitForTimeout(1500)
})

await step('A chats with a quick phrase', async () => {
  await A.locator('.ol-fab').click()
  await A.getByRole('button', { name: 'สวัสดีค่ะ 🙏' }).click()
  await A.locator('.pinput').fill('ไปตักบาตรด้วยกันไหม')
  await A.getByRole('button', { name: 'ส่ง', exact: true }).click()
  await B.waitForTimeout(700)
  await shot(A, 'online-a-chat-sheet')
  await B.locator('.ol-say').first().waitFor({ timeout: 3000 })
  await shot(B, 'online-b-sees-a-chat')
})

await step('A emotes (heart) and B dances', async () => {
  await A.waitForTimeout(1300)
  await A.getByRole('button', { name: 'หัวใจ' }).click()
  await A.getByRole('button', { name: 'ปิดแชท' }).click()
  await B.locator('.ol-fab').click()
  await B.getByRole('button', { name: 'เต้น' }).click()
  await B.getByRole('button', { name: 'ปิดแชท' }).click()
  await A.waitForTimeout(500)
  await shot(A, 'online-a-emotes')
})

async function openCard(page) {
  const tag = page.locator('.nametag.real').first()
  const box = await tag.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 22)
  await page.locator('.ol-card').waitFor({ timeout: 3000 })
}

await step('A opens B card and says สาธุ', async () => {
  await A.waitForTimeout(1500)
  await openCard(A)
  await shot(A, 'online-a-card')
  await A.getByRole('button', { name: 'สาธุ' }).click()
  await A.getByRole('button', { name: 'เพิ่มเพื่อน' }).click()
  await B.waitForTimeout(600)
  await shot(B, 'online-b-got-sathu')
})

await step('trade: A asks, B accepts, both offer, ready, confirm', async () => {
  await A.getByRole('button', { name: 'ชวนแลกของ' }).click()
  await B.getByRole('button', { name: 'ดูของกัน' }).waitFor({ timeout: 4000 })
  await shot(B, 'online-b-trade-request')
  await B.getByRole('button', { name: 'ดูของกัน' }).click()
  await A.getByRole('button', { name: 'ใส่ของจากกระเป๋า' }).waitFor({ timeout: 4000 })
  await A.getByRole('button', { name: 'ใส่ของจากกระเป๋า' }).click()
  await A.getByRole('button', { name: /เพิ่มดอกบัว/ }).click()
  await A.getByRole('button', { name: /เพิ่มดอกบัว/ }).click()
  await B.getByRole('button', { name: 'ใส่ของจากกระเป๋า' }).click()
  await B.getByRole('button', { name: /เพิ่มผลไม้มงคล/ }).click()
  await A.waitForTimeout(400)
  await A.getByRole('button', { name: 'พร้อมแลก' }).click()
  await B.getByRole('button', { name: 'พร้อมแลก' }).click()
  await A.waitForTimeout(500)
  await shot(A, 'online-a-trade-ready')
  const before = await A.evaluate(() => ({ lotus: window.__boondee.game.value.inventory.lotus ?? 0, fruit: window.__boondee.game.value.inventory.fruit ?? 0 }))
  await A.getByRole('button', { name: 'ยืนยันแลก' }).click()
  await B.getByRole('button', { name: 'ยืนยันแลก' }).click()
  await A.locator('.ol-trade-win.win-glow').waitFor({ timeout: 4000 })
  await shot(A, 'online-a-trade-done')
  const after = await A.evaluate(() => ({ lotus: window.__boondee.game.value.inventory.lotus ?? 0, fruit: window.__boondee.game.value.inventory.fruit ?? 0 }))
  const bAfter = await B.evaluate(() => ({ lotus: window.__boondee.game.value.inventory.lotus ?? 0, fruit: window.__boondee.game.value.inventory.fruit ?? 0 }))
  console.log('  A before', before, 'after', after, '· B after', bAfter)
  if (after.lotus !== before.lotus - 2 || after.fruit !== before.fruit + 1) throw new Error('A inventory did not swap')
  if (bAfter.lotus < 2) throw new Error('B did not receive lotus')
  await B.locator('.ol-trade-win.win-glow').waitFor({ timeout: 4000 })
  for (const p of [A, B]) await p.getByRole('button', { name: 'ตกลง' }).last().click()
})

await step('B sends A a gift', async () => {
  await B.waitForTimeout(400)
  await openCard(B)
  await B.getByRole('button', { name: 'ส่งของขวัญ' }).click()
  await B.locator('.ol-gift-grid .slot').first().click()
  await shot(B, 'online-b-gift-picker')
  await B.locator('.ol-gift-win .btn.block').click()
  await A.waitForTimeout(900)
  await shot(A, 'online-a-got-gift')
})

await step('online list', async () => {
  await A.getByRole('button', { name: 'รับไว้' }).click()
  await A.locator('.ol-pill').click()
  await A.locator('.ol-panel-win').waitFor()
  await shot(A, 'online-a-list')
})

await browser.close()
if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nTwo-tab online test passed.')
