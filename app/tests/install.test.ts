import { test } from 'node:test'
import assert from 'node:assert/strict'
import { androidNeedsChrome, chromeIntentUrl, detectBrand, detectGuide, detectPlatform, INSTALL_VIDEOS, installVideo, openAppIntentUrl } from '../src/pwa/platform.ts'

test('detectPlatform picks the right install instructions', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const ipadOs = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  const instagram = android + ' Instagram 312.0.0.0'
  const facebookIos = iphone + ' [FBAN/FBIOS;FBAV/450.0]'
  assert.equal(detectPlatform(android, 5), 'android')
  assert.equal(detectPlatform(iphone, 5), 'ios')
  assert.equal(detectPlatform(ipadOs, 5), 'ios')
  assert.equal(detectPlatform(ipadOs, 0), 'desktop')
  assert.equal(detectPlatform(instagram, 5), 'inapp')
  assert.equal(detectPlatform(facebookIos, 5), 'inapp')
})

test('detectGuide matches each phone and browser to its guide', () => {
  const safari = (v: string) => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`
  assert.equal(detectGuide(safari('27.0'), 5), 'ios27')
  assert.equal(detectGuide(safari('26.1'), 5), 'ios26')
  assert.equal(detectGuide(safari('18.5'), 5), 'ios18')
  assert.equal(detectGuide('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1', 5), 'iosChrome')
  assert.equal(detectGuide('Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36', 5), 'samsung')
  assert.equal(detectGuide('Mozilla/5.0 (Linux; Android 15; 23124RA7EO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36', 5), 'androidChrome')
  assert.equal(detectGuide(safari('26.0') + ' Instagram 400.0', 5), 'inapp')
  assert.equal(detectGuide('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0', 0), 'desktop')
})

test('Android browsers other than Chrome go to Chrome to install', () => {
  const chrome = 'Mozilla/5.0 (Linux; Android 10; SM-A105M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
  assert.equal(androidNeedsChrome(chrome), false)
  assert.equal(androidNeedsChrome('Mozilla/5.0 (Linux; Android 9; SM-J600G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.1 Chrome/79.0 Mobile Safari/537.36'), true)
  assert.equal(androidNeedsChrome('Mozilla/5.0 (Linux; Android 11; M2006C3MG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5'), true)
  assert.equal(androidNeedsChrome('Mozilla/5.0 (Linux; Android 12; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0 Mobile Safari/537.36; Android 12; SM-A125F; wv)'), true)
  assert.equal(androidNeedsChrome('Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0'), true)
  assert.equal(androidNeedsChrome('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'), false)
  assert.equal(chromeIntentUrl('https://el-tradicional.vercel.app/instalar'),
    'intent://el-tradicional.vercel.app/instalar#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.android.chrome;end')
})

test('the open-the-app link targets the installed app, not a browser tab', () => {
  assert.equal(openAppIntentUrl('https://el-tradicional.vercel.app/'),
    'intent://el-tradicional.vercel.app/#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end')
  assert.match(openAppIntentUrl('https://el-tradicional.vercel.app/', 'https://el-tradicional.vercel.app/instalar'),
    /;S\.browser_fallback_url=https%3A%2F%2Fel-tradicional\.vercel\.app%2Finstalar;end$/)
})

test('each phone gets the video of what its install page shows', () => {
  const chrome = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'
  // the brand: from the user agent, or from the model Chrome reports
  assert.equal(detectBrand(chrome, 'SM-A546E'), 'samsung')
  assert.equal(detectBrand(chrome, '23090RA98G'), 'xiaomi')
  assert.equal(detectBrand(chrome, 'Redmi Note 13'), 'xiaomi')
  assert.equal(detectBrand(chrome, 'M2101K6G'), 'xiaomi')
  assert.equal(detectBrand(chrome, 'moto g84 5G'), 'motorola')
  assert.equal(detectBrand(chrome, 'motorola edge 50'), 'motorola')
  assert.equal(detectBrand(chrome, 'ELE-L29'), 'huawei')
  assert.equal(detectBrand(chrome, 'CPH2591'), 'android')
  assert.equal(detectBrand(chrome), 'android')
  // the browser decides the steps
  assert.equal(installVideo('button', 'androidChrome', chrome, 'samsung'), 'samsung-boton')
  assert.equal(installVideo('androidSteps', 'androidChrome', chrome, 'xiaomi'), 'xiaomi-menu')
  assert.equal(installVideo('chrome', 'samsung', 'Mozilla/5.0 (Linux; Android 14; SM-S921B) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36', 'samsung'), 'samsung-navegador')
  assert.equal(installVideo('chrome', 'androidChrome', 'Mozilla/5.0 (Linux; U; Android 13; es-co; 2201117TG) XiaoMi/MiuiBrowser/14.2', 'xiaomi'), 'xiaomi-navegador')
  assert.equal(installVideo('chrome', 'inapp', chrome + ' Instagram 400.0', 'android'), 'android-instagram')
  assert.equal(installVideo('chrome', 'androidChrome', 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', 'android'), 'android-navegador')
  assert.equal(installVideo('iphone', 'ios27', '', 'android'), 'iphone-ios27')
  assert.equal(installVideo('iphone', 'ios26', '', 'android'), 'iphone-ios26')
  assert.equal(installVideo('iphone', 'ios18', '', 'android'), 'iphone-ios18')
  assert.equal(installVideo('iphone', 'iosChrome', '', 'android'), 'iphone-chrome')
  assert.equal(installVideo('iphone', 'inapp', '', 'android'), 'iphone-instagram')
})

test('every install video exists, with its cover', async () => {
  const { existsSync } = await import('node:fs')
  for (const v of INSTALL_VIDEOS) {
    assert.ok(existsSync(new URL(`../public/videos/${v}.mp4`, import.meta.url)), v + '.mp4')
    assert.ok(existsSync(new URL(`../public/videos/${v}.jpg`, import.meta.url)), v + '.jpg')
  }
})
