import { useId } from 'react'
import { AppIcon, BLUE, Check, Dim, Dots, Lines, MenuCard, Phone, PlusSquare, ShareGlyph, Site, StatusBar, Tap } from './kit.tsx'

// Every screen the install guide shows, drawn after the real ones (Spanish system language).
// Coordinates are on the 300×600 phone canvas from kit.tsx.

const URL = 'el-tradicional.vercel.app'
const ICON = '/apple-touch-icon.png'

// ---- iPhone (Safari) ------------------------------------------------------------

/** Safari's compact bar (iOS 26+): round button, address capsule, round button. */
function CompactBar({ left, right }: { left: 'lines' | 'back'; right: 'dots' | 'tabs' }) {
  return (
    <g>
      <rect x="12" y="512" width="276" height="76" fill="rgba(255,255,255,.94)" />
      <circle cx="42" cy="546" r="20" fill="#f1f1f4" stroke="#e1e1e6" />
      {left === 'lines' ? <Lines x={42} y={546} /> : <path d="M45 538 l-8 8 8 8" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      <rect x="70" y="526" width="160" height="40" rx="20" fill="#f1f1f4" stroke="#e1e1e6" />
      <text x="150" y="550" fontSize="11.5" textAnchor="middle" fill="#111">{URL}</text>
      <circle cx="258" cy="546" r="20" fill="#f1f1f4" stroke="#e1e1e6" />
      {right === 'dots'
        ? <Dots x={258} y={546} />
        : <g fill="none" stroke="#111" strokeWidth="1.8"><rect x="249" y="540" width="13" height="13" rx="3" /><path d="M253 537 h9 a3 3 0 0 1 3 3 v9" /></g>}
      <rect x="105" y="579" width="90" height="4" rx="2" fill="#111" />
    </g>
  )
}

/** Safari before iOS 26 (and "Bottom" layout): address bar plus a toolbar with Share in the middle. */
function ClassicBar() {
  return (
    <g>
      <rect x="12" y="488" width="276" height="100" fill="#f7f7f9" />
      <rect x="24" y="496" width="252" height="36" rx="12" fill="#e9e9ee" />
      <text x="40" y="519" fontSize="12" fill="#111" fontWeight="600">AA</text>
      <text x="150" y="519" fontSize="11.5" textAnchor="middle" fill="#111">{URL}</text>
      <g fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M42 548 l-7 7 7 7" /><path d="M93 548 l7 7 -7 7" opacity=".4" />
        <path d="M198 549 c-6 -3 -13 -3 -16 0 v14 c3 -3 10 -3 16 0 c6 -3 13 -3 16 0 v-14 c-3 -3 -10 -3 -16 0 z" strokeWidth="1.8" />
        <rect x="253" y="548" width="13" height="13" rx="3" strokeWidth="1.8" /><path d="M257 545 h9 a3 3 0 0 1 3 3 v9" strokeWidth="1.8" />
      </g>
      <ShareGlyph x={150} y={556} s={1.15} />
      <rect x="105" y="579" width="90" height="4" rx="2" fill="#111" />
    </g>
  )
}

export const Ios27Bar = () => (
  <Phone os="ios" label="Barra de Safari en iOS 27: el botón de menú está abajo a la izquierda">
    <Site /><StatusBar os="ios" light /><CompactBar left="lines" right="tabs" />
    <Tap ring={[20, 524, 44, 44, 22]} from={[96, 452]} to={[52, 522]} labelAt={[110, 438]} />
  </Phone>
)

export const Ios27Menu = () => (
  <Phone os="ios" label="Menú de la página con Compartir de primero">
    <Site /><StatusBar os="ios" light /><Dim o={0.22} />
    <MenuCard x={22} y={300} w={214} rows={[
      { label: 'Compartir', icon: <ShareGlyph x={214} y={322} c="#111" /> },
      { label: 'Agregar a favoritos' }, { label: 'Buscar en la página' }, { label: 'Vista del lector' }, { label: 'Tamaño del texto' },
    ]} />
    <CompactBar left="lines" right="tabs" />
    <Tap ring={[24, 302, 210, 40, 12]} from={[196, 262]} to={[150, 300]} labelAt={[200, 246]} />
  </Phone>
)

export const Ios26Bar = () => (
  <Phone os="ios" label="Barra de Safari en iOS 26: el botón de tres puntos está abajo a la derecha">
    <Site /><StatusBar os="ios" light /><CompactBar left="back" right="dots" />
    <Tap ring={[236, 524, 44, 44, 22]} from={[196, 452]} to={[248, 522]} labelAt={[180, 438]} />
  </Phone>
)

export const Ios26Menu = () => (
  <Phone os="ios" label="Menú de tres puntos con Compartir de primero">
    <Site /><StatusBar os="ios" light /><Dim o={0.22} />
    <MenuCard x={64} y={300} w={214} rows={[
      { label: 'Compartir', icon: <ShareGlyph x={256} y={322} c="#111" /> },
      { label: 'Agregar a favoritos' }, { label: 'Agregar marcador' }, { label: 'Nueva pestaña privada' }, { label: 'Buscar en la página' },
    ]} />
    <CompactBar left="back" right="dots" />
    <Tap ring={[66, 302, 210, 40, 12]} from={[110, 262]} to={[150, 300]} labelAt={[100, 246]} />
  </Phone>
)

export const Ios18Bar = () => (
  <Phone os="ios" label="Barra de Safari: el botón Compartir está abajo en el centro">
    <Site /><StatusBar os="ios" light /><ClassicBar />
    <Tap ring={[132, 538, 36, 36, 10]} from={[150, 452]} to={[150, 534]} labelAt={[150, 438]} />
  </Phone>
)

/** The iOS share sheet; "Agregar a inicio" is in the list below the apps. */
export const IosShareSheet = ({ chrome = false }: { chrome?: boolean }) => (
  <Phone os="ios" label="Hoja de compartir con la opción Agregar a inicio">
    <Site /><StatusBar os="ios" light /><Dim o={0.3} />
    <rect x="12" y="168" width="276" height="440" rx="26" fill="#f2f2f7" />
    <rect x="132" y="176" width="36" height="5" rx="2.5" fill="#c7c7cc" />
    <AppIcon x={26} y={192} size={42} label="" img={ICON} />
    <text x="80" y="210" fontSize="14" fontWeight="700" fill="#111">El Tradicional</text>
    <text x="80" y="227" fontSize="11" fill="#8a8a8e">{URL}</text>
    <circle cx="258" cy="208" r="13" fill="#e3e3e8" /><path d="M253 203 l10 10 M263 203 l-10 10" stroke="#6e6e73" strokeWidth="1.8" strokeLinecap="round" />
    {[['AirDrop', '#2f80ed'], ['Mensajes', '#34c759'], ['Mail', '#1a8cff'], ['WhatsApp', '#25d366']].map(([l, c], i) => (
      <g key={l}><circle cx={50 + i * 66} cy="270" r="23" fill={c} /><text x={50 + i * 66} y="308" fontSize="10" textAnchor="middle" fill="#333">{l}</text></g>
    ))}
    <MenuCard x={24} y={322} w={252} rowH={40} rows={[
      { label: 'Copiar' },
      { label: chrome ? 'Abrir en Safari' : 'Agregar a la lista de lectura' },
      { label: 'Agregar a favoritos' },
      { label: 'Agregar a inicio', bold: true, icon: <PlusSquare x={252} y={466} /> },
      { label: 'Buscar en la página' },
    ]} />
    <Tap ring={[26, 448, 248, 38, 12]} from={[176, 552]} to={[176, 490]} labelAt={[176, 566]} />
  </Phone>
)

/** "Agregar a inicio" sheet: name, optional "Abrir como app web" switch, and Agregar top right. */
export const IosAddSheet = ({ webAppSwitch }: { webAppSwitch: boolean }) => (
  <Phone os="ios" label="Pantalla Agregar a inicio con el botón Agregar arriba a la derecha">
    <rect x="12" y="12" width="276" height="576" fill="#f2f2f7" />
    <StatusBar os="ios" />
    <text x="26" y="80" fontSize="14" fill={BLUE}>Cancelar</text>
    <text x="150" y="80" fontSize="14" fontWeight="700" textAnchor="middle" fill="#111">Agregar a inicio</text>
    <text x="272" y="80" fontSize="14" fontWeight="700" textAnchor="end" fill={BLUE}>Agregar</text>
    <rect x="24" y="150" width="252" height="92" rx="12" fill="#fff" />
    <AppIcon x={36} y={162} size={60} label="" img={ICON} />
    <text x="110" y="186" fontSize="15" fill="#111">El Tradicional</text>
    <line x1="110" x2="262" y1="195" y2="195" stroke="#d8d8dd" />
    <text x="110" y="216" fontSize="11" fill="#8a8a8e">{URL}</text>
    <text x="30" y="262" fontSize="10.5" fill="#8a8a8e">Se agregará un ícono a tu pantalla de inicio para</text>
    <text x="30" y="276" fontSize="10.5" fill="#8a8a8e">que puedas acceder rápidamente a este sitio.</text>
    {webAppSwitch && (
      <g>
        <rect x="24" y="296" width="252" height="46" rx="12" fill="#fff" />
        <text x="38" y="324" fontSize="14" fill="#111">Abrir como app web</text>
        <rect x="222" y="307" width="44" height="25" rx="12.5" fill="#34c759" />
        <circle cx="253" cy="319.5" r="10.5" fill="#fff" />
        <Check ring={[214, 301, 58, 36, 18]} note="Debe quedar en verde" at={[196, 366]} />
      </g>
    )}
    <Tap ring={[220, 62, 60, 28, 14]} from={[176, 134]} to={[234, 94]} labelAt={[140, 128]} />
  </Phone>
)

const IOS_APPS: [string, string][] = [
  ['Fotos', '#f4b400'], ['Cámara', '#5f6368'], ['Mapas', '#34a853'], ['Clima', '#2196f3'],
  ['Notas', '#ffcc00'], ['Reloj', '#1c1c1e'], ['Calendario', '#ff3b30'], ['Ajustes', '#8e8e93'],
  ['Banco', '#0b6e4f'], ['Música', '#fa2d48'], ['Correo', '#1a8cff'], ['Salud', '#ff2d55'],
  ['Spotify', '#1db954'],
]

export function IosHome() {
  const g = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <Phone os="ios" label="Pantalla de inicio del iPhone con el ícono de El Tradicional">
      <defs><linearGradient id={`wp${g}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a5fd9" /><stop offset="1" stopColor="#e2779b" /></linearGradient></defs>
      <rect x="12" y="12" width="276" height="576" fill={`url(#wp${g})`} />
      <StatusBar os="ios" light />
      {IOS_APPS.map(([l, c], i) => <AppIcon key={l} x={26 + (i % 4) * 66} y={62 + Math.floor(i / 4) * 80} size={50} label={l} color={c} />)}
      <AppIcon x={92} y={302} size={50} label="El Tradicional" img={ICON} />
      <rect x="22" y="506" width="256" height="70" rx="28" fill="rgba(255,255,255,.32)" />
      {['#34c759', '#1a8cff', '#30d158', '#fa2d48'].map((c, i) => <rect key={c} x={38 + i * 62} y={517} width="48" height="48" rx="12" fill={c} />)}
      <Tap ring={[84, 294, 66, 80, 16]} from={[214, 430]} to={[156, 370]} label="¡Aquí está!" labelAt={[222, 446]} />
    </Phone>
  )
}

// ---- iPhone (Chrome) ------------------------------------------------------------

export const IosChromeBar = () => (
  <Phone os="ios" label="Chrome en iPhone: el botón Compartir está en la barra de dirección, arriba">
    <rect x="12" y="12" width="276" height="88" fill="#fff" />
    <StatusBar os="ios" />
    <rect x="22" y="50" width="256" height="38" rx="19" fill="#f1f3f4" />
    <text x="130" y="73" fontSize="11.5" textAnchor="middle" fill="#111">{URL}</text>
    <ShareGlyph x={256} y={70} c="#3c4043" />
    <Site top={100} />
    <rect x="12" y="540" width="276" height="48" fill="#fff" />
    <Tap ring={[238, 50, 36, 38, 14]} from={[226, 404]} to={[254, 94]} labelAt={[200, 420]} />
  </Phone>
)

// ---- Android (Chrome) ------------------------------------------------------------

function ChromeTopBar() {
  return (
    <g>
      <rect x="12" y="12" width="276" height="86" fill="#fff" />
      <StatusBar os="android" />
      <rect x="20" y="50" width="200" height="36" rx="18" fill="#f1f3f4" />
      <text x="120" y="72" fontSize="11.5" textAnchor="middle" fill="#202124">{URL}</text>
      <rect x="232" y="59" width="18" height="18" rx="4" fill="none" stroke="#202124" strokeWidth="1.8" />
      <text x="241" y="72" fontSize="10" fontWeight="700" textAnchor="middle" fill="#202124">1</text>
      <Dots x={269} y={68} c="#202124" vertical />
    </g>
  )
}

export const AndroidInstallDialog = () => (
  <Phone os="android" label="Ventana Instalar app con el botón Instalar">
    <ChromeTopBar /><Site top={98} /><Dim o={0.4} />
    <rect x="34" y="214" width="232" height="176" rx="26" fill="#fff" />
    <text x="56" y="250" fontSize="18" fill="#1f1f1f">¿Instalar app?</text>
    <AppIcon x={56} y={268} size={44} label="" img={ICON} />
    <text x="112" y="287" fontSize="14" fontWeight="700" fill="#1f1f1f">El Tradicional</text>
    <text x="112" y="305" fontSize="11" fill="#5f6368">{URL}</text>
    <text x="150" y="362" fontSize="13.5" textAnchor="middle" fill="#0b57d0" fontWeight="600">Cancelar</text>
    <rect x="192" y="340" width="62" height="34" rx="17" fill="#0b57d0" />
    <text x="223" y="362" fontSize="13.5" textAnchor="middle" fill="#fff" fontWeight="600">Instalar</text>
    <Tap ring={[186, 334, 74, 46, 23]} from={[222, 478]} to={[222, 384]} labelAt={[222, 492]} />
  </Phone>
)

export const AndroidChromeBar = () => (
  <Phone os="android" label="Chrome en Android: los tres puntos están arriba a la derecha">
    <ChromeTopBar /><Site top={98} />
    <Tap ring={[254, 48, 30, 42, 12]} from={[230, 404]} to={[266, 96]} labelAt={[200, 420]} />
  </Phone>
)

export const AndroidChromeMenu = () => {
  const rows = ['Nueva pestaña', 'Nueva pestaña de incógnito', 'Historial', 'Descargas', 'Favoritos', 'Pestañas recientes',
    'Compartir…', 'Buscar en la página', 'Traducir…', 'Agregar a la pantalla principal', 'Sitio para computadoras']
  return (
    <Phone os="android" label="Menú de Chrome con Agregar a la pantalla principal">
      <ChromeTopBar /><Site top={98} />
      <rect x="58" y="44" width="226" height="40" rx="14" fill="#fff" />
      <MenuCard x={58} y={78} w={226} rowH={34} fontSize={12.5} rows={rows.map(r => ({ label: r, bold: r.startsWith('Agregar') }))} />
      <g fill="none" stroke="#202124" strokeWidth="1.7" strokeLinecap="round">
        <path d="M80 64 h12 M88 59 l5 5 -5 5" /><path d="M128 56 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" />
        <path d="M176 56 v12 M171 63 l5 5 5 -5 M170 72 h12" /><circle cx="222" cy="64" r="7" /><path d="M268 58 a7 7 0 1 0 2 6" />
      </g>
      <Tap ring={[60, 384, 222, 36, 10]} from={[36, 498]} to={[60, 424]} labelAt={[66, 514]} />
    </Phone>
  )
}

export const AndroidChromeSheet = () => (
  <Phone os="android" label="Opciones: Instalar o Crear acceso directo">
    <ChromeTopBar /><Site top={98} /><Dim o={0.35} />
    <rect x="12" y="364" width="276" height="240" rx="24" fill="#fff" />
    <rect x="132" y="374" width="36" height="4" rx="2" fill="#c4c7c5" />
    <text x="30" y="408" fontSize="13" fontWeight="700" fill="#1f1f1f">Agregar a la pantalla principal</text>
    <circle cx="48" cy="452" r="15" fill="#e8f0fe" /><path d="M48 444 v12 M43 451 l5 5 5 -5" stroke="#0b57d0" strokeWidth="2" fill="none" strokeLinecap="round" />
    <text x="74" y="449" fontSize="14" fontWeight="700" fill="#1f1f1f">Instalar</text>
    <text x="74" y="465" fontSize="11" fill="#5f6368">Se abre como una app</text>
    <circle cx="48" cy="510" r="15" fill="#f1f3f4" /><path d="M42 510 h12 M48 504 v12" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" />
    <text x="74" y="507" fontSize="14" fill="#1f1f1f">Crear acceso directo</text>
    <text x="74" y="523" fontSize="11" fill="#5f6368">Abre la página en Chrome</text>
    <Tap ring={[22, 430, 256, 46, 14]} from={[268, 302]} to={[266, 426]} labelAt={[226, 288]} />
  </Phone>
)

const ANDROID_APPS: [string, string][] = [
  ['Teléfono', '#1e8e3e'], ['Mensajes', '#1a73e8'], ['Cámara', '#5f6368'], ['Galería', '#f29900'],
  ['Chrome', '#fbbc04'], ['WhatsApp', '#25d366'], ['Ajustes', '#80868b'], ['Banco', '#0b6e4f'],
  ['Spotify', '#1db954'], ['Maps', '#34a853'], ['Gmail', '#ea4335'],
]

export function AndroidHome() {
  const g = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <Phone os="android" label="Pantalla principal de Android con el ícono de El Tradicional">
      <defs><linearGradient id={`aw${g}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f3d2e" /><stop offset="1" stopColor="#6fae8f" /></linearGradient></defs>
      <rect x="12" y="12" width="276" height="576" fill={`url(#aw${g})`} />
      <StatusBar os="android" light />
      {ANDROID_APPS.map(([l, c], i) => <AppIcon key={l} x={30 + (i % 4) * 64} y={70 + Math.floor(i / 4) * 82} size={46} label={l} color={c} round />)}
      <AppIcon x={222} y={234} size={46} label="El Tradicional" img={ICON} round />
      <rect x="30" y="520" width="240" height="40" rx="20" fill="rgba(255,255,255,.85)" />
      <text x="56" y="545" fontSize="12" fill="#5f6368">Buscar</text>
      <Tap ring={[212, 226, 66, 78, 16]} from={[170, 400]} to={[230, 310]} label="¡Aquí está!" labelAt={[150, 414]} />
    </Phone>
  )
}

/** Xiaomi / Redmi / POCO block shortcuts until Chrome gets this permission. */
export const XiaomiPermission = () => (
  <Phone os="android" label="Ajustes de Chrome: permitir accesos directos en la pantalla de inicio">
    <StatusBar os="android" />
    <path d="M30 70 l-7 7 7 7" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <text x="42" y="82" fontSize="16" fontWeight="700" fill="#111">Otros permisos</text>
    <circle cx="40" cy="118" r="13" fill="#fbbc04" /><text x="62" y="123" fontSize="13" fill="#555">Chrome</text>
    <g transform="translate(0,40)">
    {[
      ['Accesos directos en la', 'pantalla de inicio', 'Permitir', '#1e8e3e'],
      ['Mostrar ventanas emergentes', '', 'Preguntar', '#8a8a8e'],
      ['Iniciar en segundo plano', '', 'Permitir', '#8a8a8e'],
      ['Mostrar en pantalla de bloqueo', '', 'Preguntar', '#8a8a8e'],
    ].map(([a, b, v, c], i) => (
      <g key={a}>
        <line x1="24" x2="276" y1={150 + i * 62} y2={150 + i * 62} stroke="#eee" />
        <text x="26" y={b ? 175 + i * 62 : 184 + i * 62} fontSize="13" fill="#111">{a}</text>
        {b && <text x="26" y={192 + i * 62} fontSize="13" fill="#111">{b}</text>}
        <text x="272" y={184 + i * 62} fontSize="13" fill={c} textAnchor="end" fontWeight={i === 0 ? 700 : 400}>{v} ›</text>
      </g>
    ))}
    </g>
    <Tap ring={[204, 204, 76, 30, 12]} from={[252, 168]} to={[246, 202]} label="Elige Permitir" labelAt={[200, 152]} />
  </Phone>
)

// ---- Samsung Internet -------------------------------------------------------------

function SamsungBars() {
  return (
    <g>
      <rect x="12" y="12" width="276" height="86" fill="#fff" />
      <StatusBar os="android" />
      <rect x="20" y="50" width="260" height="36" rx="18" fill="#f1f1f1" />
      <text x="150" y="72" fontSize="11.5" textAnchor="middle" fill="#111">{URL}</text>
      <rect x="12" y="540" width="276" height="48" fill="#fafafa" />
      <g fill="none" stroke="#333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 556 l-7 7 7 7" /><path d="M78 556 l7 7 -7 7" opacity=".4" />
        <path d="M118 566 l9 -8 9 8 v8 h-18z" /><path d="M170 555 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" />
        <rect x="208" y="556" width="15" height="15" rx="3" />
        <path d="M254 557 h16 M254 563 h16 M254 569 h16" />
      </g>
    </g>
  )
}

export const SamsungBar = () => (
  <Phone os="android" label="Samsung Internet: el menú de tres rayas está abajo a la derecha">
    <Site top={98} /><SamsungBars />
    <Tap ring={[244, 542, 38, 42, 12]} from={[196, 460]} to={[256, 538]} labelAt={[180, 446]} />
  </Phone>
)

export const SamsungMenu = () => {
  const items = ['Favoritos', 'Descargas', 'Historial', 'Agregar|página a', 'Páginas|guardadas', 'Bloqueador', 'Modo oscuro', 'Ajustes']
  return (
    <Phone os="android" label="Menú de Samsung Internet con Agregar página a">
      <Site top={98} /><SamsungBars /><Dim o={0.35} />
      <rect x="12" y="330" width="276" height="270" rx="24" fill="#fff" />
      {items.map((it, i) => {
        const cx = 50 + (i % 4) * 66, cy = 372 + Math.floor(i / 4) * 92
        const [a, b] = it.split('|')
        return (
          <g key={it}>
            <circle cx={cx} cy={cy} r="20" fill={i === 3 ? '#e8f0fe' : '#f1f1f1'} />
            {i === 3 && <path d={`M${cx} ${cy - 8} v16 M${cx - 8} ${cy} h16`} stroke="#1a73e8" strokeWidth="2.4" strokeLinecap="round" />}
            <text x={cx} y={cy + 36} fontSize="10.5" textAnchor="middle" fill="#222" fontWeight={i === 3 ? 700 : 400}>{a}</text>
            {b && <text x={cx} y={cy + 49} fontSize="10.5" textAnchor="middle" fill="#222" fontWeight={i === 3 ? 700 : 400}>{b}</text>}
          </g>
        )
      })}
      <Tap ring={[214, 344, 68, 88, 14]} from={[176, 306]} to={[224, 342]} labelAt={[120, 300]} />
    </Phone>
  )
}

export const SamsungSubmenu = () => (
  <Phone os="android" label="Agregar página a: Pantalla de inicio">
    <Site top={98} /><SamsungBars /><Dim o={0.4} />
    <rect x="40" y="226" width="220" height="192" rx="24" fill="#fff" />
    <text x="60" y="258" fontSize="15" fontWeight="700" fill="#111">Agregar página a</text>
    {['Favoritos', 'Accesos rápidos', 'Pantalla de inicio', 'Páginas guardadas'].map((r, i) => (
      <text key={r} x="60" y={294 + i * 34} fontSize="13.5" fill="#111" fontWeight={i === 2 ? 700 : 400}>{r}</text>
    ))}
    <Tap ring={[48, 340, 204, 32, 10]} from={[250, 478]} to={[236, 376]} labelAt={[226, 494]} />
  </Phone>
)

export const SamsungConfirm = () => (
  <Phone os="android" label="Confirmar: Agregar a la pantalla de inicio">
    <Site top={98} /><SamsungBars /><Dim o={0.4} />
    <rect x="24" y="290" width="252" height="168" rx="26" fill="#fff" />
    <text x="150" y="322" fontSize="14.5" fontWeight="700" textAnchor="middle" fill="#111">Agregar a pantalla de inicio</text>
    <AppIcon x={126} y={334} size={48} label="" img={ICON} round />
    <text x="150" y="400" fontSize="12.5" textAnchor="middle" fill="#111">El Tradicional</text>
    <text x="90" y="440" fontSize="14" textAnchor="middle" fill="#111">Cancelar</text>
    <text x="210" y="440" fontSize="14" textAnchor="middle" fill="#1a73e8" fontWeight="700">Agregar</text>
    <Tap ring={[172, 420, 76, 30, 15]} from={[222, 518]} to={[212, 454]} labelAt={[204, 524]} />
  </Phone>
)

// ---- Instagram / Facebook / TikTok -----------------------------------------------

function InAppBar() {
  return (
    <g>
      <rect x="12" y="12" width="276" height="86" fill="#fff" />
      <StatusBar os="ios" />
      <path d="M26 64 l12 12 M38 64 l-12 12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <text x="150" y="68" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#111">El Tradicional</text>
      <text x="150" y="84" fontSize="10" textAnchor="middle" fill="#8a8a8e">{URL}</text>
      <Dots x={266} y={72} />
    </g>
  )
}

export const InAppBarScene = () => (
  <Phone os="ios" label="Navegador de Instagram o Facebook: los tres puntos arriba a la derecha">
    <InAppBar /><Site top={98} />
    <Tap ring={[246, 54, 40, 36, 18]} from={[230, 404]} to={[262, 94]} labelAt={[200, 420]} />
  </Phone>
)

export const InAppMenu = () => (
  <Phone os="ios" label="Menú con Abrir en el navegador externo">
    <InAppBar /><Site top={98} /><Dim o={0.35} />
    <rect x="12" y="380" width="276" height="220" rx="24" fill="#fff" />
    {['Abrir en el navegador externo', 'Copiar enlace', 'Compartir…', 'Actualizar'].map((r, i) => (
      <g key={r}>
        {i > 0 && <line x1="28" x2="272" y1={404 + i * 44} y2={404 + i * 44} stroke="#eee" />}
        <text x="30" y={432 + i * 44} fontSize="14" fill="#111" fontWeight={i === 0 ? 700 : 400}>{r}</text>
      </g>
    ))}
    <Tap ring={[20, 408, 260, 38, 12]} from={[150, 318]} to={[150, 404]} labelAt={[150, 304]} />
  </Phone>
)
