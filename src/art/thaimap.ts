// แผนที่ประเทศไทย – the illustrated travel map. The country is rasterised
// from hand-traced lon/lat outlines into an equirectangular pixel map, then
// painted like a cosy board-game map: region colours, relief shading, rivers,
// mountain ranges, forests, paddies, islands, a paper-cut shadow on the sea,
// a wooden frame with lat/long ticks, a compass rose and a magnified Bangkok
// inset. Everything static is baked once; the scene animates on top.

import { bake, createCanvas, ditherOn, mix, Surface, type Color } from '../engine/pixel'
import { HUB_ICON_DRAW } from './thaimap-hubs'
import { BEACH_ICON_DRAW } from './thaimap-beaches'
import { outlineCanvas, cached, type Sprite } from '../engine/sprite'
import { BANGKOK, INSET, MAP, proj, unproj, type Region } from '../game/data/places'

type LL = [number, number]

// ---------------------------------------------------------------------------
// Geography (lon, lat). Traced from memory of the real outline; accurate to a
// few kilometres, which is well below one map pixel (~2.8 km).

/** Andaman coast, Kraburi estuary (Ranong) → Satun. */
const T_AND: LL[] = [
  [98.6, 10.06], [98.55, 9.9], [98.5, 9.72], [98.44, 9.52], [98.37, 9.3], [98.32, 9.08], [98.27, 8.9],
  [98.25, 8.72], [98.24, 8.55], [98.27, 8.38], [98.3, 8.22], [98.4, 8.28], [98.5, 8.4], [98.58, 8.33],
  [98.66, 8.3], [98.74, 8.2], [98.83, 8.1], [98.9, 8.02], [98.96, 7.93], [99.05, 7.84], [99.12, 7.73],
  [99.22, 7.6], [99.33, 7.47], [99.43, 7.36], [99.5, 7.24], [99.6, 7.1], [99.7, 6.98], [99.8, 6.87],
  [99.9, 6.76], [100.0, 6.66], [100.08, 6.54], [100.12, 6.44],
]
/** Land border with Malaysia, Satun → Tak Bai. */
const B_MY: LL[] = [
  [100.12, 6.44], [100.22, 6.62], [100.35, 6.63], [100.46, 6.52], [100.62, 6.45], [100.78, 6.36],
  [100.88, 6.22], [100.96, 6.02], [101.03, 5.84], [101.09, 5.66], [101.16, 5.63], [101.22, 5.76],
  [101.34, 5.86], [101.52, 5.9], [101.66, 5.84], [101.8, 5.78], [101.92, 5.95], [102.02, 6.12], [102.1, 6.25],
]
/** Gulf coast, Tak Bai → north round the gulf → Hat Lek. */
const T_GULF: LL[] = [
  [102.1, 6.25], [101.98, 6.34], [101.84, 6.44], [101.7, 6.56], [101.56, 6.7], [101.44, 6.83], [101.33, 6.92],
  [101.28, 6.97], [101.2, 6.93], [101.08, 6.9], [100.95, 6.96], [100.82, 7.04], [100.68, 7.14], [100.58, 7.24],
  [100.5, 7.4], [100.43, 7.56], [100.37, 7.72], [100.32, 7.9], [100.28, 8.08], [100.26, 8.26], [100.3, 8.42],
  [100.33, 8.55], [100.18, 8.5], [100.08, 8.58], [100.0, 8.74], [99.94, 8.92], [99.9, 9.08], [99.86, 9.22],
  [99.75, 9.3], [99.62, 9.26], [99.48, 9.2], [99.36, 9.18], [99.27, 9.26], [99.23, 9.4], [99.24, 9.56],
  [99.2, 9.74], [99.15, 9.9], [99.17, 10.08], [99.22, 10.26], [99.3, 10.42], [99.24, 10.58], [99.2, 10.72],
  [99.28, 10.86], [99.4, 11.0], [99.5, 11.16], [99.56, 11.32], [99.62, 11.48], [99.7, 11.64], [99.78, 11.8],
  [99.84, 11.96], [99.92, 12.1], [100.0, 12.2], [99.98, 12.36], [99.96, 12.52], [99.97, 12.68], [99.99, 12.84],
  [100.05, 12.98], [100.1, 13.08], [100.03, 13.2], [99.98, 13.34], [100.06, 13.42], [100.2, 13.47],
  [100.34, 13.5], [100.46, 13.51], [100.58, 13.53], [100.7, 13.51], [100.82, 13.49], [100.93, 13.46],
  [100.98, 13.36], [100.96, 13.22], [100.91, 13.08], [100.88, 12.94], [100.88, 12.8], [100.92, 12.67],
  [101.05, 12.66], [101.2, 12.67], [101.34, 12.66], [101.45, 12.61], [101.58, 12.64], [101.72, 12.68],
  [101.86, 12.62], [101.98, 12.54], [102.1, 12.46], [102.2, 12.34], [102.28, 12.2], [102.38, 12.16],
  [102.5, 12.08], [102.6, 11.95], [102.7, 11.82], [102.82, 11.72], [102.92, 11.64],
]
/** Land border with Cambodia and Laos (Mekong), Hat Lek → Golden Triangle. */
const B_EAST: LL[] = [
  [102.92, 11.64], [102.9, 11.84], [102.82, 12.02], [102.74, 12.2], [102.66, 12.4], [102.56, 12.58],
  [102.5, 12.78], [102.46, 12.98], [102.42, 13.18], [102.36, 13.38], [102.4, 13.56], [102.54, 13.66],
  [102.68, 13.78], [102.76, 13.96], [102.86, 14.14], [103.02, 14.28], [103.22, 14.34], [103.46, 14.38],
  [103.7, 14.38], [103.96, 14.34], [104.2, 14.38], [104.46, 14.36], [104.7, 14.4], [104.94, 14.36],
  [105.2, 14.34], [105.34, 14.5], [105.48, 14.68], [105.55, 14.9], [105.6, 15.1], [105.56, 15.28],
  [105.5, 15.44], [105.44, 15.62], [105.4, 15.8], [105.3, 15.94], [105.18, 16.06], [105.04, 16.2],
  [104.9, 16.34], [104.8, 16.46], [104.75, 16.62], [104.74, 16.8], [104.74, 16.98], [104.76, 17.16],
  [104.8, 17.34], [104.72, 17.52], [104.56, 17.66], [104.38, 17.82], [104.2, 17.98], [104.02, 18.14],
  [103.86, 18.3], [103.64, 18.4], [103.44, 18.42], [103.26, 18.36], [103.1, 18.22], [102.96, 18.04],
  [102.8, 17.92], [102.64, 17.86], [102.5, 17.94], [102.34, 18.04], [102.18, 18.12], [102.02, 18.16],
  [101.86, 18.08], [101.72, 17.92], [101.56, 17.8], [101.4, 17.74], [101.22, 17.6], [101.08, 17.5],
  [100.98, 17.58], [100.96, 17.78], [100.98, 18.0], [101.06, 18.2], [101.14, 18.4], [101.22, 18.62],
  [101.3, 18.84], [101.3, 19.06], [101.26, 19.3], [101.22, 19.5], [101.06, 19.6], [100.86, 19.62],
  [100.64, 19.7], [100.52, 19.84], [100.5, 20.02], [100.46, 20.2], [100.36, 20.28], [100.22, 20.3],
  [100.08, 20.36],
]
/** Land border with Myanmar, Golden Triangle → Mae Sai → Kraburi. */
const B_WEST: LL[] = [
  [100.08, 20.36], [99.96, 20.4], [99.88, 20.44], [99.7, 20.34], [99.54, 20.2], [99.36, 20.12],
  [99.18, 20.1], [99.0, 19.94], [98.84, 19.8], [98.64, 19.72], [98.44, 19.7], [98.24, 19.7], [98.06, 19.66],
  [97.9, 19.56], [97.8, 19.36], [97.78, 19.1], [97.72, 18.9], [97.62, 18.72], [97.52, 18.58], [97.38, 18.54],
  [97.42, 18.36], [97.56, 18.26], [97.66, 18.1], [97.72, 17.92], [97.84, 17.76], [98.0, 17.62],
  [98.16, 17.44], [98.3, 17.24], [98.44, 17.02], [98.54, 16.84], [98.58, 16.66], [98.68, 16.44],
  [98.8, 16.26], [98.86, 16.08], [98.76, 15.86], [98.62, 15.66], [98.56, 15.46], [98.42, 15.32],
  [98.26, 15.2], [98.2, 15.0], [98.28, 14.8], [98.44, 14.6], [98.6, 14.4], [98.78, 14.2], [98.94, 14.02],
  [99.06, 13.82], [99.14, 13.6], [99.18, 13.36], [99.2, 13.12], [99.16, 12.92], [99.2, 12.72],
  [99.3, 12.5], [99.42, 12.28], [99.52, 12.06], [99.6, 11.86], [99.56, 11.66], [99.46, 11.46],
  [99.34, 11.26], [99.2, 11.08], [99.04, 10.9], [98.9, 10.72], [98.8, 10.52], [98.72, 10.32],
  [98.66, 10.16], [98.6, 10.06],
]

/** Myanmar's coast from the map's west edge down to the Kraburi estuary. */
const MM_COAST: LL[] = [
  [96.0, 17.25], [96.9, 17.2], [97.2, 17.0], [97.45, 16.8], [97.6, 16.5], [97.6, 16.2], [97.66, 15.9],
  [97.72, 15.6], [97.8, 15.3], [97.9, 15.0], [98.0, 14.7], [98.1, 14.4], [98.14, 14.1], [98.08, 13.9],
  [98.2, 13.6], [98.3, 13.3], [98.42, 13.0], [98.52, 12.7], [98.62, 12.44], [98.58, 12.2], [98.62, 11.9],
  [98.7, 11.6], [98.76, 11.3], [98.72, 11.0], [98.66, 10.7], [98.58, 10.4], [98.54, 10.14], [98.6, 10.06],
]
const MY_WEST: LL[] = [[100.12, 6.44], [100.24, 6.2], [100.34, 5.94], [100.36, 5.66], [100.34, 5.36], [100.38, 5.0], [100.4, 4.0]]
const MY_EAST: LL[] = [[103.5, 4.0], [103.42, 4.6], [103.36, 4.96], [103.14, 5.34], [102.92, 5.56], [102.66, 5.8], [102.44, 5.98], [102.24, 6.14], [102.1, 6.25]]
const KH_VN_COAST: LL[] = [
  [102.92, 11.64], [102.98, 11.46], [103.06, 11.26], [103.14, 11.06], [103.3, 10.86], [103.46, 10.66],
  [103.6, 10.52], [103.78, 10.5], [103.98, 10.56], [104.2, 10.58], [104.34, 10.5], [104.48, 10.38],
  [104.66, 10.22], [104.84, 10.08], [104.96, 9.86], [104.86, 9.6], [104.8, 9.3], [104.78, 9.0], [104.74, 8.62],
  [104.96, 8.66], [105.2, 8.8], [105.5, 9.04], [105.8, 9.3], [106.1, 9.52], [106.4, 9.7], [106.8, 10.2], [107.4, 10.5],
]

const ELLIPSE = (lon: number, lat: number, rx: number, ry: number, n = 10, rot = 0): LL[] => {
  const pts: LL[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = Math.cos(a) * rx
    const y = Math.sin(a) * ry
    pts.push([lon + x * Math.cos(rot) - y * Math.sin(rot), lat + x * Math.sin(rot) + y * Math.cos(rot)])
  }
  return pts
}

const PHUKET: LL[] = [
  [98.29, 8.19], [98.36, 8.17], [98.42, 8.1], [98.44, 8.0], [98.43, 7.9], [98.41, 7.82], [98.36, 7.77],
  [98.31, 7.76], [98.28, 7.8], [98.27, 7.9], [98.26, 8.0], [98.28, 8.1],
]
const SAMUI: LL[] = [[99.94, 9.58], [100.06, 9.58], [100.1, 9.5], [100.07, 9.42], [99.98, 9.41], [99.92, 9.47]]
const THAI_ISLANDS: LL[][] = [
  PHUKET,
  SAMUI,
  ELLIPSE(100.03, 9.75, 0.07, 0.07, 9), // Ko Pha Ngan
  ELLIPSE(99.84, 10.09, 0.03, 0.04, 6), // Ko Tao
  ELLIPSE(102.35, 12.05, 0.06, 0.13, 10, 0.2), // Ko Chang
  ELLIPSE(102.56, 11.64, 0.05, 0.07, 8), // Ko Kut
  ELLIPSE(102.47, 11.8, 0.03, 0.03, 6), // Ko Mak
  ELLIPSE(101.45, 12.56, 0.02, 0.05, 6), // Ko Samet
  ELLIPSE(100.8, 13.15, 0.025, 0.03, 6), // Ko Si Chang
  ELLIPSE(100.78, 12.92, 0.02, 0.02, 5), // Ko Lan
  ELLIPSE(99.06, 7.58, 0.04, 0.15, 8, -0.1), // Ko Lanta
  ELLIPSE(98.77, 7.74, 0.035, 0.035, 6), // Ko Phi Phi
  ELLIPSE(98.59, 8.02, 0.03, 0.1, 7, 0.2), // Ko Yao
  ELLIPSE(99.64, 6.62, 0.07, 0.07, 8), // Ko Tarutao
  ELLIPSE(99.3, 6.49, 0.02, 0.02, 5), // Ko Lipe
  ELLIPSE(99.41, 7.24, 0.035, 0.035, 6), // Ko Libong
  ELLIPSE(97.64, 8.62, 0.015, 0.1, 6, 0.1), // Similan
  ELLIPSE(97.87, 9.43, 0.03, 0.04, 6), // Surin
  ELLIPSE(98.25, 9.08, 0.03, 0.1, 6), // Ko Phra Thong
  ELLIPSE(99.68, 9.62, 0.03, 0.03, 5), // Ang Thong
]
const FOREIGN_ISLANDS: LL[][] = [
  ELLIPSE(103.95, 10.22, 0.1, 0.2, 9, 0.35), // Phu Quoc
  ELLIPSE(99.8, 6.35, 0.1, 0.1, 9), // Langkawi
  ELLIPSE(100.27, 5.38, 0.06, 0.08, 7), // Penang
  ELLIPSE(103.22, 10.7, 0.05, 0.06, 6), // Koh Rong
  ELLIPSE(102.73, 5.9, 0.03, 0.03, 5), // Perhentian
  ELLIPSE(103.0, 5.77, 0.03, 0.03, 5), // Redang
]
/** Mergui archipelago: scattered islets off Myeik. */
const MERGUI: [number, number, number][] = [
  [98.3, 12.9, 0.05], [98.2, 12.6, 0.07], [98.36, 12.3, 0.06], [98.18, 12.1, 0.05], [98.4, 11.8, 0.08],
  [98.2, 11.5, 0.05], [98.46, 11.2, 0.06], [98.3, 10.9, 0.05], [98.44, 10.6, 0.05], [98.2, 10.3, 0.04],
  [98.08, 11.9, 0.04], [98.26, 11.25, 0.035], [98.54, 12.0, 0.04], [98.1, 12.4, 0.035], [98.38, 10.0, 0.03],
]

const LAKES: LL[][] = [
  // Songkhla lake (Thale Luang / Thale Sap Songkhla)
  [[100.14, 7.86], [100.24, 7.84], [100.32, 7.7], [100.38, 7.52], [100.46, 7.36], [100.52, 7.24], [100.46, 7.16], [100.36, 7.26], [100.26, 7.44], [100.18, 7.6], [100.12, 7.74]],
  ELLIPSE(99.2, 14.62, 0.06, 0.22, 8, -0.6), // Srinagarind
  ELLIPSE(98.98, 17.36, 0.04, 0.16, 7, 0.2), // Bhumibol
  ELLIPSE(100.58, 17.78, 0.1, 0.06, 7, 0.4), // Sirikit
  ELLIPSE(102.62, 16.8, 0.1, 0.05, 7, -0.3), // Ubolratana
  ELLIPSE(104.16, 17.18, 0.07, 0.05, 7), // Nong Han
  ELLIPSE(100.26, 15.72, 0.06, 0.03, 6), // Bueng Boraphet
  ELLIPSE(98.62, 14.88, 0.05, 0.14, 6, 0.3), // Khao Laem
  ELLIPSE(103.9, 12.92, 0.3, 0.18, 12, -0.55), // Tonle Sap
]

const RIVERS: { pts: LL[]; w: number; foreign?: boolean }[] = [
  { pts: [[100.12, 15.7], [100.16, 15.4], [100.12, 15.18], [100.28, 14.92], [100.44, 14.62], [100.56, 14.36], [100.52, 14.1], [100.5, 13.9], [100.5, 13.75], [100.56, 13.62], [100.58, 13.54]], w: 2 },
  { pts: [[98.9, 19.6], [98.97, 19.2], [98.99, 18.79], [98.9, 18.5], [98.7, 18.3], [98.76, 17.9], [98.96, 17.5], [99.13, 16.87], [99.52, 16.48], [99.8, 16.1], [100.12, 15.7]], w: 1 },
  { pts: [[99.7, 19.1], [99.5, 18.29], [99.3, 17.8], [99.13, 17.1]], w: 1 },
  { pts: [[100.2, 19.1], [100.14, 18.14], [99.9, 17.6], [99.82, 17.0], [100.08, 16.4], [100.28, 15.9], [100.12, 15.72]], w: 1 },
  { pts: [[100.9, 19.3], [100.77, 18.78], [100.62, 18.2], [100.1, 17.62], [100.26, 16.82], [100.36, 16.2], [100.14, 15.74]], w: 1 },
  { pts: [[101.15, 16.9], [101.12, 16.2], [101.1, 15.6], [100.92, 14.9], [100.56, 14.37]], w: 1 },
  { pts: [[101.72, 14.62], [102.1, 15.0], [102.8, 15.18], [103.5, 15.08], [104.2, 15.2], [104.86, 15.23], [105.2, 15.26], [105.52, 15.32]], w: 1 },
  { pts: [[101.7, 16.1], [102.2, 16.2], [102.8, 16.38], [103.3, 16.2], [103.7, 15.8], [104.2, 15.4], [104.5, 15.22]], w: 1 },
  { pts: [[98.7, 15.1], [99.2, 14.4], [99.53, 14.02], [99.8, 13.53], [100.0, 13.38]], w: 1 },
  { pts: [[101.64, 14.12], [101.37, 14.05], [101.07, 13.69], [100.95, 13.48]], w: 1 },
  { pts: [[99.62, 8.5], [99.4, 8.9], [99.33, 9.16]], w: 1 },
  // Mekong through Laos and Cambodia (neighbour land, drawn faint)
  { pts: [[100.46, 20.2], [100.8, 20.0], [101.2, 19.9], [101.7, 19.95], [102.13, 19.89], [101.9, 19.3], [101.5, 18.6], [101.4, 18.2], [101.72, 17.92]], w: 2, foreign: true },
  { pts: [[105.52, 15.32], [105.84, 15.0], [105.96, 14.2], [105.92, 13.5], [106.0, 12.6], [105.9, 12.0], [104.92, 11.56], [105.2, 11.0], [105.6, 10.4], [106.1, 9.9]], w: 2, foreign: true },
  { pts: [[97.8, 21.2], [97.84, 20.4], [97.9, 19.6], [97.66, 18.3], [97.7, 17.9], [97.6, 17.2], [97.62, 16.5]], w: 2, foreign: true },
]
/** The Mekong stretches that form the border (drawn as wide rivers). */
const MEKONG_BORDER: LL[][] = [
  [[100.08, 20.36], [100.22, 20.3], [100.36, 20.28], [100.46, 20.2]],
  B_EAST.slice(B_EAST.findIndex((p) => p[0] === 105.56), B_EAST.findIndex((p) => p[0] === 101.72) + 1),
]

const RANGES: { pts: LL[]; n: number; big?: number }[] = [
  { pts: [[97.95, 19.62], [98.6, 19.75], [99.3, 20.05], [99.7, 20.3]], n: 11 },
  { pts: [[98.2, 19.5], [98.4, 19.0], [98.5, 18.55], [98.5, 18.1], [98.7, 17.6]], n: 11, big: 2 },
  { pts: [[97.9, 19.2], [97.8, 18.6], [98.0, 18.0], [98.3, 17.5]], n: 8 },
  { pts: [[99.3, 19.4], [99.25, 18.8], [99.3, 18.2], [99.1, 17.7]], n: 8 },
  { pts: [[100.2, 19.5], [100.4, 19.0], [100.45, 18.4]], n: 6 },
  { pts: [[100.98, 19.45], [101.1, 18.9], [101.0, 18.3]], n: 6 },
  { pts: [[98.9, 16.2], [98.7, 15.6], [98.6, 15.0], [98.9, 14.4], [99.1, 13.8], [99.25, 13.1], [99.4, 12.4], [99.35, 11.7], [99.1, 11.0], [98.9, 10.5]], n: 22 },
  { pts: [[101.3, 17.3], [101.35, 16.6], [101.45, 15.9], [101.55, 15.2], [101.75, 14.6], [102.3, 14.45]], n: 13 },
  { pts: [[103.3, 17.2], [103.8, 16.9], [104.3, 16.5]], n: 6 },
  { pts: [[103.0, 14.46], [103.8, 14.48], [104.6, 14.48], [105.1, 14.44]], n: 10 },
  { pts: [[101.9, 12.92], [102.2, 12.84], [102.4, 12.6]], n: 4 },
  { pts: [[98.72, 10.0], [98.64, 9.4], [98.56, 8.8], [98.62, 8.5]], n: 8 },
  { pts: [[99.62, 9.02], [99.72, 8.5], [99.84, 8.0], [100.02, 7.4]], n: 9, big: 1 },
  { pts: [[100.9, 6.1], [101.3, 5.95], [101.7, 6.0]], n: 5 },
]
/** Faint mountains in the neighbouring countries. */
const FOREIGN_RANGES: LL[][] = [
  [[97.2, 20.6], [97.6, 19.8], [97.3, 18.8], [97.8, 17.4]],
  [[98.4, 20.8], [99.4, 20.9], [100.2, 20.8]],
  [[101.6, 20.6], [102.4, 20.2], [103.4, 19.6], [104.2, 18.9], [105.2, 18.0], [106.0, 17.0]],
  [[102.8, 12.2], [103.3, 11.7], [103.7, 11.3]],
  [[98.7, 13.5], [98.9, 12.6], [99.0, 11.8]],
  [[101.2, 5.4], [101.6, 4.6], [102.2, 4.4]],
  [[106.0, 15.8], [106.2, 14.8]],
]

const CITIES: { ll: LL; big?: boolean; capital?: boolean }[] = [
  { ll: [98.99, 18.79], big: true }, { ll: [99.83, 19.91] }, { ll: [99.5, 18.29] }, { ll: [100.77, 18.78] },
  { ll: [100.26, 16.82] }, { ll: [100.12, 15.7] }, { ll: [102.83, 16.44], big: true }, { ll: [102.79, 17.41] },
  { ll: [102.1, 14.97], big: true }, { ll: [104.86, 15.23] }, { ll: [102.74, 17.88] }, { ll: [100.47, 7.0], big: true },
  { ll: [99.33, 9.14] }, { ll: [100.88, 12.93] }, { ll: [99.96, 12.57] }, { ll: [99.53, 14.02] }, { ll: [99.13, 16.87] },
  { ll: [99.82, 17.0] }, { ll: [98.39, 7.88] }, { ll: [98.91, 8.06] }, { ll: [99.61, 7.56] }, { ll: [99.18, 10.5] },
  { ll: [101.28, 12.68] }, { ll: [104.14, 17.16] }, { ll: [103.65, 16.05] }, { ll: [101.3, 6.87] },
  { ll: [102.6, 17.97], capital: true }, { ll: [104.92, 11.56], capital: true },
]

/** Town positions on the map (x, y, size 0 small · 1 big · 2 foreign capital) for night lights. */
export function cityPoints(): [number, number, number][] {
  return CITIES.map((c) => {
    const [x, y] = proj(c.ll[0], c.ll[1])
    return [Math.round(x), Math.round(y), c.capital ? 2 : c.big ? 1 : 0]
  })
}

/** Bake everything heavy ahead of time (call on idle before opening the map). */
export function prewarmThaiMap() {
  thaiMapArt()
  mapLabels()
  for (const id of ICON_IDS) {
    placeIconArt(id, false)
    placeIconArt(id, true)
  }
}

// ---------------------------------------------------------------------------
// Regions (roughly the six-region scheme, with the lower north counted north)

const NE_POLY: LL[] = [
  [100.9, 17.45], [101.05, 17.52], [101.9, 18.6], [106.5, 18.6], [106.5, 14.0], [103.5, 14.0], [102.95, 14.3],
  [102.6, 14.2], [102.1, 14.15], [101.7, 14.22], [101.45, 14.45], [101.3, 14.75], [101.2, 15.1], [101.3, 15.45],
  [101.5, 15.8], [101.62, 16.2], [101.55, 16.6], [101.4, 17.05], [101.15, 17.3],
]
const WEST_POLY: LL[] = [
  [96.5, 18.4], [98.3, 17.95], [98.9, 17.7], [99.25, 17.5], [99.45, 17.05], [99.5, 16.55], [99.3, 16.1],
  [99.25, 15.7], [99.45, 15.35], [99.75, 15.0], [99.85, 14.55], [99.8, 14.1], [99.95, 13.8], [100.0, 13.5],
  [99.93, 13.35], [100.15, 13.15], [100.3, 12.5], [100.3, 10.95], [96.5, 10.95],
]
const EAST_POLY: LL[] = [
  [100.86, 13.45], [100.92, 13.85], [101.1, 13.95], [101.25, 14.15], [101.6, 14.25], [103.2, 14.25], [103.2, 11.0], [100.6, 11.0], [100.6, 13.45],
]

function inPoly(pts: LL[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Region of a Thai land point; boundaries are warped a little so they read hand-drawn. */
export function regionAt(lon0: number, lat0: number): Region {
  const lon = lon0 + (vnoise(lon0 * 3, lat0 * 3, 51) - 0.5) * 0.3
  const lat = lat0 + (vnoise(lon0 * 3, lat0 * 3, 52) - 0.5) * 0.3
  if (Math.hypot((lon0 - 100.56) * 1.3, lat0 - 13.76) < 0.2) return 'bangkok'
  if (lat < 10.95) return 'south'
  if (inPoly(NE_POLY, lon, lat)) return 'northeast'
  if (inPoly(EAST_POLY, lon, lat)) return 'east'
  if (inPoly(WEST_POLY, lon, lat)) return 'west'
  if (lat > 16.15) return 'north'
  return 'central'
}

interface RegionPal {
  base: Color
  light: Color
  shade: Color
  deep: Color
}
const REGION_PAL: Record<Region, RegionPal> = {
  north: { base: '#8fd06c', light: '#b2e48a', shade: '#70b75e', deep: '#4f9651' },
  northeast: { base: '#f2c76a', light: '#ffdf92', shade: '#dcaa56', deep: '#b98646' },
  central: { base: '#c6e48a', light: '#e2f3aa', shade: '#a5cd70', deep: '#82ad5c' },
  east: { base: '#88d6bf', light: '#b0ead6', shade: '#66bba4', deep: '#4c9a88' },
  west: { base: '#d9c47c', light: '#eedb9e', shade: '#bea862', deep: '#9a8650' },
  south: { base: '#62c47c', light: '#8ddb98', shade: '#48a866', deep: '#348654' },
  bangkok: { base: '#ffb0c8', light: '#ffd0de', shade: '#e889a8', deep: '#c46a8a' },
}
const REGION_IDX: Region[] = ['north', 'northeast', 'central', 'east', 'west', 'south', 'bangkok']

export const MC = {
  ink: '#3a2838',
  inkL: '#5a3d4f',
  foam: '#e8fbf6',
  sea: ['#b6eef0', '#94e0e8', '#76d0e2', '#5fbedb', '#4eaad0', '#4498c6', '#3c88ba', '#367bb0'],
  paper: '#f1e3c2',
  paperL: '#f9eed6',
  paperD: '#dfcaa0',
  paperDD: '#c7ad80',
  wood: '#9a6a45',
  woodL: '#c28e5c',
  woodD: '#6e4a35',
  woodDD: '#4a3128',
  gold: '#ffd54f',
  goldL: '#fff3a6',
  goldD: '#e9a53a',
  goldDD: '#b8742a',
  river: '#5fb4de',
  riverL: '#9ad8f0',
  lake: '#6cc4e4',
} as const

// ---------------------------------------------------------------------------
// Helpers

const toPx = (pts: LL[]): [number, number][] => pts.map(([lo, la]) => proj(lo, la))

function hash2(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Smooth value noise in [0,1]. */
function vnoise(x: number, y: number, s = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash2(xi, yi, s)
  const b = hash2(xi + 1, yi, s)
  const c = hash2(xi, yi + 1, s)
  const d = hash2(xi + 1, yi + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number, s = 0) => vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.1

/** Subdivide a polyline and push it sideways with noise for a hand-drawn coast. */
function crinkle(pts: [number, number][], amp: number, step = 2.5, seed = 1, closed = false): [number, number][] {
  const out: [number, number][] = []
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[(i + 1) % pts.length]
    const len = Math.hypot(bx - ax, by - ay)
    const k = Math.max(1, Math.round(len / step))
    const nx = -(by - ay) / (len || 1)
    const ny = (bx - ax) / (len || 1)
    for (let j = 0; j < k; j++) {
      const t = j / k
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      const o = j === 0 ? 0 : (fbm(x * 0.35, y * 0.35, seed) - 0.5) * 2 * amp
      out.push([x + nx * o, y + ny * o])
    }
  }
  if (!closed) out.push(pts[pts.length - 1])
  return out
}

/** Rasterise polygons into a 0/1 mask using the crisp scanline filler. */
function maskOf(W: number, H: number, polys: [number, number][][]): Uint8Array {
  // Native path fill (fast), thresholded back to hard pixels.
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#ffffff'
  for (const p of polys) {
    ctx.beginPath()
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fill()
  }
  const d = ctx.getImageData(0, 0, W, H).data
  const m = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0
  return m
}

function rgb(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)
}

// ---------------------------------------------------------------------------
// Baked data shared with the scene

export interface MapData {
  W: number
  H: number
  /** 0 sea, 1 neighbour land, 2 Thailand, 3 lake. */
  kind: Uint8Array
  /** Distance to the nearest land (sea pixels only), capped. */
  seaDist: Uint8Array
  /** Region index per Thai pixel (REGION_IDX), 255 elsewhere. */
  region: Uint8Array
}

let DATA: MapData | null = null

export function mapData(): MapData {
  if (DATA) return DATA
  const W = MAP.W
  const H = MAP.H
  const thaiPoly = crinkle(toPx([...T_AND, ...B_MY.slice(1), ...T_GULF.slice(1), ...B_EAST.slice(1), ...B_WEST.slice(1)]), 0.7, 2.5, 3, true)
  const mainland = crinkle(
    toPx([
      [95.5, 22.5], [107.5, 22.5], [107.5, 10.5],
      ...KH_VN_COAST.slice().reverse(),
      ...T_GULF.slice().reverse(),
      ...MY_EAST.slice().reverse(),
      [103.5, 3.5], [100.4, 3.5],
      ...MY_WEST.slice().reverse(),
      ...T_AND.slice().reverse(),
      ...MM_COAST.slice().reverse(),
      [95.5, 17.25],
    ]),
    0.7, 2.5, 3, true,
  )
  // Islands are drawn a little larger than life so they read at pixel scale.
  const grow = (pts: [number, number][], k: number): [number, number][] => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
    return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])
  }
  const thaiIsl = THAI_ISLANDS.map((p) => crinkle(grow(toPx(p), 1.45), 0.35, 2, 9, true))
  const forIsl = [
    ...FOREIGN_ISLANDS.map((p) => crinkle(toPx(p), 0.4, 2, 11, true)),
    ...MERGUI.map(([lo, la, r], i) => crinkle(toPx(ELLIPSE(lo, la, r * 0.8, r, 7, i)), 0.5, 2, 20 + i, true)),
  ]
  const thai = maskOf(W, H, [thaiPoly, ...thaiIsl])
  const land = maskOf(W, H, [mainland, ...forIsl, ...thaiIsl])
  const lakes = maskOf(W, H, LAKES.map((p) => crinkle(toPx(p), 0.3, 2, 5, true)))
  const kind = new Uint8Array(W * H)
  const region = new Uint8Array(W * H).fill(255)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (lakes[i] && (thai[i] || land[i])) kind[i] = 3
      else if (thai[i]) {
        kind[i] = 2
        // Regions are sampled on a 2×2 grid (cheap, and the boundary warp hides it).
        const bx = x & ~1
        const by = y & ~1
        if (bx !== x || by !== y) {
          const j = by * W + bx
          if (region[j] !== 255) {
            region[i] = region[j]
            continue
          }
        }
        const [lo, la] = unproj(bx + 1, by + 1)
        region[i] = REGION_IDX.indexOf(regionAt(lo, la))
      } else if (land[i]) kind[i] = 1
    }
  // Distance from land for sea pixels (two-pass chamfer).
  const INF = 250
  const dist = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) dist[i] = kind[i] === 0 ? INF : 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!dist[i]) continue
      let d = dist[i]
      if (x > 0) d = Math.min(d, dist[i - 1] + 2)
      if (y > 0) d = Math.min(d, dist[i - W] + 2)
      if (x > 0 && y > 0) d = Math.min(d, dist[i - W - 1] + 3)
      if (x < W - 1 && y > 0) d = Math.min(d, dist[i - W + 1] + 3)
      dist[i] = d
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      if (!dist[i]) continue
      let d = dist[i]
      if (x < W - 1) d = Math.min(d, dist[i + 1] + 2)
      if (y < H - 1) d = Math.min(d, dist[i + W] + 2)
      if (x < W - 1 && y < H - 1) d = Math.min(d, dist[i + W + 1] + 3)
      if (x > 0 && y < H - 1) d = Math.min(d, dist[i + W - 1] + 3)
      dist[i] = d
    }
  const seaDist = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) seaDist[i] = kind[i] === 0 ? Math.min(250, Math.round(dist[i] / 2)) : 0
  DATA = { W, H, kind, seaDist, region }
  return DATA
}

// ---------------------------------------------------------------------------
// Small sprites used on the base map

function mountainSprite(size: number, body: Color, light: Color, shade: Color, snow: Color | null, line: Color): HTMLCanvasElement {
  const w = size * 2 + 1
  const h = size + 2
  return bake(w + 2, h + 2, (g) => {
    const cx = size + 1
    const top = 1
    const by = h
    // Silhouette with a little shoulder bump.
    const pts: [number, number][] = [
      [1, by],
      [cx - 0.5, top],
      [cx + 0.5, top],
      [w + 1, by],
    ]
    g.poly(
      pts.map(([x, y]) => [x, y] as [number, number]),
      body,
    )
    // Lit west face, shaded east face.
    g.poly(
      [
        [2, by],
        [cx - 0.5, top + 1],
        [cx, top + 1],
        [cx - 1, by],
      ],
      light,
    )
    g.poly(
      [
        [cx + 1, top + 2],
        [w, by],
        [cx + 2, by],
      ],
      shade,
    )
    if (snow) {
      g.px(cx, top + 1, snow)
      g.px(cx - 1, top + 2, snow)
    }
    // Outline.
    g.line(1, by, cx, top, line)
    g.line(cx, top, w + 1, by, line)
    g.hline(1, w + 1, by, line)
  })
}

function treeSprite(dark: Color, mid: Color, light: Color, trunk: Color): HTMLCanvasElement {
  return bake(5, 6, (g) => {
    g.rect(2, 4, 1, 2, trunk)
    g.rect(1, 1, 3, 3, mid)
    g.rect(0, 2, 5, 2, mid)
    g.hline(1, 3, 0, mid)
    g.px(1, 1, light)
    g.px(2, 0, light)
    g.px(1, 2, light)
    g.hline(1, 4, 3, dark)
    g.px(4, 2, dark)
  })
}

function palmSprite(): HTMLCanvasElement {
  return bake(7, 7, (g) => {
    g.line(3, 6, 4, 2, '#8a5a3a')
    g.line(0, 2, 3, 1, '#3f9a55')
    g.line(4, 1, 6, 2, '#3f9a55')
    g.line(3, 1, 1, 4, '#56b060')
    g.line(4, 1, 6, 4, '#2f7a48')
    g.px(4, 0, '#56b060')
  })
}

// ---------------------------------------------------------------------------
// The base map

export interface MapArt {
  base: HTMLCanvasElement
  data: MapData
}

export function thaiMapArt(): MapArt {
  const key = 'thaimap:base'
  const hit = baseCache.get(key)
  if (hit) return hit
  const data = mapData()
  const { W, H, kind, seaDist, region } = data
  const s = new Surface(W, H)
  const img = s.ctx.createImageData(W, H)
  const px32 = new Uint32Array(img.data.buffer)
  const seaCols = MC.sea.map(rgb)
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : kind[y * W + x])
  const isThai = (x: number, y: number) => at(x, y) === 2
  const sand = rgb('#fbe6b4')
  const sandD = rgb('#efcf8e')
  /** True if a sea pixel lies within `r` (4-neighbour steps ≤ r) of (x, y)… cheap ring test. */
  const seaAt = (x: number, y: number, r: number) => {
    for (let dy = -r + 1; dy <= r - 1; dy++)
      for (let dx = -r + 1; dx <= r - 1; dx++) if (Math.abs(dx) + Math.abs(dy) < r && at(x + dx, y + dy) === 0) return true
    return false
  }
  const isLand = (x: number, y: number) => {
    const k = at(x, y)
    return k === 1 || k === 2
  }
  const regPals = REGION_IDX.map((r) => REGION_PAL[r])
  const regCols = regPals.map((p) => ({ base: rgb(p.base), light: rgb(p.light), shade: rgb(p.shade), deep: rgb(p.deep) }))
  const paper = { base: rgb(MC.paper), light: rgb(MC.paperL), shade: rgb(MC.paperD), deep: rgb(MC.paperDD) }
  const ink = rgb(MC.ink)
  const foam = rgb(MC.foam)
  const lake = rgb(MC.lake)
  const lakeL = rgb('#a6e2f2')
  const shadowSea = rgb('#2f6f9e')
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const k = kind[i]
      let c: number
      if (k === 0) {
        // Sea: shallow turquoise near the coasts, dithered bands to deep blue.
        const d = seaDist[i] + (vnoise(x * 0.05, y * 0.05, 4) - 0.5) * 8
        const f = Math.max(0, Math.min(seaCols.length - 1.001, Math.sqrt(Math.max(0, d - 1)) * 1.25))
        const b = Math.floor(f)
        const t = f - b
        c = ditherOn(x, y, t) ? seaCols[Math.min(seaCols.length - 1, b + 1)] : seaCols[b]
        if (seaDist[i] <= 1) c = foam
        // Paper-cut shadow of Thailand falling south-east.
        if (seaDist[i] > 1 && (isThai(x - 2, y - 3) || isThai(x - 1, y - 2)) && !isThai(x, y)) c = ditherOn(x, y, 0.75) ? shadowSea : c
      } else if (k === 3) {
        c = ditherOn(x, y, 0.2) ? lakeL : lake
        if (!(at(x - 1, y) === 3 && at(x + 1, y) === 3 && at(x, y - 1) === 3 && at(x, y + 1) === 3)) c = rgb('#3f8fb8')
      } else {
        const thai = k === 2
        const pal = thai ? regCols[region[i]] : paper
        const n = fbm(x * 0.09, y * 0.09, thai ? 1 : 2)
        c = n > 0.62 ? (ditherOn(x, y, (n - 0.62) * 5) ? pal.light : pal.base) : n < 0.36 ? (ditherOn(x, y, (0.36 - n) * 5) ? pal.shade : pal.base) : pal.base
        // Relief bevel: light along north-west edges, shade to the south-east.
        const same = thai ? isThai : isLand
        if (!same(x - 1, y - 1) || !same(x, y - 1) || !same(x - 1, y)) c = pal.light
        else if (!same(x + 1, y + 1) || !same(x, y + 1) || !same(x + 1, y)) c = pal.shade
        else if (!same(x + 2, y + 2) && thai) c = ditherOn(x, y, 0.5) ? pal.shade : c
        // Coast outline.
        const coast = at(x - 1, y) === 0 || at(x + 1, y) === 0 || at(x, y - 1) === 0 || at(x, y + 1) === 0
        if (coast) c = thai ? ink : rgb(MC.paperDD)
        else if (thai && (seaAt(x - 1, y, 2) || seaAt(x + 1, y, 2) || seaAt(x, y - 1, 2) || seaAt(x, y + 1, 2))) {
          // Golden beach just inside the coastline.
          c = ditherOn(x, y, 0.78) ? sand : sandD
        }
        // Region borders (dotted, drawn on the lower-index side).
        if (thai && !coast) {
          const r = region[i]
          const rr = region[i + 1]
          const rd = region[i + W]
          if ((x < W - 1 && rr !== 255 && rr !== r) || (y < H - 1 && rd !== 255 && rd !== r)) c = (x + y) % 3 === 0 ? pal.light : regCols[r].deep
        }
        // Neighbour land hatching: faint diagonal lines.
        if (!thai && !coast && (x + y) % 7 === 0 && fbm(x * 0.04, y * 0.04, 8) > 0.45) c = paper.shade
      }
      px32[i] = c
    }
  // National land borders: pixels of neighbour land touching Thailand.
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (kind[i] !== 1) continue
      if (isThai(x - 1, y) || isThai(x + 1, y) || isThai(x, y - 1) || isThai(x, y + 1)) px32[i] = ink
    }
  s.ctx.putImageData(img, 0, 0)

  // --- Lat/long graticule over the sea -------------------------------------
  s.ctx.globalAlpha = 0.22
  for (let lon = 98; lon <= 106; lon += 2) {
    const [gx] = proj(lon, 0)
    for (let y = MAP.PAD; y < H - MAP.PAD; y += 3) if (kind[y * W + Math.round(gx)] === 0) s.px(gx, y, '#e8fbff')
  }
  for (let lat = 6; lat <= 20; lat += 2) {
    const [, gy] = proj(0, lat)
    for (let x = MAP.PAD; x < W - MAP.PAD; x += 3) if (kind[Math.round(gy) * W + x] === 0) s.px(x, gy, '#e8fbff')
  }
  s.ctx.globalAlpha = 1

  // --- Engraved wave strokes on the open sea --------------------------------
  const rw = seededRand(71)
  for (let n = 0; n < 900; n++) {
    const x = Math.floor(rw() * W)
    const y = Math.floor(rw() * H)
    const i = y * W + x
    if (kind[i] !== 0 || seaDist[i] < 7) continue
    const len = 2 + Math.floor(rw() * 3)
    let ok = true
    for (let k = -1; k <= len + 1; k++) if (at(x + k, y) !== 0) ok = false
    if (!ok) continue
    const c = mix(MC.sea[Math.min(7, 3 + Math.floor(seaDist[i] / 8))], '#ffffff', 0.22)
    s.hline(x, x + len - 1, y, c)
    s.px(x - 1, y + 1, c)
    s.px(x + len, y - 1, c)
  }

  // --- Rivers and lakes ------------------------------------------------------
  for (const r of RIVERS) {
    const pts = crinkle(toPx(r.pts), 0.6, 2, 17)
    const col = r.foreign ? '#9cc7d8' : '#3f93d2'
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      if (r.w > 1) {
        s.line(ax, ay, bx, by, col)
        s.line(ax + 1, ay, bx + 1, by, r.foreign ? '#b8d8e4' : MC.river)
        if (!r.foreign) s.line(ax + 1, ay - 1, bx + 1, by - 1, MC.riverL)
      } else s.line(ax, ay, bx, by, col)
    }
  }
  for (const seg of MEKONG_BORDER) {
    const pts = toPx(seg)
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      s.line(ax + 1, ay, bx + 1, by, MC.river)
      s.line(ax + 2, ay, bx + 2, by, MC.riverL)
      s.line(ax + 3, ay, bx + 3, by, MC.river)
    }
  }

  // --- Paddies (central plain, Isan and northern valleys) --------------------
  for (let y = 0; y < H; y += 2)
    for (let x = (y / 2) % 2 ? 1 : 0; x < W; x += 4) {
      const i = y * W + x
      if (kind[i] !== 2) continue
      const r = REGION_IDX[region[i]]
      const [lo, la] = unproj(x, y)
      let p = 0
      if (r === 'central' && la > 13.9 && la < 16.2) p = 0.8
      else if (r === 'northeast') p = 0.55
      else if (r === 'north' && la < 17.4) p = 0.5
      else if (r === 'east' && la > 13.3) p = 0.5
      else if (r === 'central') p = 0.4
      if (p <= 0 || fbm(x * 0.07, y * 0.07, 30) > p) continue
      if (lo > 104.6) continue
      const pal = REGION_PAL[r]
      s.px(x, y, pal.light)
      s.px(x + 1, y, pal.light)
      s.px(x, y + 1, pal.shade)
    }

  // --- Forests ---------------------------------------------------------------
  const trees: Record<string, HTMLCanvasElement> = {
    north: treeSprite('#3f8a4e', '#56a85c', '#86c95f', '#6e4a35'),
    south: treeSprite('#2f7a48', '#3f9a55', '#6cc36a', '#6e4a35'),
    west: treeSprite('#5c8a44', '#77a852', '#a6c96a', '#6e4a35'),
    east: treeSprite('#35856a', '#4aa37e', '#7fd0a8', '#6e4a35'),
    northeast: treeSprite('#6e8f3e', '#8aab4c', '#b8cc6a', '#6e4a35'),
    central: treeSprite('#4f9a4e', '#68b35a', '#9ad06a', '#6e4a35'),
  }
  const palm = palmSprite()
  const rt = seededRand(5)
  const treeSpots: [number, number, Region][] = []
  for (let n = 0; n < 2600; n++) {
    const x = Math.floor(rt() * W)
    const y = Math.floor(rt() * H)
    const i = y * W + x
    if (kind[i] !== 2) continue
    const r = REGION_IDX[region[i]]
    if (r === 'bangkok') continue
    const [lo, la] = unproj(x, y)
    const dens =
      r === 'south' ? 0.62 : r === 'north' ? 0.55 : r === 'west' ? 0.55 : r === 'east' ? 0.5 : r === 'northeast' ? (la > 16.8 || lo > 104 ? 0.4 : 0.3) : 0.28
    if (fbm(x * 0.06, y * 0.06, 40) > dens) continue
    // Keep clear of the coastline outline.
    if (!isThai(x - 2, y) || !isThai(x + 6, y) || !isThai(x, y + 7) || !isThai(x + 4, y + 7)) continue
    treeSpots.push([x, y, r])
  }
  treeSpots.sort((a, b) => a[1] - b[1])
  for (const [x, y, r] of treeSpots) {
    if (r === 'south' && rt() < 0.25) s.draw(palm, x - 1, y - 1)
    else s.draw(trees[r] ?? trees.central, x, y)
  }

  // --- Mountains ---------------------------------------------------------------
  const mtn = (size: number, r: Region) => {
    const p = REGION_PAL[r]
    return cached(`tm-mtn:${size}:${r}`, () => ({
      canvas: mountainSprite(size, mix(p.deep, '#8c8187', 0.35), mix(p.light, '#ffffff', 0.25), mix(p.deep, '#625867', 0.35), size >= 6 ? '#fffaf0' : null, '#4a3848'),
      w: 0,
      h: 0,
    })).canvas
  }
  const fmtn = (size: number) => cached(`tm-fmtn:${size}`, () => ({ canvas: mountainSprite(size, '#e4cfa4', '#f6e8c8', '#cdb488', null, '#b99a70'), w: 0, h: 0 })).canvas
  const rm = seededRand(99)
  const peaks: { x: number; y: number; size: number; foreign: boolean }[] = []
  for (const range of RANGES) {
    const pts = toPx(range.pts)
    let total = 0
    for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    for (let k = 0; k < range.n; k++) {
      let d = ((k + 0.5) / range.n) * total
      let i = 0
      while (i < pts.length - 2 && d > Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])) {
        d -= Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        i++
      }
      const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) || 1
      const t = Math.min(1, d / seg)
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t + (rm() - 0.5) * 6
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t + (rm() - 0.5) * 5
      const big = range.big && k % Math.max(2, Math.floor(range.n / range.big)) === Math.floor(range.n / 3)
      peaks.push({ x, y, size: big ? 7 : 4 + Math.floor(rm() * 2.6), foreign: false })
      if (rm() < 0.55) peaks.push({ x: x + (rm() - 0.5) * 10, y: y + 2 + rm() * 3, size: 3 + Math.floor(rm() * 2), foreign: false })
    }
  }
  for (const range of FOREIGN_RANGES) {
    const pts = toPx(range)
    for (let i = 0; i + 1 < pts.length; i++) {
      const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
      for (let d = 0; d < len; d += 9) {
        const t = d / len
        peaks.push({ x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t + (rm() - 0.5) * 6, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t + (rm() - 0.5) * 5, size: 3 + Math.floor(rm() * 3), foreign: true })
      }
    }
  }
  peaks.sort((a, b) => a.y - b.y)
  for (const p of peaks) {
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    const k = at(x, y)
    if (p.foreign) {
      if (k !== 1 || !isLand(x - p.size, y + 2) || !isLand(x + p.size, y + 2)) continue
      s.draw(fmtn(p.size), x - p.size - 1, y - p.size - 2)
      continue
    }
    if (k !== 2) continue
    const r = REGION_IDX[region[y * W + x]]
    s.draw(mtn(p.size, r), x - p.size - 1, y - p.size - 2)
  }

  // --- Cities ------------------------------------------------------------------
  for (const c of CITIES) {
    const [x, y] = proj(c.ll[0], c.ll[1]).map(Math.round) as [number, number]
    if (c.capital) {
      s.rect(x - 1, y - 1, 3, 3, '#b8343f')
      s.px(x, y, '#ffd6e0')
      s.frame(x - 2, y - 2, 5, 5, '#8c6a50')
      continue
    }
    drawTown(s, x, y, c.big ?? false)
  }
  drawBangkokCity(s, BANGKOK.x, BANGKOK.y)
  // A few friendly landmarks of daily life: elephants in Surin and the north,
  // and rice barns (ยุ้งข้าว) out on the Isan plateau.
  for (const [lo, la, flip] of [
    [103.62, 14.72, 0],
    [98.72, 19.32, 1],
    [101.62, 14.52, 0],
  ] as [number, number, number][]) {
    const [x, y] = proj(lo, la)
    drawElephant(s, Math.round(x), Math.round(y), flip === 1)
  }
  for (const [lo, la] of [
    [103.1, 16.0],
    [104.1, 15.6],
    [102.4, 15.6],
    [103.9, 16.9],
  ] as LL[]) {
    const [x, y] = proj(lo, la)
    drawBarn(s, Math.round(x), Math.round(y))
  }

  // --- Compass, frame and the inset --------------------------------------------
  drawCompass(s, 36, 382)
  drawInset(s)
  drawFrame(s, W, H)
  const art = { base: s.canvas, data }
  baseCache.set(key, art)
  return art
}
const baseCache = new Map<string, MapArt>()

export function seededRand(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawTown(g: Surface, x: number, y: number, big: boolean) {
  const roofs = ['#e8514a', '#f58f35', '#e8709e', '#5a8de0']
  const spots: [number, number][] = big
    ? [[-3, -1], [0, -2], [3, -1], [-1, 1], [2, 1]]
    : [[-1, -1], [1, 0]]
  for (const [dx, dy] of spots) {
    const hx = x + dx
    const hy = y + dy
    const r = roofs[(hx * 3 + hy) & 3]
    g.rect(hx - 1, hy, 3, 2, '#fffaf0')
    g.hline(hx - 1, hx + 1, hy - 1, r)
    g.px(hx, hy - 2, r)
    g.px(hx, hy + 1, '#8c6a50')
  }
}

function drawElephant(g: Surface, x: number, y: number, flip: boolean) {
  const rows = ['..####...', '.######.#', '########.', '#######.#', '.#.#.#.#.']
  const f = (dx: number) => (flip ? x + 4 - dx : x - 4 + dx)
  rows.forEach((r, yy) => {
    for (let k = 0; k < r.length; k++) if (r[k] === '#') g.px(f(k), y - 5 + yy, yy === 0 || k === 0 ? '#bdb2ae' : yy === 4 ? '#625867' : '#8c8187')
  })
  g.px(f(2), y - 3, '#3a2838')
  g.px(f(1), y - 4, '#e4ddd6')
  // Saddle howdah.
  g.hline(f(3), f(5), y - 6, '#e8514a')
  g.px(f(4), y - 7, '#ffd54f')
}

function drawBarn(g: Surface, x: number, y: number) {
  g.rect(x - 2, y - 3, 5, 3, '#c28e5c')
  g.vline(x + 2, y - 3, y - 1, '#9a6a45')
  g.poly([[x - 3, y - 3], [x, y - 6], [x + 3.5, y - 3]], '#8a5a3a')
  g.line(x - 2, y - 3, x, y - 5, '#b07a52')
  g.vline(x - 2, y, y, '#6e4a35')
  g.vline(x + 2, y, y, '#6e4a35')
}

/** Bangkok on the main map: a dense little skyline on the river mouth. */
function drawBangkokCity(g: Surface, cx: number, cy: number) {
  const blds: [number, number, number, Color, Color][] = [
    [-7, 3, 5, '#d4f1ff', '#9fd0ff'],
    [-4, 3, 8, '#fffaf0', '#e4ddd6'],
    [-1, 2, 11, '#c8f0cf', '#86c95f'],
    [2, 3, 7, '#ffd6e0', '#ff9fc0'],
    [5, 2, 9, '#fff3a6', '#ffd54f'],
    [7, 3, 5, '#e2d2ff', '#bea2f5'],
    [-6, 2, 3, '#fff1d6', '#e0bb8a'],
  ]
  // Ground disc.
  g.ellipse(cx, cy + 3, 11, 5, '#3a2838')
  g.ellipse(cx, cy + 2, 10, 4, '#ffb0c8')
  g.ellipse(cx - 2, cy + 1, 6, 2, '#ffd0de')
  for (const [dx, w, h, c, d] of blds) {
    const x = cx + dx
    const top = cy + 3 - h
    g.rect(x - 1, top - 1, w + 2, h + 1, '#3a2838')
    g.rect(x, top, w, h, c)
    g.vline(x + w - 1, top, top + h - 1, d)
    for (let yy = top + 1; yy < cy + 2; yy += 2) for (let xx = x; xx < x + w - 1; xx += 2) g.px(xx, yy, '#ffe98a')
  }
  // Baiyoke-style spire.
  g.vline(cx, cy - 11, cy - 9, '#3a2838')
  g.px(cx, cy - 12, '#ff8a7a')
}

function drawCompass(g: Surface, cx: number, cy: number) {
  const R = 15
  g.circle(cx + 1, cy + 2, R + 2, '#2f6f9e')
  g.circle(cx, cy, R + 2, MC.ink)
  g.circle(cx, cy, R + 1, MC.woodD)
  g.circle(cx, cy, R, MC.paper)
  g.circle(cx, cy, R - 2, MC.paperL)
  // Tick ring.
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    g.px(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1), i % 4 === 0 ? MC.ink : MC.paperDD)
  }
  // Eight-point star.
  const pt = (a: number, r: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2
    const main = k % 2 === 0
    const r = main ? R - 2 : R - 7
    const w = main ? 3 : 2
    const tip = pt(a, r)
    const l = pt(a - Math.PI / 2, w)
    const rr = pt(a + Math.PI / 2, w)
    const col1 = k === 0 ? '#e8514a' : main ? MC.goldD : '#8c8187'
    const col2 = k === 0 ? '#ff8a7a' : main ? MC.gold : '#bdb2ae'
    g.poly([tip, l, [cx, cy]], col1)
    g.poly([tip, rr, [cx, cy]], col2)
  }
  g.circle(cx, cy, 2, MC.ink)
  g.px(cx, cy, MC.gold)
  // "N" above.
  const N = ['#...#', '##..#', '#.#.#', '#..##', '#...#']
  const nx = cx - 2
  const ny = cy - R - 9
  g.rect(nx - 2, ny - 2, 9, 9, MC.ink)
  g.rect(nx - 1, ny - 1, 7, 7, MC.paperL)
  N.forEach((row, yy) => {
    for (let xx = 0; xx < 5; xx++) if (row[xx] === '#') g.px(nx + xx, ny + yy, '#b8343f')
  })
}

function drawFrame(g: Surface, W: number, H: number) {
  const P = MAP.PAD
  // Wood planks with grain.
  const wood = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    g.rect(x, y, w, h, MC.wood)
    const r = seededRand(x * 31 + y * 7 + w)
    for (let k = 0; k < (vertical ? h : w) / 5; k++) {
      const a = Math.floor(r() * (vertical ? h : w))
      const b = Math.floor(r() * (vertical ? w : h))
      const len = 3 + Math.floor(r() * 8)
      if (vertical) g.vline(x + b, y + a, y + Math.min(h - 1, a + len), r() < 0.5 ? MC.woodD : MC.woodL)
      else g.hline(x + a, x + Math.min(w - 1, a + len), y + b, r() < 0.5 ? MC.woodD : MC.woodL)
    }
  }
  wood(0, 0, W, P, false)
  wood(0, H - P, W, P, false)
  wood(0, P, P, H - 2 * P, true)
  wood(W - P, P, P, H - 2 * P, true)
  g.frame(0, 0, W, H, MC.ink)
  g.frame(1, 1, W - 2, H - 2, MC.woodL)
  g.hline(2, W - 3, 2, MC.woodL)
  // Inner lip.
  g.frame(P - 3, P - 3, W - 2 * (P - 3), H - 2 * (P - 3), MC.woodDD)
  g.frame(P - 2, P - 2, W - 2 * (P - 2), H - 2 * (P - 2), MC.gold)
  g.frame(P - 1, P - 1, W - 2 * (P - 1), H - 2 * (P - 1), MC.ink)
  // Degree ticks: alternating ink/cream band on the inside of the lip.
  for (let lat = 21; lat >= 5; lat -= 0.5) {
    const [, y0] = proj(0, lat)
    const [, y1] = proj(0, lat - 0.5)
    const dark = Math.round(lat * 2) % 2 === 0
    const c = dark ? MC.ink : MC.paperL
    g.rect(P - 6, Math.max(P, y0), 2, Math.min(H - P, y1) - Math.max(P, y0), c)
    g.rect(W - P + 4, Math.max(P, y0), 2, Math.min(H - P, y1) - Math.max(P, y0), c)
  }
  for (let lon = 96.5; lon <= 106.5; lon += 0.5) {
    const [x0] = proj(lon, 0)
    const [x1] = proj(lon + 0.5, 0)
    const dark = Math.round(lon * 2) % 2 === 0
    const c = dark ? MC.ink : MC.paperL
    const a = Math.max(P, x0)
    const b = Math.min(W - P, x1)
    if (b > a) {
      g.rect(a, P - 6, b - a, 2, c)
      g.rect(a, H - P + 4, b - a, 2, c)
    }
  }
  // Brass corner caps.
  for (const [x, y] of [
    [0, 0],
    [W - 14, 0],
    [0, H - 14],
    [W - 14, H - 14],
  ]) {
    g.rect(x + 1, y + 1, 13, 13, MC.ink)
    g.rect(x + 2, y + 2, 11, 11, MC.goldD)
    g.rect(x + 3, y + 3, 9, 9, MC.gold)
    g.rect(x + 3, y + 3, 9, 1, MC.goldL)
    g.rect(x + 3, y + 3, 1, 9, MC.goldL)
    g.rect(x + 5, y + 5, 5, 5, MC.goldDD)
    g.rect(x + 6, y + 6, 3, 3, MC.gold)
    g.px(x + 7, y + 7, '#ffffff')
  }
}

// ---------------------------------------------------------------------------
// Bangkok + hometown inset (magnifier lens in the gulf)

function drawInset(g: Surface) {
  const { cx, cy, r } = INSET
  const bx = BANGKOK.x
  const by = BANGKOK.y
  // Magnifier cone from Bangkok to the lens.
  const d = Math.hypot(cx - bx, cy - by)
  const a0 = Math.atan2(cy - by, cx - bx)
  const spread = Math.asin(Math.min(1, (r + 3) / d))
  for (const sgn of [-1, 1]) {
    const tx = cx + Math.cos(a0 + sgn * (Math.PI / 2 - spread)) * (r + 3)
    const ty = cy + Math.sin(a0 + sgn * (Math.PI / 2 - spread)) * (r + 3)
    const sx = bx + Math.cos(a0 + sgn * Math.PI / 2) * 6
    const sy = by + Math.sin(a0 + sgn * Math.PI / 2) * 6
    const n = Math.ceil(Math.hypot(tx - sx, ty - sy))
    for (let i = 0; i <= n; i += 1) {
      if (i % 4 === 3) continue
      const t = i / n
      g.px(sx + (tx - sx) * t, sy + (ty - sy) * t, MC.ink)
      g.px(sx + (tx - sx) * t + 1, sy + (ty - sy) * t, MC.goldL)
    }
  }
  // Ring around Bangkok on the main map.
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    if (i % 2) continue
    g.px(bx + Math.cos(a) * 12, by + 1 + Math.sin(a) * 9, MC.ink)
  }
  // Shadow + frame.
  g.circle(cx + 2, cy + 3, r + 5, '#2f6f9e')
  g.circle(cx, cy, r + 5, MC.ink)
  g.circle(cx, cy, r + 4, MC.woodD)
  g.circle(cx, cy, r + 3, MC.wood)
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    if (Math.sin(a - 2.4) > 0.2) g.px(cx + Math.cos(a) * (r + 3.5), cy + Math.sin(a) * (r + 3.5), MC.woodL)
  }
  g.circle(cx, cy, r + 1.5, MC.gold)
  g.circle(cx, cy, r + 0.5, MC.ink)
  g.draw(insetContent(), cx - r, cy - r)
}

/** The lens content: stylised Rattanakosin/Chao Phraya above, hometown below. */
export function insetContent(): HTMLCanvasElement {
  return cached('tm-inset', () => {
    const { r } = INSET
    const S = r * 2
    const c = bake(S, S, (g) => {
      const o = r
      // Ground: city pink-cream on top, meadow green below.
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dy = y - o
          const n = fbm(x * 0.12, y * 0.12, 60)
          let col: Color
          if (dy < 12 + Math.sin(x * 0.12) * 3) col = n > 0.6 ? '#ffe9ef' : n < 0.38 ? '#f7cfd9' : '#fbdce4'
          else col = n > 0.6 ? '#c6ec96' : n < 0.38 ? '#96d46e' : '#b0e284'
          g.px(x, y, col)
        }
      // City blocks (soi grid) in the upper half.
      const rb = seededRand(3)
      for (let by = 4; by < o + 8; by += 7)
        for (let bx = 2; bx < S; bx += 8) {
          if (rb() < 0.3) continue
          const w = 5 + Math.floor(rb() * 2)
          const h = 4 + Math.floor(rb() * 2)
          const col = ['#fff6f8', '#f4c4d2', '#fbe3c8', '#e8dcf6'][Math.floor(rb() * 4)]
          g.rect(bx, by, w, h, col)
          g.hline(bx, bx + w - 1, by + h, '#e6a8bc')
        }
      // Canals/khlongs in the hometown.
      g.thickLine(0, o + 30, S, o + 40, 2, '#78d2e2')
      // Paddies.
      for (let y = o + 16; y < S; y += 3) for (let x = (y % 2) * 2; x < S; x += 5) if (fbm(x * 0.1, y * 0.1, 62) > 0.5) g.hline(x, x + 2, y, '#d6f2a0')
      // Chao Phraya: a fat winding river, drawn as a chain of discs.
      const river: [number, number][] = [
        [-8, -62], [-10, -44], [-18, -30], [-22, -16], [-20, -2], [-12, 8], [2, 14], [4, 22], [-4, 34], [-18, 46], [-24, 62],
      ]
      const pts = river.map(([x, y]) => [x + o, y + o] as [number, number])
      const sm = smoothPath(pts, 6)
      for (const [x, y] of sm) g.circle(x, y, 6, '#3f8fb8')
      for (const [x, y] of sm) g.circle(x, y, 5, '#5fb4de')
      for (const [x, y] of sm) g.circle(x - 1, y - 1, 2.4, '#8ad0ec')
      // Ripples.
      for (let i = 0; i < sm.length; i += 5) g.hline(sm[i][0] - 2, sm[i][0], sm[i][1], '#c6ecf8')
      // Bridges.
      for (const t of [0.28, 0.7]) {
        const p = sm[Math.floor(t * (sm.length - 1))]
        g.rect(p[0] - 8, p[1] - 1, 16, 3, '#e0bb8a')
        g.hline(p[0] - 8, p[0] + 7, p[1] - 1, '#fff1d6')
        g.hline(p[0] - 8, p[0] + 7, p[1] + 2, '#9a6a45')
      }
      // Grand Palace walls (white crenellated square) near Wat Phra Kaew.
      g.frame(o - 12, o - 36, 22, 16, '#fffaf0')
      g.frame(o - 13, o - 37, 24, 18, '#d9c8b0')
      // Trees scattered in the hometown.
      const tr = treeSprite('#3f8a4e', '#56a85c', '#86c95f', '#6e4a35')
      const rt = seededRand(8)
      for (let k = 0; k < 40; k++) {
        const x = Math.floor(rt() * S)
        const y = Math.floor(o + 12 + rt() * r)
        g.draw(tr, x, y)
      }
      // The player's house: a little Thai house with a heart.
      drawHomeHouse(g, o + 6, o + 50)
      // Soft vignette at the rim.
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dd = Math.hypot(x + 0.5 - o, y + 0.5 - o) / r
          if (dd > 0.86 && ditherOn(x, y, (dd - 0.86) * 5)) g.px(x, y, dd > 0.95 ? '#c89aa8' : '#e8c4cc')
        }
      // Lens glare.
      g.ctx.globalAlpha = 0.35
      for (let i = 0; i < 18; i++) {
        const a = -2.6 + i * 0.05
        g.px(o + Math.cos(a) * (r - 5), o + Math.sin(a) * (r - 5), '#ffffff')
        g.px(o + Math.cos(a) * (r - 6), o + Math.sin(a) * (r - 6), '#ffffff')
      }
      g.ctx.globalAlpha = 1
      // Clip to the circle.
      g.ctx.globalCompositeOperation = 'destination-in'
      g.ctx.fillStyle = '#000'
      g.ctx.beginPath()
      g.ctx.arc(o, o, r, 0, Math.PI * 2)
      g.ctx.fill()
      g.ctx.globalCompositeOperation = 'source-over'
      // Re-rasterise the soft arc edge crisp.
      const d = g.ctx.getImageData(0, 0, S, S)
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 128 ? 255 : 0
      g.ctx.putImageData(d, 0, 0)
    })
    return { canvas: c, w: S, h: S }
  }).canvas
}

function drawHomeHouse(g: Surface, x: number, gy: number) {
  // Stilts.
  g.rect(x - 7, gy - 3, 1, 3, MC.woodD)
  g.rect(x + 6, gy - 3, 1, 3, MC.woodD)
  // Body.
  g.rect(x - 8, gy - 10, 16, 8, MC.ink)
  g.rect(x - 7, gy - 9, 14, 6, '#f3dcb2')
  g.rect(x - 7, gy - 4, 14, 1, '#c28e5c')
  g.rect(x - 1, gy - 8, 3, 5, '#9a6a45')
  g.rect(x - 5, gy - 8, 2, 2, '#9fd0ff')
  g.rect(x + 4, gy - 8, 2, 2, '#9fd0ff')
  // Steep roof.
  g.poly([[x - 11, gy - 9], [x, gy - 18], [x + 11, gy - 9]], MC.ink)
  g.poly([[x - 9, gy - 10], [x, gy - 17], [x + 9, gy - 10]], '#e8514a')
  g.line(x - 8, gy - 11, x - 1, gy - 16, '#ff8a7a')
  // Heart.
  g.px(x - 1, gy - 14, '#ffffff')
  g.px(x + 1, gy - 14, '#ffffff')
  g.hline(x - 1, x + 1, gy - 13, '#ffffff')
  g.px(x, gy - 12, '#ffffff')
}

/** Catmull-Rom-ish resampling of a polyline into ~1px steps. */
export function smoothPath(pts: [number, number][], _k: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])))
    for (let j = 0; j < n; j++) {
      const t = j / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

// ---------------------------------------------------------------------------
// Thai labels: rendered with the UI font, then snapped to hard pixels.

const LABEL_FONT = '"Mali", "Loma", "Noto Sans Thai", "Leelawadee UI", "Thonburi", Tahoma, sans-serif'

/** Crisp pixel text sprite (alpha-thresholded canvas text with an outline). */
export function textSprite(text: string, color: Color, outline: Color | null, size = 9, weight = 600): Sprite {
  const pad = 3
  const probe = createCanvas(8, 8).getContext('2d')!
  probe.font = `${weight} ${size}px ${LABEL_FONT}`
  const w = Math.ceil(probe.measureText(text).width) + pad * 2
  const h = Math.ceil(size * 1.9) + pad * 2
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')!
  ctx.font = probe.font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(text, pad, h / 2 + 1)
  const d = ctx.getImageData(0, 0, w, h)
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16))
  let minY = h
  let maxY = 0
  let minX = w
  let maxX = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const on = d.data[i + 3] > 96
      d.data[i] = r
      d.data[i + 1] = g
      d.data[i + 2] = b
      d.data[i + 3] = on ? 255 : 0
      if (on) {
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
    }
  ctx.putImageData(d, 0, 0)
  const cw = Math.max(1, maxX - minX + 1)
  const ch = Math.max(1, maxY - minY + 1)
  const crop = createCanvas(cw, ch)
  crop.getContext('2d')!.drawImage(c, -minX, -minY)
  return outline ? outlineCanvas(crop, outline, true) : { canvas: crop, w: cw, h: ch }
}

interface LabelDef {
  text: string
  ll: LL
  kind: 'region' | 'country' | 'sea' | 'river'
  color?: Color
}
const LABELS: LabelDef[] = [
  { text: 'ภาคเหนือ', ll: [100.35, 18.1], kind: 'region', color: '#4f9651' },
  { text: 'ภาคอีสาน', ll: [103.55, 16.05], kind: 'region', color: '#b98646' },
  { text: 'ภาคกลาง', ll: [100.2, 15.95], kind: 'region', color: '#82ad5c' },
  { text: 'ภาคตะวันออก', ll: [102.25, 12.75], kind: 'region', color: '#4c9a88' },
  { text: 'ภาคตะวันตก', ll: [98.85, 16.55], kind: 'region', color: '#9a8650' },
  { text: 'ภาคใต้', ll: [99.35, 8.05], kind: 'region', color: '#348654' },
  { text: 'เมียนมา', ll: [97.55, 20.35], kind: 'country' },
  { text: 'ลาว', ll: [102.9, 19.35], kind: 'country' },
  { text: 'กัมพูชา', ll: [104.55, 13.55], kind: 'country' },
  { text: 'เวียดนาม', ll: [105.55, 10.55], kind: 'country' },
  { text: 'มาเลเซีย', ll: [101.9, 5.42], kind: 'country' },
  { text: 'ทะเลอันดามัน', ll: [98.0, 6.75], kind: 'sea' },
  { text: 'อ่าวไทย', ll: [101.7, 8.35], kind: 'sea' },
  { text: 'ทะเลจีนใต้', ll: [104.75, 7.4], kind: 'sea' },
  { text: 'แม่น้ำโขง', ll: [105.02, 16.42], kind: 'river' },
]

let labelLayer: HTMLCanvasElement | null = null
let labelFontOk = false

/** Map labels as a transparent overlay; rebuilt once the UI font has loaded. */
export function mapLabels(): HTMLCanvasElement {
  const fontOk = typeof document !== 'undefined' && !!document.fonts?.check?.(`600 9px Mali`, 'ก')
  if (labelLayer && (labelFontOk || !fontOk)) return labelLayer
  labelFontOk = fontOk
  labelLayer = bake(MAP.W, MAP.H, (g) => {
    for (const l of LABELS) {
      const [x, y] = proj(l.ll[0], l.ll[1])
      let spr: Sprite
      if (l.kind === 'region') {
        const t = textSprite(l.text, '#fffaf0', null, 10, 600)
        const w = t.w + 8
        const h = t.h + 5
        const col = l.color ?? '#5a3d4f'
        spr = {
          canvas: bake(w + 2, h + 3, (s) => {
            s.rect(1, 2, w, h, '#3a2838')
            s.rect(0, 1, w + 2, h, '#3a2838')
            s.rect(1, 1, w, h - 1, col)
            s.hline(2, w - 1, 1, mix(col, '#ffffff', 0.35))
            s.draw(t.canvas, 4, 3)
          }),
          w: w + 2,
          h: h + 3,
        }
      } else if (l.kind === 'country') spr = textSprite(l.text, '#a88a64', '#f6ead0', 9, 600)
      else if (l.kind === 'river') spr = textSprite(l.text, '#2f77a8', '#d4f1ff', 8, 600)
      else spr = textSprite(l.text, '#e6f8ff', '#2f6f9e', 10, 600)
      g.draw(spr.canvas, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2))
    }
    ribbon(g, INSET.cx, INSET.cy - INSET.r - 3, 'กรุงเทพฯ', '#e8514a')
    ribbon(g, INSET.cx, INSET.cy + INSET.r + 4, 'บ้านเรา', '#5ea653')
  })
  return labelLayer
}

function ribbon(g: Surface, cx: number, cy: number, text: string, col: Color) {
  const t = textSprite(text, '#fffaf0', null, 9, 600)
  const w = t.w + 12
  const h = t.h + 6
  const x = Math.round(cx - w / 2)
  const y = Math.round(cy - h / 2)
  const dark = mix(col, '#3a2838', 0.45)
  for (const sx of [-1, 1]) {
    const tx = sx < 0 ? x - 7 : x + w - 1
    const notch = sx < 0 ? tx + 3 : tx + 5
    g.poly([[tx, y + 3], [tx + 8, y + 3], [tx + 8, y + h + 3], [tx, y + h + 3], [notch, y + h / 2 + 3]], '#3a2838')
    g.poly([[tx + 1, y + 4], [tx + 7, y + 4], [tx + 7, y + h + 2], [tx + 1, y + h + 2], [notch + (sx < 0 ? 1 : -1), y + h / 2 + 3]], dark)
  }
  g.rect(x - 1, y - 1, w + 2, h + 2, '#3a2838')
  g.rect(x, y, w, h, col)
  g.hline(x + 1, x + w - 2, y, mix(col, '#ffffff', 0.4))
  g.hline(x, x + w - 1, y + h - 1, dark)
  g.draw(t.canvas, x + 6, y + 3)
}

// ---------------------------------------------------------------------------
// Landmark icons (art box 22×22, may poke 3px above; 24×26 with outline)

type Ramp = { L: Color; B: Color; M: Color; D: Color; DD: Color }
const GO: Ramp = { L: '#fff6c2', B: '#ffd54f', M: '#f5b83a', D: '#d98f2b', DD: '#a8621f' }
const WH: Ramp = { L: '#ffffff', B: '#fffaf0', M: '#efe4d2', D: '#d9c8b0', DD: '#b8a48c' }
const RF = { L: '#ffb066', B: '#f08a3a', D: '#c9602a', E: '#3f9a6b', EL: '#6cc38a' }
const GR = { L: '#b4e486', B: '#86c95f', D: '#5ea653', DD: '#43905a' }
const WA = { L: '#b3eef4', B: '#78d2e2', D: '#47a6cb' }
const ROBE = '#ee9136'

function gnd(g: Surface, kind: 'grass' | 'stone' | 'water' | 'sand' | 'marble', rx = 10) {
  const cx = 11
  const cy = 19.5
  const pal =
    kind === 'grass'
      ? [GR.D, GR.B, GR.L]
      : kind === 'water'
        ? [WA.D, WA.B, WA.L]
        : kind === 'sand'
          ? ['#e0bb8a', '#f3dcb2', '#fff1d6']
          : kind === 'marble'
            ? [WH.DD, WH.M, WH.L]
            : ['#8c8187', '#bdb2ae', '#e4ddd6']
  g.ellipse(cx, cy, rx, 2.6, pal[0])
  g.ellipse(cx, cy - 0.5, rx - 0.5, 2, pal[1])
  g.ellipse(cx - 2, cy - 1, rx * 0.5, 1, pal[2])
  if (kind === 'water') {
    g.hline(cx + 3, cx + 5, cy, WA.L)
    g.hline(cx - 7, cx - 6, cy + 1, WA.L)
  }
}

/** Bell (ระฆังคว่ำ) chedi: bell of half-width `rx` sitting on `by`, spire up to `top`. */
function bellChedi(g: Surface, cx: number, by: number, rx: number, bellH: number, top: number, c: Ramp, spire: Ramp = c) {
  g.rect(cx - rx - 2, by - 2, rx * 2 + 5, 2, c.D)
  g.hline(cx - rx - 2, cx + rx + 2, by - 2, c.B)
  g.rect(cx - rx - 1, by - 3, rx * 2 + 3, 1, c.M)
  const bt = by - 3 - bellH
  for (let y = 0; y < bellH; y++) {
    const f = (y + 0.5) / bellH
    const half = rx * Math.sqrt(Math.max(0, 1 - (1 - f) * (1 - f))) + (f > 0.8 ? (f - 0.8) * 4 : 0)
    const yy = bt + y
    g.hline(Math.round(cx - half), Math.round(cx + half), yy, c.B)
    g.hline(Math.round(cx + half * 0.35), Math.round(cx + half), yy, c.M)
    g.px(Math.round(cx + half), yy, c.D)
    g.px(Math.round(cx - half * 0.55), yy, c.L)
  }
  g.hline(cx - rx + 1, cx + rx - 1, by - 4, c.D)
  g.rect(cx - 1, bt - 2, 3, 2, spire.M)
  g.hline(cx - 1, cx + 1, bt - 2, spire.B)
  for (let y = bt - 3; y >= top; y--) {
    const f = (bt - 3 - y) / Math.max(1, bt - 3 - top)
    const w = f < 0.45 ? 1 : 0
    g.hline(cx - w, cx + w, y, (bt - y) % 2 ? spire.B : spire.M)
    if (w) g.px(cx + w, y, spire.D)
  }
  g.px(cx, top - 1, spire.L)
}

/** Seated Buddha `h` tall with its base on `by`. */
function seatedBuddha(g: Surface, cx: number, by: number, h: number, c: Ramp) {
  const s = h / 16
  g.ellipse(cx, by - 2 * s, 7 * s, 2.4 * s, c.M)
  g.ellipse(cx - 1, by - 2.4 * s, 6 * s, 1.6 * s, c.B)
  g.poly([[cx - 4.5 * s, by - 3 * s], [cx - 3.2 * s, by - 9.5 * s], [cx + 3.2 * s, by - 9.5 * s], [cx + 4.5 * s, by - 3 * s]], c.B)
  g.poly([[cx + 1 * s, by - 3 * s], [cx + 2.4 * s, by - 9.5 * s], [cx + 3.2 * s, by - 9.5 * s], [cx + 4.5 * s, by - 3 * s]], c.M)
  g.line(cx - 3 * s, by - 9 * s, cx + 1 * s, by - 3.5 * s, c.D)
  g.ellipse(cx, by - 3.2 * s, 2 * s, 0.9 * s, c.L)
  g.rect(cx - 1, by - 10.5 * s, 2, Math.max(1, 1.2 * s), c.M)
  g.ellipse(cx, by - 12 * s, 2.5 * s, 2.4 * s, c.B)
  g.ellipse(cx + 1 * s, by - 11.6 * s, 1.3 * s, 1.8 * s, c.M)
  g.px(cx - 1.2 * s, by - 12 * s, c.D)
  g.px(cx + 1.0 * s, by - 12 * s, c.D)
  g.ellipse(cx, by - 14.2 * s, 2 * s, 1 * s, c.D)
  g.vline(cx, by - 16 * s, by - 14.6 * s, c.M)
  g.px(cx, by - 16 * s - 1, c.L)
  g.px(cx - 1.4 * s, by - 12.8 * s, c.L)
}

/** Thai gabled roof tier with green eave trim and gold chofa horns. */
function roofTier(g: Surface, cx: number, y: number, w: number, h: number, c: { L: Color; B: Color; D: Color; E: Color; EL: Color }, chofa = true) {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  g.poly([[x0, y + h], [cx - 1, y], [cx + 1, y], [x1, y + h]], c.B)
  g.poly([[cx + 1, y], [x1, y + h], [cx + 2, y + h]], c.D)
  g.line(x0, y + h, cx - 1, y, c.E)
  g.line(x1, y + h, cx + 1, y, c.E)
  g.line(cx - 2, y + 2, x0 + 3, y + h - 1, c.L)
  if (chofa) {
    g.px(cx, y - 1, GO.B)
    g.px(cx + 1, y - 2, GO.M)
    g.px(x0 - 1, y + h - 1, GO.B)
    g.px(x0 - 2, y + h - 2, GO.M)
    g.px(x1 + 1, y + h - 1, GO.B)
    g.px(x1 + 2, y + h - 2, GO.M)
  }
}

function sparkle(g: Surface, x: number, y: number, c: Color = '#ffffff') {
  g.px(x, y, c)
  g.px(x - 1, y, c)
  g.px(x + 1, y, c)
  g.px(x, y - 1, c)
  g.px(x, y + 1, c)
}

function palmFan(g: Surface, x: number, gy: number, h: number) {
  g.vline(x, gy - h, gy, '#8a5a3a')
  g.vline(x + 1, gy - h + 2, gy, '#6e4a35')
  const top = gy - h
  for (let k = -3; k <= 3; k++) g.line(x, top, x + k * 1.3, top - 3 + Math.abs(k) * 0.6, k < 0 ? '#56b060' : '#3f9a55')
  g.px(x, top - 3, '#86c95f')
}

function iconTree(g: Surface, x: number, gy: number, r: number) {
  g.vline(x, gy - r - 1, gy, '#8a5a3a')
  g.circle(x, gy - r - 2, r, GR.D)
  g.circle(x - 1, gy - r - 3, r - 1, GR.B)
  g.px(x - 2, gy - r - 4, GR.L)
}

/** Compact prang for icons (Wat Arun style). */
function prangMini(g: Surface, cx: number, by: number, h: number, p: { body: Color; light: Color; shade: Color; dark: Color; accent: Color; accent2: Color }) {
  const baseW = Math.max(5, Math.round(h * 0.55))
  let y = by
  const tiers = h > 10 ? 3 : 2
  for (let i = 0; i < tiers; i++) {
    const tw = baseW - i * 2
    g.rect(cx - Math.floor(tw / 2), y - 2, tw, 2, p.body)
    g.hline(cx - Math.floor(tw / 2), cx + Math.ceil(tw / 2) - 1, y - 2, p.light)
    g.px(cx + Math.ceil(tw / 2) - 1, y - 1, p.shade)
    y -= 2
  }
  const towerH = h - tiers * 2 - 3
  for (let k = 0; k < towerH; k++) {
    const f = k / towerH
    const half = Math.max(0.5, (baseW / 2 - 1.2) * Math.pow(1 - f, 0.6))
    const yy = y - k - 1
    const band = k % 3
    g.hline(Math.round(cx - half), Math.round(cx + half) - (half < 1 ? 0 : 1), yy, band === 0 ? p.dark : p.body)
    if (half >= 1.5) g.px(Math.round(cx + half) - 1, yy, p.shade)
    if (band === 1 && half >= 2) {
      g.px(Math.round(cx - half) + 1, yy, p.accent)
      g.px(cx, yy, p.accent2)
    }
  }
  const top = y - towerH
  g.vline(cx, top - 3, top, p.light)
  g.px(cx, top - 4, GO.B)
}

const ICON_DRAW: Record<string, (g: Surface) => void> = {
  wat_phra_kaew(g) {
    gnd(g, 'marble')
    g.rect(6, 15, 10, 4, GO.D)
    g.rect(7, 14, 8, 1, GO.B)
    g.hline(6, 15, 15, GO.L)
    g.rect(8, 16, 6, 2, '#e8514a')
    seatedBuddha(g, 11, 14, 10, { L: '#b6f5cf', B: '#3fbf7a', M: '#2e9a62', D: '#1f7a4e', DD: '#155a3a' })
    g.px(11, 4, GO.B)
    g.px(11, 3, GO.L)
    roofTier(g, 11, 0, 20, 5, RF)
    g.hline(2, 20, 5, GO.D)
    g.vline(3, 6, 15, WH.B)
    g.vline(19, 6, 15, WH.B)
    g.vline(4, 6, 15, WH.D)
    g.vline(18, 6, 15, WH.D)
    sparkle(g, 16, 9, '#dfffe8')
  },
  wat_pho(g) {
    gnd(g, 'stone', 10.5)
    g.rect(1, 16, 20, 3, '#b8343f')
    g.hline(1, 20, 16, '#e8514a')
    for (let x = 2; x < 20; x += 3) g.px(x, 17, GO.B)
    g.rect(1, 11, 4, 5, '#5a8de0')
    g.hline(1, 4, 11, '#9fd0ff')
    g.px(2, 13, GO.B)
    g.ellipse(12.5, 13.5, 8.5, 2.6, GO.M)
    g.ellipse(12, 12.8, 7.8, 1.9, GO.B)
    g.hline(7, 18, 14, GO.D)
    g.line(6, 11, 16, 12, GO.L)
    g.rect(19, 10, 2, 6, WH.L)
    g.px(19, 12, '#9fd0ff')
    g.px(20, 14, '#ff9fc0')
    g.rect(3, 9, 2, 4, GO.D)
    g.ellipse(5, 8.5, 2.6, 2.4, GO.B)
    g.px(4, 8, GO.DD)
    g.px(6, 7, GO.L)
    g.ellipse(5, 6.4, 1.8, 0.9, GO.D)
    g.vline(5, 3, 5, GO.M)
    g.px(5, 2, GO.L)
    sparkle(g, 14, 9)
  },
  wat_arun(g) {
    gnd(g, 'water')
    const pal = { body: '#e8e0f0', light: '#ffffff', shade: '#b8b0cc', dark: '#8a809e', accent: '#5a8de0', accent2: '#e8709e' }
    prangMini(g, 4, 18, 9, pal)
    prangMini(g, 18, 18, 9, pal)
    prangMini(g, 11, 19, 21, pal)
  },
  erawan(g) {
    gnd(g, 'marble')
    for (let x = 2; x < 21; x += 2) {
      g.px(x, 17, x % 4 ? '#f58f35' : '#ffd54f')
      g.px(x + 1, 18, x % 4 ? '#ffd54f' : '#e8514a')
    }
    g.rect(5, 14, 12, 3, WH.M)
    g.hline(5, 16, 14, WH.L)
    g.rect(5, 16, 12, 1, GO.D)
    g.rect(4, 7, 2, 7, GO.M)
    g.rect(16, 7, 2, 7, GO.D)
    g.px(4, 7, GO.L)
    g.rect(8, 10, 6, 4, GO.B)
    g.ellipse(11, 8.5, 2.5, 2, GO.B)
    g.px(10, 8, GO.DD)
    g.px(12, 8, GO.DD)
    g.ellipse(8, 9, 1.2, 1.4, GO.M)
    g.ellipse(14, 9, 1.2, 1.4, GO.M)
    g.line(7, 11, 6, 9, GO.M)
    g.line(15, 11, 16, 9, GO.D)
    g.line(8, 12, 6, 13, GO.M)
    g.line(14, 12, 16, 13, GO.D)
    g.rect(3, 6, 16, 1, GO.DD)
    g.rect(4, 5, 14, 1, GO.D)
    for (let i = 0; i < 5; i++) {
      const w = 5 - i
      g.hline(11 - w, 11 + w, 4 - i, i % 2 ? GO.M : GO.B)
    }
    g.vline(11, -2, 0, GO.B)
    g.px(11, -3, GO.L)
    g.px(3, 5, GO.B)
    g.px(19, 5, GO.B)
  },
  golden_mount(g) {
    gnd(g, 'grass')
    g.ellipse(11, 16, 10, 7, GR.D)
    g.ellipse(10, 15, 9, 6, GR.B)
    g.ellipse(8, 13, 5, 3, GR.L)
    g.line(4, 18, 15, 14, WH.B)
    g.line(15, 14, 7, 11, WH.B)
    g.line(7, 11, 11, 9, WH.B)
    for (const [x, y] of [[3, 15], [17, 16], [15, 11], [5, 12]]) {
      g.circle(x, y, 1.5, GR.DD)
      g.px(x - 1, y - 1, GR.B)
    }
    g.rect(7, 9, 9, 2, WH.M)
    g.hline(7, 15, 9, WH.L)
    bellChedi(g, 11, 10, 3, 3, -1, GO)
    g.hline(8, 14, 6, '#e8514a')
    g.hline(9, 13, 7, '#b8343f')
    sparkle(g, 16, 2)
  },
  wat_traimit(g) {
    gnd(g, 'marble')
    g.rect(3, 16, 16, 3, WH.M)
    g.hline(3, 18, 16, WH.L)
    g.hline(3, 18, 18, GO.D)
    g.ellipse(11, 8, 8.5, 8.5, '#7e2436')
    g.rect(3, 8, 17, 8, '#7e2436')
    g.ellipse(11, 8, 7.5, 7.5, '#b8343f')
    g.rect(4, 8, 15, 8, '#b8343f')
    for (let a = 0; a < 9; a++) g.px(11 + Math.cos(Math.PI + (a / 8) * Math.PI) * 8, 8 + Math.sin(Math.PI + (a / 8) * Math.PI) * 8, GO.B)
    seatedBuddha(g, 11, 16, 16, GO)
    sparkle(g, 4, 5)
    sparkle(g, 18, 11)
    g.px(8, 12, '#ffffff')
  },
  wat_sothon(g) {
    gnd(g, 'water')
    g.rect(3, 12, 16, 6, WH.B)
    g.rect(15, 12, 4, 6, WH.D)
    for (let x = 4; x < 19; x += 3) g.vline(x, 13, 17, WH.DD)
    g.rect(9, 14, 4, 4, '#b8343f')
    g.rect(10, 15, 2, 3, GO.B)
    roofTier(g, 11, 8, 20, 4, RF)
    for (let i = 0; i < 6; i++) {
      const w = 4 - Math.floor(i * 0.6)
      g.rect(11 - w, Math.round(7 - i * 1.2), w * 2 + 1, 1, i % 2 ? WH.B : GO.B)
    }
    g.vline(11, -1, 1, GO.B)
    g.px(11, -2, GO.L)
    for (const x of [2, 4, 19]) {
      g.ellipse(x, 18.5, 1, 1.3, '#ffffff')
      g.px(x, 18, '#fff6c2')
    }
  },
  wat_samarn(g) {
    gnd(g, 'grass', 10.5)
    const pk = { L: '#ffd6e0', B: '#ff9fc0', M: '#f58ab4', D: '#e8709e', DD: '#c14f80' }
    g.ellipse(13, 14, 8, 4, pk.D)
    g.ellipse(12.5, 13.3, 7.4, 3.4, pk.B)
    g.ellipse(14, 12, 3.5, 2.2, pk.L)
    g.ellipse(16, 16, 4, 1.6, pk.M)
    g.ellipse(6, 9, 3.6, 3.4, pk.B)
    g.ellipse(9, 9.5, 2.6, 3.2, pk.M)
    g.ellipse(9.4, 9.5, 1.6, 2.2, pk.L)
    g.px(5, 8, pk.DD)
    g.line(4, 11, 3, 14, pk.D)
    g.line(3, 14, 4, 16, pk.D)
    g.px(3, 12, pk.B)
    g.px(5, 12, '#ffffff')
    g.rect(4, 5, 4, 2, GO.B)
    g.px(6, 3, GO.L)
    g.px(6, 4, GO.B)
    g.px(4, 4, GO.M)
    g.px(7, 4, GO.M)
    g.rect(8, 12, 2, 3, pk.D)
    g.ellipse(19, 17.5, 1.8, 1.2, '#bdb2ae')
    g.px(20, 16, '#e4ddd6')
    g.px(21, 17, '#3a2838')
    g.px(17, 18, '#8c8187')
  },
  wat_mahathat_ayutthaya(g) {
    gnd(g, 'grass')
    g.rect(15, 6, 5, 12, '#c9603a')
    g.rect(16, 3, 3, 3, '#b8543a')
    g.px(17, 2, '#b8543a')
    g.vline(19, 6, 17, '#9a4323')
    for (let y = 7; y < 17; y += 2) g.hline(15, 18, y, '#e08050')
    g.circle(8, 5, 5, GR.DD)
    g.circle(7, 4, 4, GR.D)
    g.circle(6, 3, 2.5, GR.B)
    g.circle(12, 6, 3, GR.D)
    g.px(5, 2, GR.L)
    g.rect(7, 8, 3, 5, '#8a5a3a')
    g.line(6, 10, 3, 18, '#8a5a3a')
    g.line(10, 10, 14, 18, '#8a5a3a')
    g.line(7, 12, 5, 18, '#6e4a35')
    g.line(9, 12, 12, 18, '#6e4a35')
    g.ellipse(8.5, 15, 3, 3.2, '#bdb2ae')
    g.ellipse(9, 14.5, 2, 2.4, '#d6ccc4')
    g.rect(6, 11, 5, 2, '#8c8187')
    g.hline(7, 8, 14, '#625867')
    g.hline(10, 11, 14, '#625867')
    g.px(9, 17, '#8c8187')
    g.line(6, 13, 8, 18, '#6e4a35')
  },
  doi_suthep(g) {
    g.poly([[0, 21], [8, 7], [14, 7], [22, 21]], GR.DD)
    g.poly([[1, 21], [8, 8], [11, 8], [9, 21]], GR.B)
    g.poly([[11, 8], [14, 8], [21, 21], [14, 21]], GR.D)
    for (const [x, y] of [[4, 17], [17, 15], [7, 13], [15, 18]]) {
      g.circle(x, y, 1.5, GR.DD)
      g.px(x - 1, y - 1, GR.L)
    }
    g.line(11, 20, 8, 15, GO.B)
    g.line(8, 15, 12, 11, GO.B)
    g.line(12, 20, 9, 15, '#3f9a6b')
    g.line(9, 15, 13, 11, '#3f9a6b')
    g.rect(7, 7, 9, 2, GO.D)
    g.rect(8, 5, 7, 2, GO.M)
    g.hline(8, 14, 5, GO.B)
    g.rect(9, 3, 5, 2, GO.B)
    g.vline(13, 3, 4, GO.D)
    g.rect(10, 1, 3, 2, GO.M)
    g.vline(11, -2, 0, GO.B)
    g.hline(10, 12, -1, GO.L)
    g.px(9, 3, GO.L)
    g.hline(0, 4, 11, '#ffffff')
    g.hline(1, 6, 12, WH.M)
    g.hline(17, 21, 9, '#ffffff')
    g.hline(16, 20, 10, WH.M)
  },
  wat_rong_khun(g) {
    gnd(g, 'water')
    const W = { L: '#ffffff', B: '#f4f8ff', D: '#c8d6f0', E: '#9fb8e8', EL: '#e0ecff' }
    g.rect(4, 12, 14, 6, W.B)
    g.rect(14, 12, 4, 6, W.D)
    for (let x = 5; x < 18; x += 3) g.vline(x, 13, 17, W.E)
    g.rect(9, 14, 4, 4, '#dce8ff')
    g.vline(11, 14, 17, W.E)
    roofTier(g, 11, 8, 18, 4, W, false)
    roofTier(g, 11, 4, 12, 4, W, false)
    roofTier(g, 11, 0, 7, 4, W, false)
    g.line(1, 11, 0, 8, W.E)
    g.line(21, 11, 22, 8, W.E)
    g.px(0, 7, '#ffffff')
    g.px(22, 7, '#ffffff')
    for (const [x, y] of [[6, 10], [15, 6], [9, 3], [13, 11], [5, 15], [16, 15], [11, 1]]) g.px(x, y, '#9fd0ff')
    sparkle(g, 18, 3)
    sparkle(g, 3, 5, '#e0ecff')
  },
  wat_huay_pla_kang(g) {
    gnd(g, 'grass')
    for (let i = 0; i < 8; i++) {
      const y = 17 - i * 2
      const w = 4 - Math.floor(i / 3)
      g.rect(17 - w + 1, y - 1, w * 2 - 1, 1, WH.B)
      g.hline(17 - w, 17 + w, y, '#e8514a')
      g.px(17 - w - 1, y - 1, '#e8514a')
      g.px(17 + w + 1, y - 1, '#e8514a')
    }
    g.vline(17, -1, 1, GO.B)
    g.circle(8, 4, 4, GO.L)
    g.circle(8, 4, 3, '#fff9d8')
    g.poly([[4, 19], [6, 7], [10, 7], [12, 19]], WH.B)
    g.poly([[8, 8], [10, 7], [12, 19], [9, 19]], WH.M)
    g.line(6, 11, 8, 18, WH.D)
    g.ellipse(8, 5, 2.6, 2.8, WH.L)
    g.ellipse(8, 5.5, 1.6, 1.8, '#ffe7d3')
    g.px(7, 5, '#b8a48c')
    g.px(9, 5, '#b8a48c')
    g.rect(5, 11, 2, 2, '#9fd0ff')
    g.px(5, 10, '#86c95f')
  },
  that_phanom(g) {
    gnd(g, 'stone')
    g.rect(3, 15, 16, 3, WH.B)
    g.rect(15, 15, 4, 3, WH.D)
    g.hline(3, 18, 15, GO.B)
    g.rect(5, 12, 12, 3, WH.B)
    g.rect(14, 12, 3, 3, WH.D)
    g.hline(5, 16, 12, GO.M)
    for (let y = 1; y < 12; y++) {
      const f = (12 - y) / 11
      const half = Math.round(4.5 * (1 - f * 0.75) + Math.sin(f * Math.PI) * 1.2)
      const gold = y < 6
      g.hline(11 - half, 11 + half, y, gold ? GO.B : WH.B)
      g.hline(11 + Math.ceil(half * 0.3), 11 + half, y, gold ? GO.M : WH.D)
      g.px(11 - half, y, gold ? GO.L : WH.L)
    }
    g.hline(8, 14, 9, GO.D)
    g.hline(9, 13, 6, GO.D)
    g.vline(11, -2, 0, GO.B)
    g.hline(10, 12, -1, GO.L)
    g.px(10, 10, GO.D)
    g.px(12, 10, GO.D)
    sparkle(g, 16, 3)
  },
  kham_chanod(g) {
    gnd(g, 'water')
    palmFan(g, 3, 17, 11)
    palmFan(g, 18, 16, 13)
    palmFan(g, 20, 18, 8)
    const N = { B: '#4fb06a', D: '#35864f' }
    g.thickLine(6, 19, 12, 16, 3, N.D)
    g.thickLine(12, 16, 9, 11, 3, N.D)
    g.thickLine(9, 11, 12, 6, 3, N.D)
    g.thickLine(6, 18, 12, 15, 2, N.B)
    g.thickLine(12, 15, 9, 11, 2, N.B)
    g.thickLine(9, 11, 12, 6, 2, N.B)
    g.line(11, 15, 10, 12, '#fff1c4')
    g.ellipse(13, 5, 2.6, 2, N.B)
    g.rect(14, 5, 3, 2, N.B)
    g.px(13, 4, '#e8514a')
    g.px(16, 6, '#fff1c4')
    g.line(11, 3, 9, 0, GO.B)
    g.line(12, 3, 12, -1, GO.B)
    g.line(13, 3, 15, 0, GO.B)
    g.px(9, 0, GO.L)
    g.px(15, 0, GO.L)
    for (const [x, y] of [[8, 13], [11, 9], [9, 17]]) g.px(x, y, GO.B)
  },
  ya_mo(g) {
    gnd(g, 'stone')
    for (let x = 2; x < 21; x += 2) g.px(x, 18, x % 4 ? '#f58f35' : '#ffd54f')
    g.rect(7, 11, 8, 7, WH.B)
    g.rect(12, 11, 3, 7, WH.D)
    g.rect(6, 11, 10, 1, WH.L)
    g.rect(6, 17, 10, 1, WH.M)
    g.rect(9, 13, 3, 3, GO.M)
    const Z = { L: '#b98a5a', B: '#8a5a3a', D: '#6e4a35' }
    g.poly([[8, 11], [9, 5], [13, 5], [14, 11]], Z.B)
    g.poly([[11, 5], [13, 5], [14, 11], [12, 11]], Z.D)
    g.ellipse(11, 3.5, 1.8, 1.9, Z.B)
    g.px(10, 3, Z.L)
    g.rect(10, 0, 2, 2, Z.D)
    g.vline(15, 3, 11, '#e4ddd6')
    g.hline(14, 16, 6, Z.D)
    g.px(9, 7, Z.L)
    g.line(9, 6, 13, 8, '#ffd54f')
  },
  nst_mahathat(g) {
    gnd(g, 'marble')
    bellChedi(g, 3, 19, 2, 2, 11, WH)
    bellChedi(g, 19, 19, 2, 2, 11, WH)
    bellChedi(g, 11, 19, 6, 6, -2, WH, GO)
    sparkle(g, 15, 2)
  },
  ai_khai(g) {
    gnd(g, 'stone')
    const rooster = (x: number, f: number) => {
      g.ellipse(x, 16, 2.8, 2, '#e8514a')
      g.ellipse(x - f, 15.5, 1.6, 1.2, '#ff8a7a')
      g.ellipse(x + f * 2, 13, 1.3, 1.4, '#f58f35')
      g.px(x + f * 2, 11, '#e8514a')
      g.px(x + f * 3, 13, '#ffd54f')
      g.line(x - f * 2, 15, x - f * 4, 12, '#3f9a6b')
      g.line(x - f * 3, 16, x - f * 5, 13, '#2f6f4b')
      g.px(x, 18, '#d99a2b')
    }
    rooster(4, 1)
    rooster(18, -1)
    g.poly([[8, 18], [9, 11], [13, 11], [14, 18]], '#fffaf0')
    g.rect(8, 14, 6, 4, '#e8514a')
    g.hline(8, 13, 14, '#ffd54f')
    g.ellipse(11, 8, 3, 3, '#e8b186')
    g.ellipse(11.5, 8.5, 2, 2, '#f0bd90')
    g.rect(8, 5, 6, 2, '#3b2f40')
    g.circle(11, 3.5, 1.4, '#3b2f40')
    g.px(10, 8, '#3a2838')
    g.px(12, 8, '#3a2838')
    g.px(9, 9, '#ff9aa6')
    g.px(13, 9, '#ff9aa6')
    g.hline(10, 12, 10, '#b8343f')
    sparkle(g, 16, 5, '#fff3a6')
  },
  wat_chalong(g) {
    gnd(g, 'grass')
    g.rect(1, 14, 2, 4, '#e8514a')
    g.px(1, 13, '#ffd54f')
    g.px(0, 12, '#fff3a6')
    g.px(3, 11, '#ff8a7a')
    const storey = (y: number, w: number, h: number) => {
      g.rect(11 - w, y, w * 2 + 1, h, WH.B)
      g.rect(11 + w - 1, y, 2, h, WH.D)
      g.hline(11 - w - 1, 11 + w + 1, y, RF.B)
      g.hline(11 - w, 11 + w, y - 1, RF.L)
      for (let x = 11 - w + 1; x < 11 + w; x += 2) g.px(x, y + Math.floor(h / 2), '#5a8de0')
    }
    storey(14, 7, 5)
    storey(10, 5, 4)
    storey(7, 3, 3)
    g.rect(9, 3, 5, 3, GO.M)
    g.hline(9, 13, 3, GO.B)
    g.vline(11, -1, 2, GO.B)
    g.px(11, -2, GO.L)
    g.rect(10, 16, 3, 3, '#b8343f')
  },
  phuket_big_buddha(g) {
    g.rect(0, 16, 22, 4, WA.B)
    g.hline(0, 21, 16, WA.L)
    g.ellipse(11, 19.5, 11, 3.5, GR.D)
    g.ellipse(10, 19, 10, 2.6, GR.B)
    g.rect(4, 15, 14, 2, WH.M)
    g.hline(4, 17, 15, WH.L)
    seatedBuddha(g, 11, 15, 16, { L: '#ffffff', B: '#f2eeea', M: '#cfc6ca', D: '#9c93a2', DD: '#7a7084' })
    sparkle(g, 18, 4)
  },
  lampang_luang(g) {
    gnd(g, 'sand')
    g.rect(8, 5, 7, 3, GO.M)
    g.rect(9, 2, 5, 3, GO.B)
    g.vline(13, 2, 4, GO.D)
    g.vline(11, -2, 1, GO.B)
    g.hline(10, 12, -1, GO.L)
    const T = { L: '#c28e5c', B: '#9a6a45', D: '#6e4a35', E: '#4a3128' }
    g.poly([[0, 14], [6, 8], [16, 8], [22, 14]], T.B)
    g.poly([[11, 8], [16, 8], [22, 14], [14, 14]], T.D)
    g.line(0, 14, 6, 8, T.E)
    g.line(22, 14, 16, 8, T.E)
    g.hline(0, 21, 14, T.E)
    g.hline(3, 18, 11, T.L)
    g.poly([[8, 11], [11, 6], [14, 11]], GO.B)
    g.poly([[11, 6], [14, 11], [12, 11]], GO.D)
    g.px(11, 5, GO.L)
    g.px(0, 13, GO.B)
    g.px(22, 13, GO.B)
    for (const x of [2, 7, 15, 20]) g.vline(x, 15, 18, '#b8343f')
    g.hline(2, 20, 15, '#7e2436')
  },
  pathom_chedi(g) {
    gnd(g, 'stone', 10.5)
    const OG: Ramp = { L: '#ffe4a0', B: '#ffc24a', M: '#f5a13a', D: '#d0661f', DD: '#9a4323' }
    bellChedi(g, 11, 20, 9, 8, -3, OG, GO)
    for (let x = 4; x < 19; x += 2) g.px(x, 12 + ((x >> 1) % 2), OG.L)
    sparkle(g, 6, 8)
  },
  wat_phutthabat(g) {
    gnd(g, 'stone')
    g.rect(8, 16, 6, 3, WH.M)
    g.hline(8, 13, 17, WH.D)
    g.line(7, 19, 7, 15, '#3f9a6b')
    g.line(15, 19, 15, 15, '#3f9a6b')
    g.px(7, 14, GO.B)
    g.px(15, 14, GO.B)
    g.rect(5, 10, 12, 6, WH.B)
    g.rect(14, 10, 3, 6, WH.D)
    g.rect(9, 11, 4, 5, GO.M)
    g.vline(11, 11, 15, GO.D)
    for (let i = 0; i < 6; i++) {
      const w = 7 - i
      const y = Math.round(8 - i * 1.6)
      g.rect(11 - w, y, w * 2 + 1, 2, i % 2 ? '#3f9a6b' : '#5ab87a')
      g.hline(11 - w, 11 + w, y, GO.B)
    }
    g.vline(11, -2, 0, GO.B)
    g.px(11, -3, GO.L)
    for (const x of [2, 20]) {
      g.vline(x, 12, 16, '#8a5a3a')
      g.rect(x - 1, 13, 3, 2, GO.D)
      g.px(x, 12, GO.B)
    }
  },
  wat_yai_phitsanulok(g) {
    gnd(g, 'marble')
    g.ellipse(11, 10, 9, 9, GO.D)
    g.ellipse(11, 10, 8, 8, GO.B)
    g.rect(2, 13, 18, 5, WH.M)
    g.ellipse(11, 11, 6.5, 7, '#7e2436')
    g.rect(3, 11, 2, 7, GO.B)
    g.rect(17, 11, 2, 7, GO.D)
    g.line(3, 18, 1, 15, GO.B)
    g.line(18, 18, 21, 15, GO.D)
    g.px(1, 14, GO.L)
    g.px(21, 14, GO.L)
    for (let a = 0; a < 7; a++) {
      const t = Math.PI + (a / 6) * Math.PI
      g.px(11 + Math.cos(t) * 9.5, 10 + Math.sin(t) * 9.5, GO.L)
    }
    g.rect(5, 17, 12, 2, GO.D)
    seatedBuddha(g, 11, 17, 14, GO)
  },
  wat_phumin(g) {
    gnd(g, 'grass')
    const N = { B: '#4fb06a', D: '#35864f' }
    g.rect(1, 16, 20, 2, N.D)
    g.hline(1, 20, 16, N.B)
    for (let x = 2; x < 20; x += 3) g.px(x, 17, '#fff1c4')
    g.ellipse(1, 14.5, 1.6, 1.8, N.B)
    g.px(0, 13, GO.B)
    g.ellipse(21, 14.5, 1.6, 1.8, N.D)
    g.px(22, 13, GO.B)
    g.rect(4, 11, 14, 5, WH.B)
    g.rect(15, 11, 3, 5, WH.D)
    g.rect(9, 12, 4, 4, '#b8343f')
    g.rect(10, 13, 2, 3, GO.B)
    roofTier(g, 4, 7, 7, 4, RF, false)
    roofTier(g, 18, 7, 7, 4, RF, false)
    roofTier(g, 11, 4, 14, 7, RF)
    g.poly([[8, 11], [11, 7], [14, 11]], GO.B)
    g.px(11, 6, GO.L)
    g.vline(11, 0, 3, GO.M)
  },
  wat_chulamanee(g) {
    gnd(g, 'water')
    const Y = { L: '#6a78c8', B: '#3d4f9a', D: '#2a3670' }
    g.rect(6, 12, 3, 7, Y.D)
    g.rect(13, 12, 3, 7, Y.D)
    g.rect(5, 18, 4, 1, GO.D)
    g.rect(13, 18, 4, 1, GO.D)
    g.poly([[5, 13], [6, 6], [16, 6], [17, 13]], GO.M)
    g.poly([[6, 7], [16, 7], [15, 12], [7, 12]], '#e8514a')
    g.hline(6, 16, 9, GO.B)
    g.hline(6, 16, 12, GO.D)
    g.rect(3, 7, 3, 5, Y.B)
    g.rect(16, 7, 3, 5, Y.D)
    g.ellipse(11, 4, 3.2, 2.8, Y.B)
    g.px(10, 3, '#ffffff')
    g.px(12, 3, '#ffffff')
    g.hline(10, 12, 5, '#b8343f')
    g.px(9, 5, '#ffffff')
    g.px(13, 5, '#ffffff')
    g.rect(8, 0, 7, 2, GO.B)
    g.poly([[9, 0], [11, -3], [13, 0]], GO.M)
    g.px(11, -3, GO.L)
    g.vline(19, -1, 13, '#8a5a3a')
    g.rect(18, -1, 3, 3, GO.D)
    g.px(18, -1, GO.B)
  },
  wat_huay_mongkol(g) {
    gnd(g, 'grass', 10.5)
    const S = { L: '#ffc070', B: '#ee9136', M: '#d9782a', D: '#b85e1f' }
    g.ellipse(11, 16, 8, 2.8, S.M)
    g.ellipse(10.5, 15.4, 7, 2, S.B)
    g.poly([[5, 16], [6, 7], [16, 7], [17, 16]], S.B)
    g.poly([[11, 7], [16, 7], [17, 16], [13, 16]], S.M)
    g.line(6, 8, 14, 15, S.D)
    g.rect(8, 13, 6, 2, '#6e4a35')
    g.ellipse(11, 4.5, 3, 3.2, '#8a5a3a')
    g.ellipse(10, 4, 1.4, 1.6, '#a87050')
    g.px(10, 5, '#3a2838')
    g.px(12, 5, '#3a2838')
    g.rect(9, 8, 5, 1, '#6e4a35')
    g.ellipse(19, 17, 2.8, 2, '#8c8187')
    g.ellipse(21, 16, 1.4, 1.6, '#8c8187')
    g.px(22, 18, '#8c8187')
    g.vline(18, 18, 19, '#625867')
    g.vline(20, 18, 19, '#625867')
    g.px(20, 15, '#bdb2ae')
    sparkle(g, 4, 3, '#fff3a6')
  },
  // --- The original hometown areas ---
  wat(g) {
    gnd(g, 'grass')
    iconTree(g, 3, 17, 3)
    g.rect(6, 11, 12, 7, WH.B)
    g.rect(15, 11, 3, 7, WH.D)
    g.rect(10, 13, 3, 5, '#9a6a45')
    g.px(12, 15, GO.B)
    roofTier(g, 12, 6, 16, 5, RF)
    roofTier(g, 12, 2, 9, 4, RF)
    g.rect(17, 16, 4, 2, '#e0bb8a')
    g.rect(19, 14, 2, 2, '#e0bb8a')
    g.px(21, 14, '#c28e5c')
    g.px(19, 13, '#c28e5c')
    g.px(16, 15, '#e0bb8a')
    g.px(20, 14, '#3a2838')
  },
  shrine(g) {
    gnd(g, 'stone')
    const mini = (x: number, y: number, roof: Color, roofD: Color) => {
      g.rect(x - 3, y - 4, 7, 4, WH.B)
      g.rect(x + 2, y - 4, 2, 4, WH.D)
      g.px(x, y - 2, GO.B)
      g.poly([[x - 4, y - 4], [x, y - 8], [x + 1, y - 8], [x + 5, y - 4]], roof)
      g.poly([[x + 1, y - 8], [x + 5, y - 4], [x + 2, y - 4]], roofD)
      g.px(x, y - 9, GO.B)
    }
    mini(6, 11, '#e8514a', '#b8343f')
    mini(16, 11, '#ffd54f', '#e9a53a')
    mini(6, 19, '#5a8de0', '#3d63b5')
    mini(16, 19, '#f58f35', '#d0661f')
    sparkle(g, 11, 2, '#fff3a6')
  },
  river(g) {
    g.rect(0, 15, 22, 6, WA.B)
    g.hline(0, 21, 15, WA.L)
    g.hline(3, 7, 18, WA.L)
    for (const x of [5, 10, 15]) g.vline(x, 13, 17, '#6e4a35')
    g.rect(3, 12, 15, 2, '#9a6a45')
    g.rect(5, 7, 11, 5, WH.B)
    g.rect(13, 7, 3, 5, WH.D)
    g.rect(9, 9, 3, 3, '#9a6a45')
    roofTier(g, 10, 2, 15, 5, RF)
    g.poly([[13, 17], [22, 17], [21, 19], [14, 19]], '#8a5a3a')
    g.hline(13, 22, 17, '#b07a52')
    g.ellipse(18, 15.5, 1.3, 1.5, ROBE)
    g.px(18, 14, '#f0bd90')
  },
  mountain(g) {
    g.poly([[0, 21], [9, 5], [13, 5], [22, 21]], '#6448ad')
    g.poly([[1, 21], [9, 6], [11, 6], [8, 21]], '#9270dc')
    g.poly([[11, 6], [13, 6], [21, 21], [14, 21]], '#4a3a8a')
    g.ellipse(4, 16, 5, 2, '#ffffff')
    g.ellipse(17, 17, 6, 2, '#f4eeff')
    g.ellipse(11, 19.5, 8, 1.6, '#e2d2ff')
    bellChedi(g, 11, 7, 3, 3, -2, GO)
    sparkle(g, 17, 3)
  },
  // --- Hub markets and the temple fair (thaimap-hubs.ts) ---
  ...HUB_ICON_DRAW,
  // --- Beaches (thaimap-beaches.ts) ---
  ...BEACH_ICON_DRAW,
}

export const ICON_W = 24
export const ICON_H = 26
/** Icon pixel row of the ground point (the pin's base). */
export const ICON_BASE = 22

const iconCache = new Map<string, Sprite>()

/** Landmark icon (24×26 with outline, base at row 22) for a place id. */
export function placeIconArt(id: string, locked = false): Sprite {
  const key = `${id}:${locked ? 'l' : 'u'}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const draw = ICON_DRAW[id] ?? ICON_DRAW.wat
  const tall = new Surface(ICON_W, ICON_H)
  tall.setCamera(-1, -3)
  draw(tall)
  const base = outlineCanvas(tall.canvas, MC.ink, false)
  const out = createCanvas(ICON_W, ICON_H)
  const octx = out.getContext('2d')!
  octx.drawImage(base.canvas, -1, -1)
  if (locked) {
    const d = octx.getImageData(0, 0, ICON_W, ICON_H)
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue
      const l = d.data[i] * 0.3 + d.data[i + 1] * 0.55 + d.data[i + 2] * 0.15
      const v = 64 + l * 0.6
      d.data[i] = v * 0.97
      d.data[i + 1] = v * 0.93
      d.data[i + 2] = v * 1.03
    }
    octx.putImageData(d, 0, 0)
  }
  const s = { canvas: out, w: ICON_W, h: ICON_H }
  iconCache.set(key, s)
  return s
}

export const ICON_IDS = Object.keys(ICON_DRAW)
