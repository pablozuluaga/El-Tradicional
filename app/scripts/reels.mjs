// Renders the install videos (public/videos/*.mp4 + a .jpg cover) from reel.html, frame by frame.
//
//   npx vite --port 5179            (in another terminal)
//   FFMPEG=/path/to/ffmpeg node scripts/reels.mjs [name …]
//
// FFMPEG must have libx264. PLAYWRIGHT may point to playwright's index.mjs if it isn't installed here.
// Without names it renders every video in src/reel/flows.tsx. Set MASTER=dir to also keep 1080×1920 copies.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const OUT = new URL('../public/videos/', import.meta.url).pathname
const ALL = ['iphone-ios27', 'iphone-ios26', 'iphone-ios18', 'iphone-chrome', 'iphone-instagram',
  'samsung-boton', 'samsung-menu', 'samsung-navegador', 'xiaomi-boton', 'xiaomi-menu', 'xiaomi-navegador',
  'motorola-boton', 'motorola-menu', 'huawei-boton', 'huawei-menu', 'huawei-navegador',
  'android-boton', 'android-menu', 'android-navegador', 'android-instagram']
const FPS = 30
const run = args => new Promise((ok, ko) => { const p = spawn(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: ['pipe', 'inherit', 'inherit'] }); p.on('close', c => (c ? ko(new Error('ffmpeg ' + c)) : ok())); return p })

mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ALL) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('http://localhost:5179/reel.html?video=' + name, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  const dur = await p.evaluate(() => window.__duration)
  const master = (process.env.MASTER ?? OUT) + '/' + name + (process.env.MASTER ? '.mp4' : '.master.mp4')
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', master], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (let i = 0; i < Math.ceil(dur / 1000 * FPS); i++) {
    await p.evaluate(ms => window.__frame(ms), i * 1000 / FPS)
    if (!ff.stdin.write(await p.screenshot({ type: 'jpeg', quality: 92 }))) await new Promise(r => ff.stdin.once('drain', r))
  }
  ff.stdin.end()
  await new Promise(r => ff.on('close', r))
  await p.close()
  // the page plays a lighter 720p copy; the cover is the first step
  await run(['-i', master, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', OUT + name + '.mp4'])
  await run(['-ss', '3.4', '-i', master, '-frames:v', '1', '-vf', 'scale=540:960:flags=lanczos', '-q:v', '4', OUT + name + '.jpg'])
  if (!process.env.MASTER) await import('node:fs').then(fs => fs.rmSync(master))
  console.log(name, (dur / 1000).toFixed(1) + ' s')
}
await b.close()
