// UI state for บอทน้อย: which sheet is open, where the robot should point
// in the world, and whether pop-ups (tutorial, tips) may show at all.

import { signal } from '@preact/signals'

export type BotMenuView = 'home' | 'quests' | 'tip' | 'joke' | 'replay' | 'hello'

/** Bot Noi's own sheet (tap him in the world, or the menu button). */
export const botMenu = signal<{ view: BotMenuView; n: number } | null>(null)
let seq = 0

export function openBotMenu(view: BotMenuView = 'home') {
  botMenu.value = { view, n: ++seq }
}

export function closeBotMenu() {
  botMenu.value = null
}

/** World point the tutorial wants Bot Noi to fly to and point at. */
export const botFocus = signal<{ x: number; y: number } | null>(null)

/** Something for Bot Noi to say in the world (speech bubble next to him). */
export const botSayQueue: { text: string; expr?: string }[] = []

export function botSay(text: string, expr?: string) {
  botSayQueue.push({ text, expr })
  if (botSayQueue.length > 3) botSayQueue.shift()
}

/**
 * Pop-ups (tutorial, arrival intro, feature tips) are off with `?notutorial`
 * (the smoke test) and, in dev, on `?skipintro` screenshots unless `&botnoi`.
 */
export function popupsAllowed(): boolean {
  if (typeof location === 'undefined') return true
  const q = new URLSearchParams(location.search)
  if (q.has('notutorial')) return false
  if (import.meta.env.DEV && q.has('skipintro') && !q.has('botnoi')) return false
  return true
}

/** `?nobot` hides the robot in the world (screenshots). */
export function botAllowedInWorld(): boolean {
  if (typeof location === 'undefined') return true
  return !new URLSearchParams(location.search).has('nobot')
}
