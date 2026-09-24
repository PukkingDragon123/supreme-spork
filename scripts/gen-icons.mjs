// Renders the pixel-art app icons into public/icons (needs `npm run dev`).
//   node scripts/gen-icons.mjs [devServerUrl]
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
const base = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`${base}gallery.html?s=appicon`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__icons)
const icons = await page.evaluate(() => window.__icons)
mkdirSync('public/icons', { recursive: true })
for (const [name, url] of Object.entries(icons)) {
  writeFileSync(`public/icons/${name}.png`, Buffer.from(url.split(',')[1], 'base64'))
  console.log('wrote', name)
}
await browser.close()
