// End-to-end: a brand-new save plays Bot Noi's whole interactive tutorial
// (every step done for real through the coach marks) and gets the reward.
//   node scripts/tutorial.mjs [baseUrl] [screenshotDir]
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

let shotN = 0
const shot = async (name) => {
  if (shots) await page.screenshot({ path: `${shots}/tut-${String(++shotN).padStart(2, '0')}-${name}.png` })
}
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    errors.push(`${name}: ${e.message}`)
    console.log('✗', name, e.message)
    if (shots) await page.screenshot({ path: `${shots}/tut-fail-${name.replace(/\W+/g, '_')}.png` })
  }
}
const click = (text) => page.getByRole('button', { name: text }).first().click()
const tutStep = () => page.evaluate(() => window.__boondee?.game.value.botnoi?.step ?? null)
const tutStatus = () => page.evaluate(() => window.__boondee?.game.value.botnoi?.tut ?? null)
const waitStep = async (id, timeout = 15000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if ((await tutStep()) === id) return
    await page.waitForTimeout(150)
  }
  throw new Error(`expected step ${id}, at ${await tutStep()}`)
}
/** Finish the typewriter and read every line of the bubble. */
const readBubble = async () => {
  for (let i = 0; i < 6; i++) {
    const t = page.locator('.bn-root .bn-text').first()
    if (!(await t.count())) return
    await t.click().catch(() => {})
    await page.waitForTimeout(120)
  }
}
/** Tap the middle of the highlighted target (like a player would). */
const tapHole = async () => {
  const hole = page.locator('.bn-hole')
  await hole.waitFor({ timeout: 10000 })
  await page.waitForTimeout(350)
  const b = await hole.boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
}

/** Level-up and other notices. */
const dismissModals = async () => {
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(300)
    const m = page.locator('.modal-backdrop .btn').last()
    if (!(await m.count())) break
    await m.click().catch(() => {})
  }
}

await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

await step('new save: intro, sign up, dress up', async () => {
  await page.waitForSelector('.cine')
  await page.locator('.cine-skip').click()
  await page.waitForSelector('.title-screen')
  await page.getByPlaceholder(/ชื่อเล่นในเกม/).fill('น้องบอท')
  await page.getByPlaceholder('อีเมล').fill('nongbot@example.com')
  await page.getByPlaceholder(/รหัสผ่าน/).fill('boondee2026')
  await click('หญิง')
  await click('สร้างบัญชี')
  await page.waitForSelector('.create', { timeout: 15000 })
  await click('เสร็จแล้ว ไปต่อ')
  await click('ออกเดินทางไปวัด')
  await page.locator('.cine-skip').click({ timeout: 3000 }).catch(() => {})
  await page.waitForSelector('.hotbar')
  await click('รับรางวัลวันนี้')
  await click('ไปวัดกันเลย')
})

await step('1 greeting card', async () => {
  await page.waitForSelector('.bn-card.hello', { timeout: 10000 })
  await page.waitForTimeout(900)
  await shot('hello')
  await readBubble()
  await click('ไปกันเลย!')
  await waitStep('walk')
})

await step('2 walk to the ring', async () => {
  await page.waitForSelector('.bn-hole')
  await page.waitForTimeout(700)
  await shot('walk')
  await tapHole()
  await waitStep('incense')
})

await step('3 light incense', async () => {
  await page.waitForTimeout(600)
  await shot('incense')
  await tapHole()
  // Walked up: the ring moves to the action card button.
  await page.waitForSelector('.prompt', { timeout: 10000 })
  await page.waitForTimeout(500)
  await shot('incense-action')
  await tapHole()
  await page.waitForSelector('.activity')
  await page.waitForTimeout(500)
  await shot('incense-activity')
  await click('เริ่มเลย')
  for (let i = 0; i < 3; i++) {
    await click('จุดธูป')
    await page.waitForTimeout(250)
  }
  await click('ข้ามไปก่อน')
  await click('ตั้งจิตอธิษฐาน')
  const hold = page.locator('.hold-btn')
  const b = await hold.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(2600)
  await page.mouse.up()
  await waitStep('bag')
  await page.getByRole('button', { name: 'สาธุ ๆ ๆ' }).click({ timeout: 6000 })
})

await step('4 open the bag', async () => {
  await page.waitForSelector('.bn-hole')
  await page.waitForTimeout(500)
  await shot('bag')
  await tapHole()
  await waitStep('bag_look')
  await page.waitForTimeout(600)
  await shot('bag-look')
  await readBubble()
  await click('เข้าใจแล้ว')
  await waitStep('merit')
  await page.locator('.win-x').last().click()
})

await step('5 feed the koi', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(600)
  await shot('merit')
  await tapHole()
  await page.waitForSelector('.prompt', { timeout: 12000 })
  await page.waitForTimeout(400)
  await tapHole()
  await page.waitForSelector('.activity')
  await click('เริ่มเลย')
  await page.waitForTimeout(400)
  await shot('merit-koi')
  const canvas = page.locator('.activity canvas')
  const box = await canvas.boundingBox()
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + box.width * (0.3 + (i % 3) * 0.2), box.y + box.height * (0.3 + Math.floor(i / 3) * 0.2))
    await page.waitForTimeout(250)
  }
  await waitStep('pray')
  await page.waitForTimeout(2500)
  await click('กลับ').catch(() => {})
  await page.waitForTimeout(300)
  const done = page.getByRole('button', { name: 'สาธุ ๆ ๆ' })
  if (await done.count()) await done.click()
  await page.evaluate(() => window.__boondee.closeActivity())
})

await step('6 pray stage 1', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot('pray')
  await tapHole()
  await waitStep('pray_stage')
  await page.waitForTimeout(700)
  await shot('pray-stage')
  await readBubble()
  await tapHole()
  await waitStep('pray_do')
  await page.waitForSelector('.pray')
  await click(/แตะตามจังหวะ/)
  const tapBtn = page.locator('.kara-tap')
  await tapBtn.waitFor()
  await shot('pray-session')
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.bows').count()) break
    await tapBtn.dispatchEvent('pointerdown').catch(() => {})
    await page.waitForTimeout(350)
  }
  await page.waitForSelector('.bows', { timeout: 20000 })
  await click('กราบพระ')
  await page.waitForSelector('.result-win', { timeout: 8000 })
  await click('กลับ')
  await waitStep('quests')
  await dismissModals()
})

await step('7 quests and a daily reward', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(500)
  await shot('quests-menu')
  await tapHole() // เมนู
  await page.waitForTimeout(600)
  await shot('quests-menu-open')
  await tapHole() // ภารกิจ
  await page.waitForTimeout(800)
  await shot('quests-claim')
  if (await page.locator('.bn-hole').count()) await tapHole()
  else await click(/เข้าใจแล้ว/)
  await waitStep('npc')
  await dismissModals()
  await page.locator('.win-x').last().click()
})

await step('8 talk to a quest NPC', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(700)
  await shot('npc')
  await tapHole()
  await page.waitForSelector('.qd-sheet', { timeout: 15000 })
  await waitStep('map')
  await page.waitForTimeout(500)
  await shot('npc-dialog')
  await page.locator('.qd-x').click()
})

await step('9 Thailand map', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot('map')
  await tapHole()
  await waitStep('map_look')
  await page.waitForTimeout(1200)
  await shot('map-look')
  await readBubble()
  await click('ต่อไป')
  await waitStep('shop')
  await page.locator('.thaimap .win-x').click()
})

await step('10 shop free gift', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot('shop')
  await tapHole() // เมนู
  await page.waitForTimeout(500)
  await tapHole() // ร้านค้า
  await page.waitForTimeout(900)
  await shot('shop-gift')
  await tapHole() // รับฟรี
  await waitStep('home')
  await dismissModals()
  await page.locator('.win-x').last().click()
})

await step('11 go home and decorate', async () => {
  await page.waitForSelector('.bn-hole', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot('home')
  await tapHole()
  await page.waitForSelector('.house')
  await waitStep('decorate')
  await page.waitForTimeout(900)
  await shot('decorate')
  await tapHole()
  await waitStep('decorate_done')
  await page.waitForTimeout(600)
  await shot('decorate-done')
  await tapHole() // เสร็จ
  await waitStep('finish')
})

await step('12 finale and reward', async () => {
  await page.waitForSelector('.bn-card.finish', { timeout: 10000 })
  await readBubble()
  await page.waitForTimeout(400)
  await shot('finish')
  const before = await page.evaluate(() => window.__boondee.game.value.coins)
  await click('รับรางวัล!')
  await page.waitForTimeout(900)
  await shot('reward')
  const s = await page.evaluate(() => ({ coins: window.__boondee.game.value.coins, outfits: window.__boondee.game.value.outfits, tut: window.__boondee.game.value.botnoi.tut }))
  if (s.tut !== 'done') throw new Error(`tutorial not done: ${s.tut}`)
  if (s.coins < before + 300) throw new Error(`reward coins missing ${before} -> ${s.coins}`)
  if (!s.outfits.includes('head_botnoi_antenna')) throw new Error('antenna headband not granted')
  await click('ใส่เลย!')
  await page.waitForTimeout(600)
  await dismissModals()
})

await step('13 Bot Noi menu, quests, joke', async () => {
  await page.locator('.hot').first().click() // back to the temple
  await page.locator('.cine-skip').click({ timeout: 3000 }).catch(() => {})
  await page.waitForSelector('.hotbar')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'เมนู' }).click()
  await click('บอทน้อย')
  await page.waitForSelector('.bn-sheet')
  await readBubble()
  await shot('bot-menu')
  await click(/มีภารกิจอะไรไหม/)
  await page.waitForTimeout(300)
  await readBubble()
  await page.waitForTimeout(300)
  await shot('bot-quests')
  await click('จัดไปบอทน้อย!')
  await page.waitForTimeout(300)
  await click('กลับ')
  await readBubble()
  await click('เล่นมุก')
  await readBubble()
  await page.waitForTimeout(300)
  await shot('bot-joke')
  await page.locator('.bn-sheet .btn.red').click()
  await page.waitForTimeout(500)
  await shot('tracker-bot-quest')
})

await step('14 replay from the menu, then skip', async () => {
  await page.getByRole('button', { name: 'เมนู' }).click()
  await click('เล่นบทเรียนอีกครั้ง')
  await page.waitForSelector('.bn-card.hello')
  await readBubble()
  await page.locator('.bn-card .bn-skip').click()
  await click('ข้ามเลย')
  await page.waitForTimeout(300)
  if ((await tutStatus()) !== 'skipped') throw new Error('skip did not stick')
})

await browser.close()
if (errors.length) {
  console.log('\nErrors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nTutorial e2e passed')
