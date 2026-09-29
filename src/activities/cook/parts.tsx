// Small shared pieces of the cooking UI.

import { dishUrl, foodIconUrl, hasFoodIcon } from '../../art/cooking'
import { Icon } from '../../ui/components/common'

/** Item icon for cooking items (falls back to the shared icon set). */
export function FoodIcon({ id, size = 32, class: cls }: { id: string; size?: number; class?: string }) {
  if (!hasFoodIcon(id)) return <Icon name={id} size={size} class={cls} />
  const scale = Math.max(1, Math.ceil((size * (window.devicePixelRatio || 1)) / 16))
  return <img class={`px ${cls ?? ''}`} src={foodIconUrl(id, scale)} width={size} height={size} alt="" draggable={false} />
}

/** Big plated dish image (50×38 art pixels). */
export function DishImg({ id, scale = 3, class: cls }: { id: string; scale?: number; class?: string }) {
  return <img class={`px ${cls ?? ''}`} src={dishUrl(id, scale)} width={52 * scale} height={40 * scale} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
}
