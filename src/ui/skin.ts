// Pixel UI skins, generated in code as 9-slice images and exposed to CSS as
// custom properties (e.g. `border-image-source: var(--sk-panel)`).
// Style: dark outline, wooden frame, parchment body, green title plates –
// the classic cosy pixel RPG look.

import { bake, type Surface } from '../engine/pixel'

export const UI = {
  outline: '#3b2616',
  woodDD: '#6b4428',
  woodD: '#8a5a30',
  wood: '#b67a42',
  woodL: '#d89d5e',
  parch: '#f4e3bd',
  parchD: '#e4c890',
  parchL: '#fbf1d8',
  green: '#4f9e4c',
  greenD: '#2f6e36',
  greenDD: '#1f4a26',
  greenL: '#86cc6a',
  gold: '#f2bf3f',
  goldD: '#c98a24',
  goldL: '#ffe58a',
  red: '#d9533f',
  redD: '#9c3226',
  redL: '#f28a6e',
  blue: '#4f8fd8',
  blueD: '#2f5f9e',
  blueL: '#8cc0f2',
  text: '#3b2616',
  textOnGreen: '#fff6dc',
}

/** Rectangle with notched (pixel-rounded) corners. */
function notched(g: Surface, x: number, y: number, w: number, h: number, c: string, notch = 1) {
  g.rect(x + notch, y, w - notch * 2, h, c)
  g.rect(x, y + notch, w, h - notch * 2, c)
}

function panelSkin(): string {
  // 24×24 source, 8 px slices.
  return bake(24, 24, (g) => {
    notched(g, 0, 0, 24, 24, UI.outline, 2)
    g.px(1, 1, UI.outline)
    g.px(22, 1, UI.outline)
    g.px(1, 22, UI.outline)
    g.px(22, 22, UI.outline)
    notched(g, 1, 1, 22, 22, UI.wood, 1)
    g.rect(2, 1, 20, 1, UI.woodL)
    g.rect(1, 2, 1, 20, UI.woodL)
    g.rect(2, 22, 20, 1, UI.woodD)
    g.rect(22, 2, 1, 20, UI.woodD)
    // Wood grain flecks.
    for (const [x, y] of [
      [5, 2],
      [12, 3],
      [18, 2],
      [3, 9],
      [2, 16],
      [21, 7],
      [21, 15],
      [8, 21],
      [16, 21],
    ])
      g.px(x, y, UI.woodD)
    notched(g, 4, 4, 16, 16, UI.woodDD, 1)
    g.rect(5, 5, 14, 14, UI.parch)
    g.rect(5, 5, 14, 1, UI.parchD)
    g.rect(5, 5, 1, 14, UI.parchD)
    // Corner rivets.
    for (const [x, y] of [
      [2, 2],
      [21, 2],
      [2, 21],
      [21, 21],
    ])
      g.px(x, y, UI.goldL)
  }).toDataURL()
}

function plateSkin(fill: string, light: string, dark: string, outline: string): string {
  // 12×12 source, 4 px slices.
  return bake(12, 12, (g) => {
    notched(g, 0, 0, 12, 12, outline, 1)
    g.rect(1, 1, 10, 10, fill)
    g.rect(1, 1, 10, 1, light)
    g.rect(1, 10, 10, 1, dark)
  }).toDataURL()
}

function buttonSkin(fill: string, light: string, dark: string, pressed = false): string {
  // 12×14 source, slices 4 (top/sides) and 6 (bottom lip).
  return bake(12, 14, (g) => {
    const top = pressed ? 2 : 0
    notched(g, 0, top, 12, 14 - top, UI.outline, 2)
    g.px(1, top + 1, UI.outline)
    g.px(10, top + 1, UI.outline)
    notched(g, 1, top + 1, 10, 12 - top, dark, 1)
    notched(g, 1, top + 1, 10, pressed ? 10 : 9, fill, 1)
    g.rect(2, top + 1, 8, 1, light)
    g.px(2, top + 2, light)
  }).toDataURL()
}

function slotSkin(active = false): string {
  return bake(12, 12, (g) => {
    notched(g, 0, 0, 12, 12, UI.woodDD, 1)
    g.rect(1, 1, 10, 10, active ? '#fff1c2' : '#e6cc98')
    g.rect(1, 1, 10, 1, active ? UI.goldD : '#c7a468')
    g.rect(1, 1, 1, 10, active ? UI.goldD : '#c7a468')
    g.rect(1, 10, 10, 1, '#f6e4bc')
    g.rect(10, 1, 1, 10, '#f6e4bc')
  }).toDataURL()
}

function bubbleSkin(): string {
  return bake(12, 12, (g) => {
    notched(g, 0, 0, 12, 12, UI.outline, 2)
    g.px(1, 1, UI.outline)
    g.px(10, 1, UI.outline)
    g.px(1, 10, UI.outline)
    g.px(10, 10, UI.outline)
    notched(g, 1, 1, 10, 10, '#fffaf0', 1)
    g.rect(2, 10, 8, 1, '#e8dcc6')
  }).toDataURL()
}

function darkSkin(): string {
  return bake(12, 12, (g) => {
    notched(g, 0, 0, 12, 12, '#150d18', 1)
    g.rect(1, 1, 10, 10, 'rgba(38,24,44,0.86)')
    g.rect(1, 1, 10, 1, 'rgba(120,90,130,0.6)')
  }).toDataURL()
}

/** 9×9 card: dark wood outline, highlight line, flat fill (3 px slices). */
function cardSkin(fill: string, light: string, dark: string, outline: string = UI.woodDD): string {
  return bake(9, 9, (g) => {
    notched(g, 0, 0, 9, 9, outline, 1)
    g.rect(1, 1, 7, 7, fill)
    g.rect(1, 1, 7, 1, light)
    g.rect(1, 7, 7, 1, dark)
    g.px(1, 1, fill)
    g.px(7, 1, fill)
  }).toDataURL()
}

/** Inset input field (3 px slices). */
function inputSkin(): string {
  return bake(9, 9, (g) => {
    notched(g, 0, 0, 9, 9, UI.woodDD, 1)
    g.rect(1, 1, 7, 7, UI.parchL)
    g.rect(1, 1, 7, 1, UI.parchD)
    g.rect(1, 1, 1, 7, UI.parchD)
  }).toDataURL()
}

/** Folder tab (top corners notched, open bottom) – 9×9, 3 px slices. */
function tabSkin(on: boolean): string {
  return bake(9, 9, (g) => {
    const fill = on ? UI.parch : UI.woodL
    const light = on ? UI.parchL : '#e8b77e'
    g.rect(1, 0, 7, 9, UI.outline)
    g.rect(0, 1, 9, 8, UI.outline)
    g.rect(1, 1, 7, 8, fill)
    g.rect(1, 1, 7, 1, light)
    if (!on) g.rect(1, 8, 7, 1, UI.woodD)
  }).toDataURL()
}

/** Long wooden strip behind the hotbar (8 px slices). */
function barSkin(): string {
  return bake(24, 24, (g) => {
    notched(g, 0, 0, 24, 24, UI.outline, 2)
    g.px(1, 1, UI.outline)
    g.px(22, 1, UI.outline)
    g.px(1, 22, UI.outline)
    g.px(22, 22, UI.outline)
    notched(g, 1, 1, 22, 22, UI.woodD, 1)
    g.rect(2, 1, 20, 2, UI.wood)
    g.rect(2, 1, 20, 1, UI.woodL)
    g.rect(2, 21, 20, 1, UI.woodDD)
    for (const [x, y] of [
      [4, 8],
      [11, 14],
      [18, 9],
      [7, 17],
      [15, 5],
    ])
      g.px(x, y, UI.woodDD)
    for (const [x, y] of [
      [2, 2],
      [21, 2],
      [2, 21],
      [21, 21],
    ])
      g.px(x, y, UI.goldL)
  }).toDataURL()
}

/** Recessed slot in the hotbar (4 px slices). */
function hotSlotSkin(active: boolean): string {
  return bake(12, 12, (g) => {
    notched(g, 0, 0, 12, 12, UI.outline, 1)
    g.rect(1, 1, 10, 10, active ? UI.goldD : UI.woodDD)
    g.rect(2, 2, 8, 8, active ? UI.gold : '#7a4e2c')
    g.rect(2, 2, 8, 1, active ? UI.goldL : '#946038')
    g.rect(2, 9, 8, 1, active ? '#b27418' : '#5e3a20')
  }).toDataURL()
}

/** Round-ish frame for the HUD portrait (8 px slices). */
function ringSkin(): string {
  return bake(24, 24, (g) => {
    g.circle(11.5, 11.5, 11.5, UI.outline)
    g.circle(11.5, 11.5, 10.5, UI.goldD)
    g.circle(11.5, 11.5, 9.5, UI.gold)
    g.circle(11.5, 11.5, 8.2, UI.outline)
    g.circle(11.5, 11.5, 7.4, '#8fd0f0')
  }).toDataURL()
}

/** Progress bar frame + fills (3 px slices). */
function barFrameSkin(): string {
  return bake(9, 9, (g) => {
    notched(g, 0, 0, 9, 9, UI.outline, 1)
    g.rect(1, 1, 7, 7, '#4a2e1c')
    g.rect(1, 1, 7, 1, '#2e1c10')
  }).toDataURL()
}

let installed = false

/** Generate every skin once and publish them as CSS custom properties. */
export function installSkins() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const root = document.documentElement.style
  const set = (k: string, url: string) => root.setProperty(k, `url(${url})`)
  set('--sk-panel', panelSkin())
  set('--sk-title', plateSkin(UI.green, UI.greenL, UI.greenD, UI.greenDD))
  set('--sk-title-gold', plateSkin(UI.gold, UI.goldL, UI.goldD, '#7a4f12'))
  set('--sk-btn', buttonSkin(UI.green, UI.greenL, UI.greenD))
  set('--sk-btn-down', buttonSkin(UI.green, UI.greenL, UI.greenD, true))
  set('--sk-btn-wood', buttonSkin(UI.wood, UI.woodL, UI.woodD))
  set('--sk-btn-wood-down', buttonSkin(UI.wood, UI.woodL, UI.woodD, true))
  set('--sk-btn-gold', buttonSkin(UI.gold, UI.goldL, UI.goldD))
  set('--sk-btn-gold-down', buttonSkin(UI.gold, UI.goldL, UI.goldD, true))
  set('--sk-btn-red', buttonSkin(UI.red, UI.redL, UI.redD))
  set('--sk-btn-red-down', buttonSkin(UI.red, UI.redL, UI.redD, true))
  set('--sk-btn-blue', buttonSkin(UI.blue, UI.blueL, UI.blueD))
  set('--sk-btn-blue-down', buttonSkin(UI.blue, UI.blueL, UI.blueD, true))
  set('--sk-btn-paper', buttonSkin(UI.parch, UI.parchL, UI.parchD))
  set('--sk-btn-paper-down', buttonSkin(UI.parch, UI.parchL, UI.parchD, true))
  set('--sk-slot', slotSkin())
  set('--sk-slot-on', slotSkin(true))
  set('--sk-bubble', bubbleSkin())
  set('--sk-dark', darkSkin())
  set('--sk-plate-wood', plateSkin(UI.wood, UI.woodL, UI.woodD, UI.outline))
  set('--sk-plate-paper', plateSkin(UI.parch, UI.parchL, UI.parchD, UI.woodDD))
  set('--sk-card', cardSkin(UI.parchL, '#fffaf0', UI.parchD))
  set('--sk-card-soft', cardSkin(UI.parch, UI.parchL, UI.parchD))
  set('--sk-card-gold', cardSkin('#fff1c2', '#fffbe6', UI.goldD, '#9a6418'))
  set('--sk-card-green', cardSkin('#dff2cf', '#f0fae6', '#a9d08e', UI.greenD))
  set('--sk-card-dark', cardSkin('#4a3226', '#5e4232', '#2e1c14', '#1c120c'))
  set('--sk-card-wood', cardSkin(UI.wood, UI.woodL, UI.woodD, UI.outline))
  set('--sk-input', inputSkin())
  set('--sk-tab', tabSkin(false))
  set('--sk-tab-on', tabSkin(true))
  set('--sk-bar', barSkin())
  set('--sk-hot', hotSlotSkin(false))
  set('--sk-hot-on', hotSlotSkin(true))
  set('--sk-ring', ringSkin())
  set('--sk-meter', barFrameSkin())
  set('--sk-btn-pink', buttonSkin('#f27aa6', '#ffb3cf', '#c24c7c'))
  set('--sk-btn-pink-down', buttonSkin('#f27aa6', '#ffb3cf', '#c24c7c', true))
  set('--sk-btn-dark', buttonSkin('#5a3e30', '#7a5644', '#3a261c'))
  set('--sk-btn-dark-down', buttonSkin('#5a3e30', '#7a5644', '#3a261c', true))
}
