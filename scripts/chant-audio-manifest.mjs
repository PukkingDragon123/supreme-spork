// Write public/audio/chant/manifest.json from the audio files in that folder.
//   node scripts/chant-audio-manifest.mjs [--no-probe]
// Each <chantId>.(mp3|m4a|ogg|wav) becomes an entry. A matching
// <chantId>.json timing file is linked when present.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio', 'chant')
const exts = ['mp3', 'm4a', 'ogg', 'wav']
const path = join(dir, 'manifest.json')
const prev = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
const chants = {}
for (const f of readdirSync(dir).sort()) {
  const m = f.match(/^([a-z0-9_]+)\.(mp3|m4a|ogg|wav)$/i)
  if (!m || !exts.includes(m[2].toLowerCase())) continue
  const id = m[1]
  if (chants[id]) {
    console.warn(`! ${id}: more than one file, keeping ${chants[id].file}`)
    continue
  }
  const entry = { file: f }
  if (existsSync(join(dir, `${id}.json`))) {
    entry.timing = `${id}.json`
    try {
      const t = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'))
      if (!Array.isArray(t.lines ?? t)) console.warn(`! ${id}.json has no "lines" array`)
    } catch (e) {
      console.warn(`! ${id}.json is not valid JSON: ${e.message}`)
    }
  }
  chants[id] = entry
}
const out = { _help: prev._help, probe: process.argv.includes('--no-probe') ? false : (prev.probe ?? true), chants }
writeFileSync(path, JSON.stringify(out, null, 2) + '\n')
console.log(`manifest: ${Object.keys(chants).length} chant recording(s)`, Object.keys(chants).join(', '))
