// Crafting materials (วัสดุ) used to make furniture for the player's home.
// Earned from prayers, daily chests, pickups around the temples and
// mini-games; bundles can also be bought with Boon Coins.

export type MaterialId = 'wood' | 'cloth' | 'clay' | 'gold' | 'flower'

export const MATERIAL_IDS: MaterialId[] = ['wood', 'cloth', 'clay', 'gold', 'flower']

export const MATERIAL_INFO: Record<MaterialId, { name: string; desc: string }> = {
  wood: { name: 'ไม้', desc: 'กิ่งไม้และแผ่นไม้สัก ใช้ทำเฟอร์นิเจอร์แทบทุกชิ้น' },
  cloth: { name: 'ผ้า', desc: 'ผ้าฝ้ายและผ้าไหมหลากสี สำหรับหมอน ม่าน และเบาะ' },
  clay: { name: 'ดินเผา', desc: 'ดินเผาและเซรามิก ทำกระถาง แจกัน และโคมไฟ' },
  gold: { name: 'ทองคำเปลว', desc: 'แผ่นทองเล็ก ๆ ประดับของชิ้นพิเศษให้งดงาม' },
  flower: { name: 'ดอกไม้', desc: 'ดอกลีลาวดีและดอกบัว สำหรับของตกแต่งหอม ๆ' },
}

export type Materials = Record<MaterialId, number>

export function emptyMaterials(): Materials {
  return { wood: 0, cloth: 0, clay: 0, gold: 0, flower: 0 }
}
