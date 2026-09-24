// Deity images for shrines (front view on a lotus base). Friendly and soft,
// but kept dignified: no silly expressions.

import type { Surface } from '../engine/pixel'
import { P } from './palette'
import { mixHex } from './characters'
import { DEITY_BY_ID } from '../game/data/deities'
import { guardianStatue } from './props'

function lotusBase(g: Surface, cx: number, baseY: number, s: number, w = 34) {
  const hw = (w * s) / 2
  g.rect(cx - hw, baseY - 3 * s, hw * 2, 3 * s, P.goldD)
  for (let i = 0; i < 7; i++) {
    const x = cx - hw + (i + 0.5) * ((hw * 2) / 7)
    g.poly(
      [
        [x - 3 * s, baseY - 3 * s],
        [x, baseY - 9 * s],
        [x + 3 * s, baseY - 3 * s],
      ],
      i % 2 ? '#f7b3c8' : '#ffd6e0',
    )
  }
}

function crown(g: Surface, cx: number, topY: number, s: number, h = 12, w = 8) {
  for (let i = 0; i < h; i++) {
    const t = i / h
    const hw = ((w * s) / 2) * (1 - t * 0.8)
    g.rect(cx - hw, topY - i * s, hw * 2, s, i % 3 === 0 ? P.goldD : P.gold)
  }
  g.circle(cx, topY - h * s - s, Math.max(1, s), P.goldL)
  g.px(cx, topY - 2 * s, P.redL)
}

export function drawDeity(g: Surface, id: string, cx: number, baseY: number, s = 1, t = 0) {
  const d = DEITY_BY_ID[id]
  if (!d) return
  const pal = d.palette
  const X = (v: number) => cx + v * s
  const Y = (v: number) => baseY - v * s
  switch (id) {
    case 'ganesha': {
      lotusBase(g, cx, baseY, s)
      // Dhoti and lap.
      g.ellipse(X(0), Y(12), 14 * s, 5 * s, pal.robe)
      g.ellipse(X(3), Y(12), 9 * s, 4 * s, pal.robeD)
      // Belly and chest.
      g.ellipse(X(0), Y(19), 9 * s, 8 * s, pal.body)
      g.ellipse(X(3), Y(19), 5 * s, 7 * s, pal.bodyD)
      g.rect(X(-5), Y(24), 10 * s, 2 * s, pal.gold)
      // Arms (four).
      g.thickLine(X(-8), Y(26), X(-15), Y(33), 1.8 * s, pal.body)
      g.thickLine(X(8), Y(26), X(15), Y(33), 1.8 * s, pal.body)
      g.thickLine(X(-8), Y(22), X(-12), Y(15), 1.8 * s, pal.body)
      g.thickLine(X(8), Y(22), X(12), Y(15), 1.8 * s, pal.body)
      g.circle(X(-15), Y(34), 1.6 * s, pal.body)
      g.circle(X(15), Y(34), 1.6 * s, pal.body)
      g.circle(X(-15), Y(36), 2 * s, '#ff9fc0') // lotus
      g.rect(X(14), Y(40), 2 * s, 6 * s, pal.gold) // axe handle
      g.rect(X(15), Y(40), 4 * s, 3 * s, P.stoneL)
      g.circle(X(12), Y(14), 2.4 * s, P.orange) // laddu
      g.px(X(11), Y(15), P.orangeL)
      // Head: ears, face, trunk, tusk.
      g.ellipse(X(-10), Y(35), 6 * s, 7 * s, pal.bodyD)
      g.ellipse(X(10), Y(35), 6 * s, 7 * s, pal.bodyD)
      g.ellipse(X(-10), Y(35), 4 * s, 5 * s, '#ffc4d0')
      g.ellipse(X(10), Y(35), 4 * s, 5 * s, '#ffc4d0')
      g.ellipse(X(0), Y(34), 8 * s, 7.5 * s, pal.body)
      for (let i = 0; i <= 10; i++) {
        const a = i / 10
        g.circle(X(Math.sin(a * 2.4) * 4), Y(30 - a * 9), (2.4 - a) * s, i > 8 ? pal.bodyD : pal.body)
      }
      g.rect(X(-4), Y(29), 2 * s, 3 * s, '#fffaf0')
      g.px(X(-3), Y(36), P.ink)
      g.px(X(3), Y(36), P.ink)
      g.px(X(0), Y(39), P.redL)
      crown(g, cx, Y(41), s, 11, 10)
      // Mouse companion.
      g.ellipse(X(17), Y(2), 3 * s, 2 * s, '#b3a8a4')
      g.circle(X(19.5), Y(3), 1.2 * s, '#b3a8a4')
      g.px(X(20), Y(3), P.ink)
      g.line(X(14), Y(1), X(12), Y(3), '#8c8187')
      break
    }
    case 'brahma': {
      lotusBase(g, cx, baseY, s)
      g.ellipse(X(0), Y(12), 14 * s, 5 * s, pal.robe)
      g.ellipse(X(3), Y(12), 9 * s, 4 * s, pal.robeD)
      g.rect(X(-8), Y(30), 16 * s, 18 * s, pal.body)
      g.rect(X(3), Y(30), 5 * s, 18 * s, pal.bodyD)
      g.rect(X(-8), Y(22), 16 * s, 2 * s, P.red)
      // Eight arms fanned out.
      const arms: [number, number, string][] = [
        [-16, 34, P.red],
        [-18, 26, '#fffaf0'],
        [-17, 18, P.blue],
        [-12, 13, P.gold],
        [16, 34, P.leaf],
        [18, 26, '#fffaf0'],
        [17, 18, P.purple],
        [12, 13, P.gold],
      ]
      for (const [ax, ay, c] of arms) {
        g.line(X(Math.sign(ax) * 7), Y(27), X(ax), Y(ay), pal.body)
        g.circle(X(ax), Y(ay), 1.6 * s, pal.body)
        g.px(X(ax + Math.sign(ax)), Y(ay + 1), c)
      }
      // Four faces (three visible).
      g.ellipse(X(-8), Y(36), 4 * s, 5 * s, pal.bodyD)
      g.ellipse(X(8), Y(36), 4 * s, 5 * s, pal.bodyD)
      g.ellipse(X(0), Y(36), 6 * s, 6.5 * s, pal.body)
      g.line(X(-3), Y(37), X(-1), Y(37), P.goldDD)
      g.line(X(1), Y(37), X(3), Y(37), P.goldDD)
      g.line(X(-10), Y(37), X(-9), Y(37), P.goldDD)
      g.line(X(9), Y(37), X(10), Y(37), P.goldDD)
      crown(g, cx, Y(42), s, 12, 9)
      crown(g, X(-8), Y(40), s * 0.7, 9, 7)
      crown(g, X(8), Y(40), s * 0.7, 9, 7)
      break
    }
    case 'guanyin': {
      // Clouds and lotus.
      for (const [x, y] of [
        [-12, 2],
        [0, 1],
        [12, 2],
      ])
        g.ellipse(X(x), Y(y), 8 * s, 3 * s, '#eef4ff')
      lotusBase(g, cx, Y(3), s, 26)
      // Flowing white robe.
      g.poly(
        [
          [X(-6), Y(38)],
          [X(6), Y(38)],
          [X(12), Y(12)],
          [X(-12), Y(12)],
        ],
        pal.robe,
      )
      g.poly(
        [
          [X(2), Y(38)],
          [X(6), Y(38)],
          [X(12), Y(12)],
          [X(4), Y(12)],
        ],
        pal.robeD,
      )
      g.line(X(-8), Y(24), X(-2), Y(14), pal.robeD)
      // Hands with the vase and willow branch.
      g.circle(X(0), Y(26), 2.4 * s, pal.body)
      g.rect(X(-1.5), Y(30), 3 * s, 4 * s, '#dfe7f2')
      g.rect(X(-1), Y(31), 2 * s, 1 * s, P.blue)
      g.line(X(0), Y(31), X(-4), Y(38), P.leaf)
      g.px(X(-5), Y(38), P.grass)
      // Halo, hood and face.
      g.circle(X(0), Y(44), 9 * s, 'rgba(212,241,255,0.8)')
      g.ellipse(X(0), Y(43), 6.5 * s, 7 * s, pal.robe)
      g.ellipse(X(0), Y(42), 4.5 * s, 5 * s, pal.body)
      g.line(X(-3), Y(42), X(-1), Y(42), '#b58a70')
      g.line(X(1), Y(42), X(3), Y(42), '#b58a70')
      g.px(X(0), Y(45), P.red)
      g.px(X(0), Y(39), '#e89a90')
      break
    }
    case 'lakshmi': {
      // Big pink lotus throne.
      for (let i = 0; i < 9; i++) {
        const x = -18 + i * 4.5
        g.poly(
          [
            [X(x - 3), Y(2)],
            [X(x), Y(12 - Math.abs(i - 4))],
            [X(x + 3), Y(2)],
          ],
          i % 2 ? '#e8709e' : '#ff9fc0',
        )
      }
      g.ellipse(X(0), Y(12), 13 * s, 4 * s, pal.robe)
      g.poly(
        [
          [X(-8), Y(32)],
          [X(8), Y(32)],
          [X(11), Y(12)],
          [X(-11), Y(12)],
        ],
        pal.robe,
      )
      g.poly(
        [
          [X(2), Y(32)],
          [X(8), Y(32)],
          [X(11), Y(12)],
          [X(5), Y(12)],
        ],
        pal.robeD,
      )
      g.line(X(-9), Y(28), X(7), Y(16), pal.gold)
      // Four arms: lotuses above, blessing and coins below.
      g.thickLine(X(-7), Y(30), X(-14), Y(36), 1.8 * s, pal.body)
      g.thickLine(X(7), Y(30), X(14), Y(36), 1.8 * s, pal.body)
      g.circle(X(-14), Y(38), 2.4 * s, '#ff9fc0')
      g.circle(X(14), Y(38), 2.4 * s, '#ff9fc0')
      g.thickLine(X(-7), Y(24), X(-12), Y(18), 1.8 * s, pal.body)
      g.thickLine(X(7), Y(24), X(12), Y(18), 1.8 * s, pal.body)
      g.circle(X(-12), Y(18), 1.6 * s, pal.body)
      g.circle(X(12), Y(18), 1.6 * s, pal.body)
      const coin = Math.floor(t * 4) % 4
      for (let i = 0; i < 3; i++) g.circle(X(12), Y(15 - ((i * 3 + coin) % 10)), 1.1 * s, P.gold)
      // Head: hair behind, then the face.
      g.ellipse(X(0), Y(39), 6.2 * s, 6.4 * s, '#3b2f40')
      g.rect(X(-6), Y(38), 3 * s, 10 * s, '#3b2f40')
      g.rect(X(3), Y(38), 3 * s, 10 * s, '#3b2f40')
      g.ellipse(X(0), Y(37.5), 4.4 * s, 4.8 * s, pal.body)
      g.line(X(-2.5), Y(38), X(-1), Y(38), P.ink)
      g.line(X(1), Y(38), X(2.5), Y(38), P.ink)
      g.px(X(0), Y(40), P.red)
      crown(g, cx, Y(43), s, 9, 9)
      break
    }
    case 'naga': {
      // Coiled body with golden belly scales.
      for (let i = 0; i < 3; i++) {
        const y = 4 + i * 6
        g.ellipse(X(0), Y(y), (17 - i * 3) * s, 3.8 * s, pal.bodyD)
        g.ellipse(X(-1), Y(y + 0.5), (16 - i * 3) * s, 3 * s, pal.body)
        for (let k = -3; k <= 3; k++) g.px(X(k * (4.5 - i)), Y(y - 1), pal.robe)
      }
      // Tail tip curling out.
      g.thickLine(X(14), Y(3), X(20), Y(8), 1.8 * s, pal.body)
      g.px(X(21), Y(9), pal.gold)
      // S-curved neck.
      for (let i = 0; i <= 16; i++) {
        const a = i / 16
        const x = Math.sin(a * Math.PI * 1.4) * 4
        g.circle(X(x), Y(18 + a * 22), 3.4 * s, pal.body)
        if (i % 3 === 0) g.px(X(x - 1), Y(18 + a * 22), pal.robe)
      }
      // Head with crest, glowing eyes and a forked tongue.
      g.ellipse(X(0), Y(44), 6.5 * s, 5.2 * s, pal.body)
      g.ellipse(X(0), Y(40.5), 4.2 * s, 2.6 * s, pal.bodyD)
      g.poly(
        [
          [X(-6), Y(47)],
          [X(-4), Y(55)],
          [X(-1.5), Y(49)],
          [X(0), Y(58)],
          [X(1.5), Y(49)],
          [X(4), Y(55)],
          [X(6), Y(47)],
        ],
        pal.gold,
      )
      g.line(X(-7), Y(43), X(-10), Y(46), pal.gold)
      g.line(X(7), Y(43), X(10), Y(46), pal.gold)
      g.circle(X(-2.6), Y(45), 1.3 * s, P.redL)
      g.circle(X(2.6), Y(45), 1.3 * s, P.redL)
      g.px(X(-2.6), Y(45), P.ink)
      g.px(X(2.6), Y(45), P.ink)
      g.vline(X(0), Y(38), Y(35), P.red)
      g.px(X(-1), Y(34), P.red)
      g.px(X(1), Y(34), P.red)
      break
    }
    case 'vessavana': {
      const spr = guardianStatue()
      g.drawScaled(spr.canvas, Math.round(cx - spr.ax * s), Math.round(baseY - spr.ay * s), Math.max(1, Math.round(s)))
      break
    }
  }
}

/** Soft aura behind a deity, tinted by its palette. */
export function deityAura(id: string): string {
  return DEITY_BY_ID[id]?.palette.aura ?? '#fff3a6'
}

export { mixHex }
