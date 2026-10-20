import { Phone, Site, StatusBar, Tap, Dots } from '../customer/install/kit.tsx'
import { ChromeTopBar, SamsungBars } from '../customer/install/scenes.tsx'

// Screens only the videos need: the install page's own buttons, as they look in each browser.

const URL = 'el-tradicional.vercel.app'
// Site({ top: 98, cta }) draws its button at y = 408…454
const ctaTap = (above = false) => above
  ? <Tap ring={[24, 402, 252, 58, 18]} from={[150, 318]} to={[150, 398]} labelAt={[150, 304]} />
  : <Tap ring={[24, 402, 252, 58, 18]} from={[150, 540]} to={[150, 464]} labelAt={[150, 556]} />

/** Chrome on Android with the page's "⬇ Instalar la app" button. */
export const ChromeInstallButton = () => (
  <Phone os="android" label="La página en Chrome con el botón Instalar la app">
    <ChromeTopBar /><Site top={98} cta />{ctaTap()}
  </Phone>
)

function GenericBar({ title }: { title?: string }) {
  return (
    <g>
      <rect x="12" y="12" width="276" height="86" fill="#fff" />
      <StatusBar os="android" />
      {title ? (
        <>
          <path d="M26 64 l12 12 M38 64 l-12 12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
          <text x="150" y="68" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#111">{title}</text>
          <text x="150" y="84" fontSize="10" textAnchor="middle" fill="#8a8a8e">{URL}</text>
          <Dots x={266} y={72} />
        </>
      ) : (
        <>
          <rect x="20" y="50" width="226" height="36" rx="18" fill="#f1f1f1" />
          <text x="133" y="72" fontSize="11.5" textAnchor="middle" fill="#111">{URL}</text>
          <Dots x={266} y={68} vertical />
        </>
      )}
    </g>
  )
}

/** The page in a browser that can't install (Samsung Internet, Xiaomi's, Huawei's, Instagram…): "Abrir en Chrome". */
export const OpenInChrome = ({ bar }: { bar: 'samsung' | 'generic' | 'inapp' }) => (
  <Phone os="android" label="La página con el botón Abrir en Chrome">
    <Site top={98} cta ctaLabel="Abrir en Chrome" />
    {bar === 'samsung' ? <SamsungBars /> : <GenericBar title={bar === 'inapp' ? 'El Tradicional' : undefined} />}
    {ctaTap(bar === 'samsung')}
  </Phone>
)
