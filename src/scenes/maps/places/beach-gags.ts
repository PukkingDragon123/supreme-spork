// Beach-goer gags (tap for a line and a little reaction): a sunbather on a
// towel who flips over, dad buried in the sand up to his neck, a kid whose
// sandcastle the wave keeps eating, an uncle asleep under a newspaper in a
// sling chair, a lobster-red tourist, an influencer doing 200 selfies, a
// lifeguard with a whistle, walking vendors (ice cream, sarongs, som tam)
// and a masseuse at work.

import type { Surface } from '../../../engine/pixel'
import { rand, pick } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { avatarSprite, type AvatarLook } from '../../../art/avatar'
import { drawShadow } from '../../../art/props'
import { randomVisitorLook } from '../../world'
import { drawPerson, type Gag, type GagPose } from '../../gags'
import { INK, mix, sandcastle, slingChair, somtamBaskets, sarongRack } from '../../../art/places/beach-kit'

export function look(o: Partial<AvatarLook> = {}): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

function towel(g: Surface, x: number, y: number, a: string, b: string) {
  g.rect(x - 9, y - 4, 18, 8, a)
  for (let i = -9; i < 9; i += 4) g.rect(x + i, y - 4, 2, 8, b)
  g.hline(x - 9, x + 8, y + 4, mix(a, INK, 0.35))
}

/** A sunbather lying on a towel; tap and they flip over to tan the other side. */
export function sunbatherGag(x: number, y: number, lines: string[], colors: [string, string] = ['#ff9fc0', '#fffaf0']): Gag {
  const lk = look({ top: 'top_tee_white', head: 'head_sunglasses' })
  return {
    x,
    y,
    w: 22,
    h: 12,
    lines,
    z: -2,
    draw: (g, p) => {
      towel(g, p.x, p.y - 2, colors[0], colors[1])
      const sp = avatarSprite(lk, p.react > 0 ? 'back' : 'front', 'stand')
      // Lie the little avatar down (rotate 90°).
      const c = g.ctx
      c.save()
      c.translate(Math.round(p.x - g.ox), Math.round(p.y - 2 - g.oy))
      c.rotate(-Math.PI / 2)
      c.drawImage(sp.canvas, -Math.round(sp.h / 2) + 2, -Math.round(sp.w / 2))
      c.restore()
      if (p.react > 0 && Math.floor(p.t * 4) % 2) g.px(p.x + 6, p.y - 10, '#ffd23f')
    },
    react: (s, gx, gy) => {
      s.particles.sparkles(gx, gy - 8, 4, '#ffe27a', 8)
      sfx.tap()
    },
  }
}

/** Dad buried in the sand, only his head sticking out. */
export function buriedDadGag(x: number, y: number): Gag {
  const lk = look({ gender: 'm', hair: 'hair_short', head: 'head_sunglasses' })
  return {
    x,
    y,
    w: 26,
    h: 16,
    lines: ['ลูก ๆ ช่วยพ่อออกไปทีสิ...', 'คันจมูกกก ใครเกาให้หน่อย', 'พ่อไม่ได้ขยับมาชั่วโมงแล้ว', 'ปูเดินผ่านหน้าพ่อไปแล้วสามตัว!'],
    draw: (g, p) => {
      g.ellipse(p.x + 6, p.y - 2, 14, 5, '#d8bc88')
      g.ellipse(p.x + 5, p.y - 3, 12, 4, '#ecd4a4')
      for (let i = 0; i < 5; i++) g.px(p.x + i * 4 - 2, p.y - 4 - (i % 2), '#fffaf0')
      const sp = avatarSprite(lk, 'front', p.react > 0 ? 'happy' : 'stand')
      g.drawPart(sp.canvas, 0, 0, sp.w, 12, Math.round(p.x - 8 - sp.w / 2), Math.round(p.y - 14))
      // Kid with a spade.
      const kid = avatarSprite(kidLook, 'side', Math.floor(p.t * 3) % 2 ? 'offer' : 'stand', { flip: true })
      drawShadow(g, p.x + 20, p.y, 5, 1.5)
      g.draw(kid.canvas, Math.round(p.x + 20 - kid.w / 2), Math.round(p.y - kid.h + 1))
      g.line(p.x + 14, p.y - 6, p.x + 12, p.y - 1 - (Math.floor(p.t * 3) % 2), '#5aa9e8')
    },
    react: (s, gx, gy) => {
      for (let i = 0; i < 6; i++) s.particles.add({ kind: 'dot', x: gx + rand(-6, 12), y: gy - 4, vx: rand(-20, 20), vy: rand(-30, -10), g: 80, max: 0.6, color: '#e0c89a' })
      sfx.scratch()
    },
  }
}
const kidLook = look({ gender: 'f', hair: 'hair_ponytail', top: 'top_tee_boon' })

/** A kid and her sandcastle; tap and a wave washes it... she rebuilds it. */
export function castleKidGag(x: number, y: number): Gag {
  const lk = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_white' })
  const castle = sandcastle(0)
  return {
    x,
    y,
    w: 34,
    h: 26,
    lines: ['ปราสาทหนูสวยไหม!', 'คลื่นอย่ามานะ!!', 'แงงง ปราสาทพัง... สร้างใหม่ก็ได้!', 'เจ้าหญิงปูอยู่ในนี้'],
    draw: (g, p) => {
      const washed = p.react > 0.4
      if (!washed) g.draw(castle.canvas, Math.round(p.x - castle.ax), Math.round(p.y - castle.ay))
      else {
        g.ellipse(p.x, p.y - 2, 12, 3, '#d8bc88')
        g.alpha(0.6)
        g.ellipse(p.x, p.y - 2, 14, 4, '#a4e8e2')
        g.alpha(1)
      }
      const sp = avatarSprite(lk, 'side', washed ? 'bow' : 'offer', { flip: false })
      drawShadow(g, p.x - 18, p.y, 5, 1.5)
      g.draw(sp.canvas, Math.round(p.x - 18 - sp.w / 2), Math.round(p.y - sp.h + 1))
      if (washed && Math.floor(p.t * 4) % 2) g.px(p.x - 15, p.y - 16, '#9fd0ff')
    },
    react: (s, gx, gy) => {
      for (let i = 0; i < 10; i++) s.particles.add({ kind: 'drop', x: gx + rand(-10, 10), y: gy - 6, vx: rand(-20, 20), vy: rand(-30, -8), g: 90, max: 0.7, color: '#d4f4ff' })
      sfx.splash()
    },
  }
}

/** Uncle snoring in a sling chair under a newspaper. */
export function sleepyUncleGag(x: number, y: number): Gag {
  const chair = slingChair('#5aa9e8')
  const lk = look({ gender: 'm', hair: 'hair_buzz', hairColor: 6, top: 'top_hawaii' })
  return {
    x,
    y,
    w: 16,
    h: 22,
    lines: ['ครอก... ฟี้...', 'อีกห้านาที...', 'ใครปลุกลุง!? อ๋อ... มะพร้าวมาแล้วเหรอ', 'ฝันว่าถูกหวย... ครอก'],
    draw: (g, p) => {
      g.draw(chair.canvas, Math.round(p.x - chair.ax), Math.round(p.y - chair.ay))
      const sp = avatarSprite(lk, 'back', 'sit')
      g.draw(sp.canvas, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h + 2))
      // Newspaper over the face.
      const up = p.react > 0 ? -4 : 0
      g.rect(p.x - 5, p.y - 22 + up, 10, 6, '#f4f0e8')
      g.hline(p.x - 4, p.x + 3, p.y - 20 + up, '#8a8490')
      g.hline(p.x - 4, p.x + 1, p.y - 18 + up, '#8a8490')
      if (p.react <= 0 && Math.floor(p.t * 1.2) % 2 === 0) {
        g.px(p.x + 6, p.y - 26, '#e2e8ff')
        g.px(p.x + 7, p.y - 28, '#e2e8ff')
      }
    },
    react: (s, gx, gy) => {
      s.particles.add({ kind: 'text', x: gx + 6, y: gy - 30, text: 'Z', vy: -10, max: 0.9, color: '#e2e8ff' })
      sfx.tap()
    },
  }
}

/** A tourist red as a lobster. */
export function lobsterTouristGag(x: number, y: number, walk?: Gag['walk']): Gag {
  const lk = look({ gender: 'm', skin: 0, hair: 'hair_short', hairColor: 3, top: 'top_hawaii', head: 'head_sunhat' })
  return {
    x,
    y,
    walk,
    lines: ['Sawasdee krab! ร้อนมากกก', 'ลืมทาครีมกันแดด... สุกแล้ว', 'I love ส้มตำ! (เผ็ดมาก)', 'ผิวเปลี่ยนสีทุกชั่วโมง'],
    draw: (g, p) => {
      drawPerson(g, lk, p, 'front')
      // Sunburn glow on the cheeks and arms.
      g.alpha(0.45)
      g.rect(p.x - 3, p.y - 21, 6, 3, '#ff5a4a')
      g.alpha(1)
    },
    react: (s, gx, gy) => {
      s.particles.add({ kind: 'smoke', x: gx, y: gy - 26, vy: -10, max: 0.8, color: '#fff0e8', size: 2 })
      sfx.tap()
    },
  }
}

/** Influencer doing selfie number 200 with the landmark. */
export function selfieGag(x: number, y: number, lines: string[]): Gag {
  const lk = look({ gender: 'f', hair: 'hair_long', hairColor: 3, top: 'top_floral', head: 'head_heartshades' })
  return {
    x,
    y,
    lines,
    draw: (g, p) => drawPerson(g, lk, p, 'front', ['selfie']),
    react: (s, gx, gy) => {
      s.particles.sparkles(gx + 6, gy - 30, 5, '#ffffff', 6)
      sfx.click()
    },
  }
}

/** Lifeguard up in the tower (drawn at the tower's guard hook). */
export function lifeguardGag(x: number, y: number): Gag {
  const lk = look({ gender: 'm', skin: 3, hair: 'hair_buzz', top: 'top_polo', head: 'head_cap' })
  return {
    x,
    y,
    w: 16,
    h: 16,
    z: 1,
    lines: ['ปรี๊ดดด! อย่าว่ายเลยธงนะ!', 'ธงแดงแปลว่าคลื่นแรง ขึ้นมาก่อน!', 'พี่เฝ้าหาดมาสิบปี ไม่เคยได้ลงเล่นน้ำเลย', 'ทาครีมกันแดดด้วยน้องงง'],
    draw: (g, p) => {
      const sp = avatarSprite(lk, 'front', p.react > 0 ? 'happy' : 'stand')
      g.drawPart(sp.canvas, 0, 0, sp.w, 16, Math.round(p.x - sp.w / 2), Math.round(p.y - 16))
      if (p.react > 0) {
        g.rect(p.x + 3, p.y - 11, 3, 2, '#ff7a1a')
        if (Math.floor(p.t * 8) % 2) g.px(p.x + 7, p.y - 12, '#ffffff')
      }
    },
    react: (s) => {
      sfx.chime()
      void s
    },
  }
}

/** Walking vendor: ice cream (bell), sarongs (on the shoulder) or som tam (shoulder pole). */
export function walkingVendorGag(kind: 'icecream' | 'sarong' | 'somtam', x0: number, x1: number, y: number): Gag {
  const lk = look(kind === 'sarong' ? { gender: 'f', hair: 'hair_bun', top: 'top_floral', bottom: 'bot_sarong', head: 'head_sunhat' } : kind === 'somtam' ? { gender: 'f', hair: 'hair_bun', top: 'top_mohom', head: 'head_ngob' } : { gender: 'm', hair: 'hair_short', top: 'top_white', head: 'head_cap' })
  const lines = {
    icecream: ['ไอติม ๆ กริ๊ง ๆ ๆ', 'ไอติมกะทิใส่ขนมปังจ้า', 'ร้อน ๆ แบบนี้ต้องไอติม!'],
    sarong: ['ผ้าปาเต๊ะผืนละร้อยจ้า', 'ผืนนี้ลายชบา สวยมาก', 'คลุมไหล่เข้าวัดได้นะ'],
    somtam: ['ส้มตำ ๆ ปูม้าจ้า', 'ตำไทย ตำลาว ตำปู!', 'เผ็ดน้อยเผ็ดมากบอกได้'],
  }[kind]
  const baskets = somtamBaskets()
  const rack = sarongRack()
  return {
    x: x0,
    y,
    lines,
    walk: { x0, x1, speed: 7 },
    draw: (g, p) => {
      if (kind === 'somtam') {
        drawPerson(g, lk, p, 'front')
        g.draw(baskets.canvas, Math.round(p.x - baskets.ax), Math.round(p.y - 12 - baskets.ay + 8))
        return
      }
      if (kind === 'sarong') {
        drawPerson(g, lk, p, 'front')
        // A pile of sarongs over the shoulder.
        for (let i = 0; i < 5; i++) g.rect(p.x + (p.flip ? -9 : 4), p.y - 17 + i * 2, 5, 2, ['#e8514a', '#3aa8c8', '#ffd23f', '#6a4fb0', '#43905a'][i])
        void rack
        return
      }
      // Ice-cream box on a strap, a bell.
      drawPerson(g, lk, p, 'front')
      g.rect(p.x - 5, p.y - 13, 10, 6, '#fffaf0')
      g.rect(p.x - 5, p.y - 13, 10, 2, '#5aa9e8')
      g.px(p.x + (Math.floor(p.t * 6) % 2 ? 6 : 5), p.y - 16, '#ffd23f')
    },
    react: (s, gx, gy) => {
      if (kind === 'icecream') sfx.bell(3)
      else sfx.tap()
      s.particles.sparkles(gx, gy - 24, 4, '#fff3a6', 6)
    },
  }
}

/** A masseuse working on a tourist lying on the mat. */
export function massageGag(x: number, y: number): Gag {
  const lk = look({ gender: 'f', skin: 2, hair: 'hair_bun', top: 'top_mohom', head: 'head_massage' })
  const client = look({ gender: 'm', top: 'top_hawaii' })
  return {
    x,
    y,
    w: 30,
    h: 20,
    z: 1,
    lines: ['ตรงนี้เมื่อยไหมคะ', 'โอ๊ยยย ตรงนั้นแหละ!!', 'ผ่อนคลาย~ หายใจลึก ๆ', 'หลับไปแล้วค่ะลูกค้า'],
    draw: (g, p) => {
      const sp = avatarSprite(client, 'back', 'stand')
      const c = g.ctx
      c.save()
      c.translate(Math.round(p.x - g.ox), Math.round(p.y - 5 - g.oy))
      c.rotate(-Math.PI / 2)
      c.drawImage(sp.canvas, -Math.round(sp.h / 2), -Math.round(sp.w / 2))
      c.restore()
      const push = Math.floor(p.t * (p.react > 0 ? 6 : 2)) % 2
      const m = avatarSprite(lk, 'front', 'kneel')
      g.draw(m.canvas, Math.round(p.x + 10 - m.w / 2), Math.round(p.y - m.h + 1 + push))
      if (p.react > 0 && Math.floor(p.t * 5) % 2) g.px(p.x - 6, p.y - 14, '#ffd23f')
    },
    react: (s, gx, gy) => {
      s.particles.hearts(gx, gy - 16, 2)
      sfx.tap()
    },
  }
}

export function kiteKidGag(x: number, y: number): Gag {
  const lk = look({ gender: 'm', hair: 'hair_short', top: 'top_tee_boon' })
  return {
    x,
    y,
    lines: ['ว่าวหนูบินสูงที่สุด!', 'ลมทะเลแรงดี', 'อย่าไปติดต้นมะพร้าวนะ!'],
    draw: (g, p: GagPose) => drawPerson(g, lk, p, 'back', [], p.react > 0 ? 'happy' : 'offer'),
    react: () => sfx.whoosh(),
  }
}

export { pick }
