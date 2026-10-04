import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectGuide, detectPlatform } from '../src/pwa/platform.ts'

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
