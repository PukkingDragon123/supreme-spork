// Builds the single-file web preview used for sharing (e.g. as a claude.ai
// Artifact): inlines everything, then strips the document wrapper so the
// host can supply its own <html>/<head>/<body> skeleton.
//   node scripts/build-preview.mjs [outFile]
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const out = process.argv[2] ?? 'dist-single/boondee-preview.html'
execSync('npx vite build --mode single', { stdio: 'inherit' })
const html = readFileSync('dist-single/index.html', 'utf8')

const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>บุญดี Boondee</title>'
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/ crossorigin/g, ''))
if (!scripts.length) throw new Error('No inline module script found')

const page = [title, ...styles, '<div id="app"></div>', ...scripts].join('\n')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, page)
console.log(`wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`)
