export type Platform = 'ios' | 'android' | 'inapp' | 'desktop'

/** Which install instructions to show. In-app browsers (Instagram, Facebook…) can't install at all. */
export function detectPlatform(ua: string, touchPoints: number): Platform {
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly/i.test(ua)) return 'inapp'
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** The install guide that matches this phone and browser. */
export type GuideId = 'ios27' | 'ios26' | 'ios18' | 'iosChrome' | 'androidChrome' | 'samsung' | 'inapp' | 'desktop'

/**
 * Picks the guide from the user agent. Safari's own version tells the layout apart (iOS 26+
 * reports an old "iPhone OS 18_x" but the real Safari version in `Version/NN`).
 */
export function detectGuide(ua: string, touchPoints: number): GuideId {
  const p = detectPlatform(ua, touchPoints)
  if (p === 'inapp' || p === 'desktop') return p
  if (p === 'ios') {
    if (/CriOS|EdgiOS|FxiOS/i.test(ua)) return 'iosChrome'
    const v = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0)
    return v >= 27 ? 'ios27' : v === 26 ? 'ios26' : 'ios18'
  }
  return /SamsungBrowser/i.test(ua) ? 'samsung' : 'androidChrome'
}

/**
 * Android browsers other than Chrome (Samsung Internet, Xiaomi, Huawei, Opera, Firefox, app
 * webviews…): their install menus change between versions and are missing on older phones, so
 * the page sends the customer to Chrome, where one button installs the app.
 */
export function androidNeedsChrome(ua: string): boolean {
  if (!/Android/i.test(ua)) return false
  if (/SamsungBrowser|MiuiBrowser|XiaoMi|HuaweiBrowser|HeyTapBrowser|OPR\/|Opera|Firefox|EdgA|UCBrowser|YaBrowser|DuckDuckGo|; wv\)/i.test(ua)) return true
  return !/Chrome\//.test(ua)
}

/** Opens a page in Chrome from any Android browser (or the Play Store page of Chrome if missing). */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href)
  const fallback = encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}
