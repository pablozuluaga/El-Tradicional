import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectPlatform } from '../src/pwa/install.ts'

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
