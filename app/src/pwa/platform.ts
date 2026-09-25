export type Platform = 'ios' | 'android' | 'inapp' | 'desktop'

/** Which install instructions to show. In-app browsers (Instagram, Facebook…) can't install at all. */
export function detectPlatform(ua: string, touchPoints: number): Platform {
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly/i.test(ua)) return 'inapp'
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}
