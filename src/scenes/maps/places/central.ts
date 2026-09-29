// Central-region real places: พระปฐมเจดีย์, วัดโสธรวรารามฯ, วัดจุฬามณี,
// วัดสมานรัตนาราม and วัดพระพุทธบาท – each with its own outdoor map and
// walkable interiors (`<placeId>:<room>`).

import type { MapDef } from '../../world'
import { pathomChediMap, pathomViharnMap } from './central-pathom'
import { sothonUbosotMap, watSothonMap } from './central-sothon'
import { chulamaneeHallMap, watChulamaneeMap } from './central-chulamanee'
import { samarnShrineMap, watSamarnMap } from './central-samarn'
import { phutthabatMondopMap, watPhutthabatMap } from './central-phutthabat'

export const MAPS: Record<string, () => MapDef> = {
  pathom_chedi: pathomChediMap,
  'pathom_chedi:viharn': pathomViharnMap,
  wat_sothon: watSothonMap,
  'wat_sothon:ubosot': sothonUbosotMap,
  wat_chulamanee: watChulamaneeMap,
  'wat_chulamanee:hall': chulamaneeHallMap,
  wat_samarn: watSamarnMap,
  'wat_samarn:shrine': samarnShrineMap,
  wat_phutthabat: watPhutthabatMap,
  'wat_phutthabat:mondop': phutthabatMondopMap,
}
