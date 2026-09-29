// Shared schema for collectibles & souvenirs (ของสะสม / ของที่ระลึก).
// The main catalogue, art and stock logic live in src/game/data/collectibles/
// and src/game/collectibles.ts; other systems (temple ranks, hub markets,
// events) may add their own groups using this schema.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/** Seasonal windows (Thai calendar flavour). 'always' = year-round. */
export type SeasonId = 'always' | 'songkran' | 'rainy' | 'loy_krathong' | 'cool' | 'new_year' | 'chinese_new_year' | 'flood_event'

export type CollectibleKind =
  | 'figure'
  | 'keychain'
  | 'magnet'
  | 'postcard'
  | 'amulet'
  | 'plush'
  | 'snowglobe'
  | 'stamp'
  | 'pin'
  | 'relic'
  | 'toy'
  | 'charm'

/**
 * Procedural art spec. The collectible art module draws the `kind` base
 * (e.g. a keychain ring, a postcard frame, a snow globe) with a `motif`
 * (e.g. 'elephant', 'chedi', 'naga', 'rooster', 'hippo', 'cat', 'lotus', 'fish')
 * in the given palette. Unknown motifs fall back to a generic star.
 */
export interface CollectibleArt {
  motif: string
  /** [main, accent, detail] hex colours. */
  palette: [string, string, string]
  /** Optional sparkle / foil finish (auto for epic+). */
  foil?: boolean
}

export interface CollectibleDef {
  id: string
  name: string
  desc: string
  rarity: Rarity
  kind: CollectibleKind
  /** Series / set name for the collection book, e.g. 'ของดีภาคเหนือ'. */
  series: string
  season?: SeasonId
  /** Place id when it is a fixed item of that place's shops. */
  place?: string
  /** Base value in Boon Coins (shop price / market fair value). */
  value: number
  art: CollectibleArt
  /** False for bound rewards that cannot be traded. Default true. */
  tradeable?: boolean
}
