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
const waitDone = async (id, timeout = 15000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate((x) => window.__boondee?.game.value.botnoi?.steps.includes(x), id)) return
    await page.waitForTimeout(150)
  }
  throw new Error(`step ${id} not done (at ${await tutStep()})`)
}
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
/** Bot Noi only gives at the end: a gift card mid-tutorial is a failure. */
const acceptGift = async () => {
  if (await page.locator('.bn-gift').count()) throw new Error(`gift reveal during the tutorial (step ${await tutStep()})`)
}
/** Nothing of Bot Noi's may stay in the bag before the finale (loans are taken back). */
const BOT_KIT = ['incense', 'garland', 'rice', 'curry', 'banana', 'water']
const bagHasKit = () => page.evaluate((ids) => ids.filter((id) => (window.__boondee.game.value.inventory[id] ?? 0) > 0), BOT_KIT)
/** Wait for the coach mark, accepting any gift card on the way. */
const waitHole = async (timeout = 10000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    await acceptGift()
    if (await page.locator('.bn-hole').count()) return
    await page.waitForTimeout(200)
  }
  throw new Error(`no coach mark at step ${await tutStep()}`)
}
/** Tap the middle of the highlighted target (like a player would). */
const tapHole = async () => {
  await page.waitForTimeout(250)
  await acceptGift()
  const hole = page.locator('.bn-hole')
  await waitHole()
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

await step('0 new save starts empty', async () => {
  const s = await page.evaluate(() => ({ inv: window.__boondee.game.value.inventory, pets: window.__boondee.game.value.pets }))
  const n = Object.values(s.inv).reduce((a, b) => a + b, 0)
  if (n > 0) throw new Error(`bag not empty: ${JSON.stringify(s.inv)}`)
  if (s.pets.length) throw new Error('free pet')
})

await step('1 greeting card', async () => {
  await page.waitForSelector('.bn-card.hello', { timeout: 10000 })
  await page.waitForTimeout(900)
  await shot('hello')
  await readBubble()
  await click('ไปกันเลย!')
  await waitStep('incense')
})

await step('2 soft hints: nothing is blocked, Bot Noi can wait', async () => {
  await page.waitForTimeout(800)
  await acceptGift()
  await waitHole()
  await shot('soft-hint')
  if (await page.locator('.bn-dim, .bn-block').count()) throw new Error('the screen is dimmed / blocked')
  // The player can wander: the map opens even though Bot Noi suggests incense (and it counts).
  await page.getByRole('button', { name: 'แผนที่' }).click()
  await page.waitForSelector('.thaimap')
  await waitDone('map')
  await page.waitForTimeout(600)
  await shot('map-any-order')
  await page.locator('.thaimap .win-x').click()
  // One tap folds the bubble into a chip; another brings it back.
  await waitHole()
  await page.locator('.bn-fold').click()
  await page.waitForSelector('.bn-chipbot')
  await shot('folded')
  await page.locator('.bn-chipbot').click()
  await page.waitForSelector('.bn-bubble')
  // "ไว้ทีหลัง" pauses; Bot Noi's menu resumes.
  await page.getByRole('button', { name: 'ไว้ทีหลัง' }).click()
  await page.waitForTimeout(300)
  if ((await tutStatus()) !== 'paused') throw new Error('not paused')
  if (await page.locator('.bn-bubble').count()) throw new Error('bubble still shown while paused')
  await page.getByRole('button', { name: 'เมนู' }).click()
  await click('บอทน้อย')
  await page.waitForSelector('.bn-sheet')
  await readBubble()
  await click('สอนต่อ')
  await page.waitForTimeout(300)
  if ((await tutStatus()) !== 'active') throw new Error('not resumed')
})

/** Close whatever is open (dialogs, windows, results) so Bot Noi's next hint shows. */
const tidy = async () => {
  await dismissModals()
  for (let i = 0; i < 3; i++) {
    const sel = ['.qd-x', '.thaimap .win-x', '.win-x']
    let closed = false
    for (const x of sel) {
      const el = page.locator(x).last()
      if (await el.count()) {
        await el.click().catch(() => {})
        closed = true
        await page.waitForTimeout(300)
        break
      }
    }
    if (!closed) break
  }
}

/** Do one suggested step for real, via Bot Noi's rings. */
const HANDLERS = {
  incense: async () => {
    await tapHole()
    await page.waitForSelector('.prompt', { timeout: 10000 })
    await page.waitForTimeout(500)
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
    await waitDone('incense')
    await page.getByRole('button', { name: 'สาธุ ๆ ๆ' }).click({ timeout: 6000 })
  },
  merit: async () => {
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
    await waitDone('merit')
    await page.waitForTimeout(2500)
    await click('กลับ').catch(() => {})
    await page.waitForTimeout(300)
    const done = page.getByRole('button', { name: 'สาธุ ๆ ๆ' })
    if (await done.count()) await done.click()
    await page.evaluate(() => window.__boondee.closeActivity())
  },
  pray: async () => {
    await tapHole() // สวดมนต์
    await page.waitForTimeout(900)
    await shot('pray-stage')
    await tapHole() // เริ่มสวดมนต์
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
    await waitDone('pray')
    await page.waitForTimeout(400)
    await shot('levelup-popup')
  },
  quests: async () => {
    await tapHole() // เมนู
    await page.waitForTimeout(600)
    await shot('quests-menu-open')
    await tapHole() // ภารกิจ
    await page.waitForTimeout(800)
    await shot('quests-claim')
    if (await page.locator('.bn-hole').count()) await tapHole()
    else await click(/เข้าใจแล้ว/)
    await waitDone('quests')
  },
  npc: async () => {
    await tapHole()
    await page.waitForSelector('.qd-sheet', { timeout: 15000 })
    await waitDone('npc')
  },
  map: async () => {
    await tapHole()
    await waitDone('map')
  },
  shop: async () => {
    await tapHole() // เมนู
    await page.waitForTimeout(500)
    await tapHole() // ร้านค้า
    await page.waitForTimeout(900)
    await shot('shop-gift')
    if (await page.locator('.bn-hole').count()) await tapHole() // รับฟรี
    else await click(/ต่อไป/)
    await waitDone('shop')
    await page.waitForTimeout(400)
    await shot('new-item-popup')
  },
  decorate: async () => {
    await tapHole() // บ้าน
    await page.waitForSelector('.house')
    await page.waitForTimeout(900)
    await shot('decorate')
    await tapHole() // จัดห้อง
    await page.waitForSelector('.house-edit-top')
    await page.waitForTimeout(600)
    await shot('decorate-tray')
    await tapHole() // the loaner plant in the tray
    await page.waitForSelector('.edit-bar')
    await page.evaluate(async () => (window.__boondee.houseScene ?? (await import('/src/ui/views/HouseView.tsx')).currentHouseScene)()?.confirmGhost())
    await page.waitForTimeout(500)
    const placed = await page.evaluate(() => window.__boondee.game.value.house.placed.some((p) => p.id === 'plant_monstera'))
    if (!placed) throw new Error('loaner plant was not placed')
    await tapHole() // เสร็จ
    await waitDone('decorate')
  },
}

await step('3 every step, in whatever order Bot Noi suggests', async () => {
  const seen = []
  for (let guard = 0; guard < 14; guard++) {
    await tidy()
    const id = await tutStep()
    if (id === 'finish' || id === null) break
    if (seen.filter((x) => x === id).length > 1) throw new Error(`stuck on ${id}`)
    seen.push(id)
    await waitHole(10000)
    await page.waitForTimeout(400)
    await shot(id)
    await HANDLERS[id]()
    console.log('   · done', id)
  }
  if ((await tutStep()) !== 'finish') throw new Error(`not at the finale: ${await tutStep()}`)
})

await step('12 finale and reward', async () => {
  await page.waitForSelector('.bn-card.finish', { timeout: 10000 })
  const early = await bagHasKit()
  if (early.length) throw new Error(`items in the bag before the finale: ${early}`)
  const storageBefore = await page.evaluate(() => ({ ...window.__boondee.game.value.house.storage }))
  if (Object.keys(storageBefore).length) throw new Error(`loaner furniture left in storage: ${JSON.stringify(storageBefore)}`)
  await readBubble()
  await page.waitForTimeout(400)
  await shot('finish')
  const before = await page.evaluate(() => window.__boondee.game.value.coins)
  await click('รับรางวัล!')
  await page.waitForSelector('.bn-gift', { timeout: 5000 })
  await page.getByRole('button', { name: 'ขอบใจนะบอทน้อย!' }).waitFor({ timeout: 5000 })
  await page.waitForTimeout(900)
  await shot('reward')
  const s = await page.evaluate(() => {
    const g = window.__boondee.game.value
    return { coins: g.coins, outfits: g.outfits, tut: g.botnoi.tut, inv: g.inventory, storage: g.house.storage, placed: g.house.placed.map((p) => p.id) }
  })
  if (s.tut !== 'done') throw new Error(`tutorial not done: ${s.tut}`)
  if (s.coins < before + 300) throw new Error(`reward coins missing ${before} -> ${s.coins}`)
  if (!s.outfits.includes('head_botnoi_antenna')) throw new Error('antenna headband not granted')
  for (const id of ['incense', 'garland', 'rice', 'fish_food']) if (!(s.inv[id] > 0)) throw new Error(`starter kit missing ${id}`)
  if (!(s.storage.rug_mat > 0)) throw new Error('mat missing')
  if (!(s.storage.plant_monstera > 0) && !s.placed.includes('plant_monstera')) throw new Error('plant missing')
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

await step('13b quick shop, new-item popup, sell from the bag', async () => {
  await page.locator('.hud2-shop').click()
  await page.waitForSelector('.pp-sheet')
  await page.waitForTimeout(400)
  await shot('shop-popup')
  const inc0 = await page.evaluate(() => window.__boondee.game.value.inventory.incense ?? 0)
  await page.getByRole('button', { name: 'ซื้อธูปเทียนแพ' }).click()
  const inc1 = await page.evaluate(() => window.__boondee.game.value.inventory.incense ?? 0)
  if (inc1 <= inc0) throw new Error('quick buy failed')
  await page.waitForSelector('.pp-card.got', { timeout: 3000 })
  await shot('got-popup')
  await click('ดูร้านทั้งหมด')
  await page.waitForTimeout(500)
  await page.locator('.win-x').last().click()
  // Bag → tap an item → sell to the shop.
  await page.getByRole('button', { name: 'กระเป๋า' }).click()
  await page.locator('.inv-slot').first().click()
  await page.waitForSelector('.pp-sell')
  await page.waitForTimeout(300)
  await shot('sell-popup')
  const c0 = await page.evaluate(() => window.__boondee.game.value.coins)
  await page.locator('.pp-sell .btn.green').click()
  const c1 = await page.evaluate(() => window.__boondee.game.value.coins)
  if (c1 <= c0) throw new Error('quick sell paid nothing')
  await page.waitForTimeout(300)
  if (await page.locator('.inv-sheet-x').count()) await page.locator('.inv-sheet-x').click()
  await tidy()
})

await step('14 replay from the menu, then skip', async () => {
  await page.getByRole('button', { name: 'เมนู' }).click()
  if (!(await page.getByRole('button', { name: 'เล่นบทเรียนอีกครั้ง' }).count())) await click('▼ เพิ่มเติม')
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
