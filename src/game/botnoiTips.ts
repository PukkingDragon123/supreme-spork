// One-time feature tips: the first time the player meets a system Bot Noi
// pops up with 1–3 bubbles and highlights it. Seen ids are kept in
// GameState.botnoi.seen. Triggers (what counts as "meeting" a system) live in
// the UI (src/ui/botnoi/Tips.tsx); this file is the pure data + picker.

export interface TipDef {
  id: string
  /** 1–3 bubbles; a leading `expr|` sets Bot Noi's face. */
  lines: string[]
  /** Only once the player has reached this level. */
  level?: number
}

export const TIPS: TipDef[] = [
  { id: 'stall', lines: ['happy|ร้านค้าประจำที่มีของกินของฝากเฉพาะถิ่นครับ!', 'normal|ซื้อแล้วได้ทั้งบุญช่วยชุมชน บางชิ้นเป็นของสะสมด้วย คุยกับแม่ค้าได้ เผื่อมีเควสต์นะ'] },
  { id: 'market', lines: ['surprised|ตลาดนัดสายบุญ! ที่นี่วางขายของที่ไม่ใช้ และซื้อของจากผู้เล่นคนอื่นได้ครับ', 'wink|ตั้งราคาดี ๆ ขายได้ไวนะ ของขายแล้วกลับมากดรับเหรียญด้วย'] },
  { id: 'collection', lines: ['love|สมุดสะสมครับ! ของที่ระลึกจากทั่วไทยเก็บไว้ในนี้', 'happy|สะสมครบชุดมีรางวัล ของที่ได้ใหม่จะมีจุดแดงบอกนะครับ'] },
  { id: 'event', level: 10, lines: ['surprised|ข่าวด่วนครับ! กิจกรรม “หนีน้ำท่วม” เปิดแล้ว', 'happy|แตะป้ายอีเวนต์ตรงนี้ ช่วยชาวบ้าน เก็บตั๋ว แลกของรางวัลสุดพิเศษครับ'] },
  { id: 'pass', lines: ['happy|นี่คือบัตรผ่านอีเวนต์ครับ ทำภารกิจอีเวนต์เก็บแต้ม เลื่อนขั้นรับรางวัลทีละขั้น', 'wink|แถวบนฟรีทุกคน แถวล่างเป็นรางวัลพิเศษนะครับ'] },
  { id: 'hub', lines: ['love|ยินดีต้อนรับสู่ย่านตลาดครับ! ที่นี่มีร้านเก๋ ๆ กับเพื่อนผู้เล่นเดินเล่นเพียบ', 'normal|อ่านบอร์ดข่าวตลาด ปั๊มพาสปอร์ต แล้วลองชิมของอร่อยประจำย่านนะครับ'] },
  { id: 'fair', lines: ['happy|งานวัดมาแล้ว! ไฟระยิบระยับ ชิงช้าสวรรค์ ซุ้มเกมเพียบครับ', 'wink|เล่นซุ้มเกมเก็บตั๋ว แล้วเอาไปแลกของที่ซุ้มรางวัลได้นะ'] },
  { id: 'cook', level: 10, lines: ['love|ครัวเปิดแล้วครับ! ทำอาหารตามจังหวะให้แม่น ๆ ได้จานสวย', 'happy|อาหารที่ทำเองเอาไปใส่บาตรได้ บุญพิเศษกว่าเดิมอีกครับ'] },
  { id: 'craft', level: 5, lines: ['happy|โต๊ะช่างไม้ปลดล็อกแล้วครับ! เอาวัสดุที่เก็บได้มาสร้างเฟอร์นิเจอร์', 'normal|วัสดุหาได้จากพื้นในวัด และจากการทำบุญแต่ละอย่างนะครับ'] },
  { id: 'jobs', lines: ['happy|งานอาสาในวัดครับ! ทำงานสั้น ๆ ได้บุญกับเหรียญ', 'wink|ทำต่อเนื่องได้คอมโบ ยิ่งแม่นยิ่งได้เยอะนะครับ'] },
  { id: 'online_chat', lines: ['surprised|นี่คือแชทกับผู้เล่นที่อยู่ในแผนที่เดียวกันครับ', 'normal|ใช้คำสุภาพน้า ส่งอีโมตกับกด “สาธุ” ให้กันก็ได้บุญนะครับ'] },
  { id: 'online_card', lines: ['happy|การ์ดผู้เล่นครับ! ดูเลเวล ส่งของขวัญ แลกของ หรือเพิ่มเป็นเพื่อนได้เลย'] },
  { id: 'rank', lines: ['think|อันดับวัดประจำภาคครับ ทำบุญในภาคไหน แต้มวัดนั้นก็เพิ่ม', 'happy|เลื่อนแรงก์ได้ ปลดล็อกวัดดังแห่งใหม่ด้วยนะครับ'] },
  { id: 'rooms', lines: ['love|บ้านเรามีหลายห้องนะครับ! กดลูกศรเพื่อเดินไปห้องอื่น', 'normal|แตะชื่อห้องเพื่อดูทุกห้อง ห้องใหม่ปลดล็อกได้เมื่อเลเวลถึงครับ'] },
  { id: 'chant_memory', lines: ['think|ด่านที่มีรูปสมาธิคือด่าน “ท่องจำ” ครับ คำจะค่อย ๆ หายไป', 'happy|สวดด่านก่อน ๆ บ่อย ๆ จะจำได้เอง เก่งแน่นอน!'] },
]

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]))

/** Split "expr|text". */
export function tipLine(s: string): { e: string; t: string } {
  const i = s.indexOf('|')
  return i > 0 ? { e: s.slice(0, i), t: s.slice(i + 1) } : { e: 'normal', t: s }
}

/**
 * The tip to show now: the first triggered one not yet seen whose level is
 * reached. `triggered` is the list of tip ids whose system is on screen.
 */
export function pickTip(triggered: string[], seen: string[], level: number): TipDef | null {
  for (const id of triggered) {
    const t = TIP_BY_ID[id]
    if (!t || seen.includes(id)) continue
    if ((t.level ?? 1) > level) continue
    return t
  }
  return null
}
