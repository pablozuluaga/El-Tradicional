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

/** Android brand, only for the name in the install video (and the shortcut permission on Xiaomi and Huawei). */
export type Brand = 'samsung' | 'xiaomi' | 'motorola' | 'huawei' | 'android'

/**
 * From the user agent and, on Chrome (which hides the model there), the model it reports through
 * `navigator.userAgentData`: "SM-A546E" is a Samsung, "23090RA98G" or "Redmi Note 13" a Xiaomi…
 */
export function detectBrand(ua: string, model = ''): Brand {
  const s = ua + ' ' + model
  if (/SamsungBrowser|Samsung|\bSM-[A-Z]\d/i.test(s)) return 'samsung'
  if (/Xiaomi|MiuiBrowser|Redmi|POCO|\bMi \d|\bM2\d{3}[A-Z]|\b2[0-4]\d{3}[A-Z0-9]{3,}\b/i.test(s)) return 'xiaomi'
  if (/motorola|\bmoto\b|\bmoto [a-z]|\bXT\d{4}/i.test(s)) return 'motorola'
  if (/HUAWEI|HONOR|HuaweiBrowser|\b[A-Z]{3}-[A-Z]{1,2}\d{2}[A-Z]?\b/.test(s)) return 'huawei'
  return 'android'
}

/** Every install video in public/videos. */
export const INSTALL_VIDEOS = ['iphone-ios27', 'iphone-ios26', 'iphone-ios18', 'iphone-chrome', 'iphone-instagram',
  'samsung-boton', 'samsung-menu', 'samsung-navegador', 'xiaomi-boton', 'xiaomi-menu', 'xiaomi-navegador',
  'motorola-boton', 'motorola-menu', 'huawei-boton', 'huawei-menu', 'huawei-navegador',
  'android-boton', 'android-menu', 'android-navegador', 'android-instagram'] as const

/** How the install page looks on this phone (see Install.tsx). */
export type InstallMode = 'button' | 'chrome' | 'androidSteps' | 'iphone'

/** The video for what this phone shows: public/videos/<name>.mp4 (and .jpg, its first frame). */
export function installVideo(mode: InstallMode, guide: GuideId, ua: string, brand: Brand): string {
  if (mode === 'iphone') {
    return guide === 'ios27' ? 'iphone-ios27' : guide === 'ios26' ? 'iphone-ios26' : guide === 'iosChrome' ? 'iphone-chrome'
      : guide === 'inapp' ? 'iphone-instagram' : 'iphone-ios18'
  }
  if (mode === 'chrome') {
    if (detectPlatform(ua, 0) === 'inapp') return 'android-instagram'
    if (/SamsungBrowser/i.test(ua)) return 'samsung-navegador'
    if (/MiuiBrowser|XiaoMi/.test(ua)) return 'xiaomi-navegador'
    if (/HuaweiBrowser/i.test(ua)) return 'huawei-navegador'
    return 'android-navegador'
  }
  return `${brand}-${mode === 'button' ? 'boton' : 'menu'}`
}

/** Opens a page in Chrome from any Android browser (or the Play Store page of Chrome if missing). */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href)
  const fallback = encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}

/**
 * Opens the installed app on Android: an Android link to the site's address, which the installed
 * app claims, so Android opens it instead of the browser tab. If no app answers yet, the browser
 * goes to `fallback` (the install page, which offers the button again once the app is ready).
 */
export function openAppIntentUrl(href: string, fallback?: string): string {
  const u = new URL(href)
  const back = fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : ''
  return `intent://${u.host}${u.pathname}#Intent;scheme=${u.protocol.replace(':', '')};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;${back}end`
}
