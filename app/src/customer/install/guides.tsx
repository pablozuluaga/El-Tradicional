import type { ReactNode } from 'react'
import type { GuideId } from '../../pwa/platform.ts'
import {
  AndroidChromeBar, AndroidChromeMenu, AndroidChromeSheet, AndroidHome, AndroidInstallDialog, AndroidOurButton,
  InAppBarScene, InAppMenu, Ios18Bar, Ios26Bar, Ios26Menu, Ios27Bar, Ios27Menu, IosAddSheet, IosChromeBar, IosHome,
  IosShareSheet, SamsungBar, SamsungConfirm, SamsungMenu, SamsungSubmenu, XiaomiPermission,
} from './scenes.tsx'

export interface Step { title: string; text: ReactNode; scene?: ReactNode }
export interface Guide { id: GuideId; chip: string; heading: string; steps: Step[]; tip?: { title: string; steps: Step[] } }

/** Where the first button is on the real screen, for the floating "start here" arrow. */
export const START_AT: Partial<Record<GuideId, 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-right'>> = {
  ios27: 'bottom-left', ios26: 'bottom-right', ios18: 'bottom-center', iosChrome: 'top-right',
  androidChrome: 'top-right', samsung: 'bottom-right', inapp: 'top-right',
}


const iosShare: Step = {
  title: 'Toca “Agregar a inicio”',
  text: <>Se abre la ventana para compartir. Baja un poco por la lista y toca <b>Agregar a inicio</b> (el cuadrito con un +). Si no la ves, desliza la lista hacia arriba o toca <b>Ver más</b>.</>,
  scene: <IosShareSheet />,
}
const iosAdd = (webAppSwitch: boolean): Step => ({
  title: webAppSwitch ? 'Deja “Abrir como app web” en verde y toca “Agregar”' : 'Toca “Agregar”',
  text: webAppSwitch
    ? <>Revisa que el interruptor <b>Abrir como app web</b> esté en verde y toca <b>Agregar</b>, arriba a la derecha. No te pide contraseña, Apple ID ni permisos.</>
    : <>Toca <b>Agregar</b>, arriba a la derecha. Si ves el interruptor <b>Abrir como app web</b>, déjalo en verde. No te pide contraseña, Apple ID ni permisos.</>,
  scene: <IosAddSheet webAppSwitch={webAppSwitch} />,
})
const iosDone: Step = {
  title: '¡Listo! Ábrela desde tu pantalla de inicio',
  text: <>El ícono rojo de <b>El Tradicional</b> queda junto a tus apps. Ábrelo desde ahí: se ve a pantalla completa, como cualquier app.</>,
  scene: <IosHome />,
}
const androidDone: Step = {
  title: '¡Listo! Ábrela desde tu pantalla principal',
  text: <>El ícono de <b>El Tradicional</b> queda con tus apps (si no lo ves, búscalo en el cajón de apps). Ábrelo desde ahí, como cualquier app.</>,
  scene: <AndroidHome />,
}

export const GUIDES: Record<Exclude<GuideId, 'desktop'>, Guide> = {
  ios27: {
    id: 'ios27', chip: 'iPhone · iOS 27', heading: 'iPhone con Safari (iOS 27)',
    steps: [
      { title: 'Toca el botón de menú, abajo a la izquierda', text: <>Es el botón redondo con <b>tres rayitas</b>, a la izquierda de la dirección. También sirve dejar el dedo presionado sobre la dirección.</>, scene: <Ios27Bar /> },
      { title: 'Toca “Compartir”', text: <>Es la primera opción del menú que se abre.</>, scene: <Ios27Menu /> },
      iosShare, iosAdd(true), iosDone,
    ],
  },
  ios26: {
    id: 'ios26', chip: 'iPhone · iOS 26', heading: 'iPhone con Safari (iOS 26)',
    steps: [
      { title: 'Toca los tres puntos, abajo a la derecha', text: <>Es el botón redondo con <b>•••</b>, a la derecha de la dirección.</>, scene: <Ios26Bar /> },
      { title: 'Toca “Compartir”', text: <>Es la primera opción del menú que se abre.</>, scene: <Ios26Menu /> },
      iosShare, iosAdd(true), iosDone,
    ],
  },
  ios18: {
    id: 'ios18', chip: 'iPhone · iOS 18 o anterior', heading: 'iPhone con Safari (iOS 18 o anterior)',
    steps: [
      { title: 'Toca “Compartir” en la barra de abajo', text: <>Es el <b>cuadrito con una flecha hacia arriba</b>, en el centro de la barra. Si tu dirección está arriba, baja un poco la página para que aparezca la barra.</>, scene: <Ios18Bar /> },
      iosShare, iosAdd(false), iosDone,
    ],
  },
  iosChrome: {
    id: 'iosChrome', chip: 'iPhone · Chrome', heading: 'iPhone con Chrome',
    steps: [
      { title: 'Toca “Compartir” en la barra de dirección', text: <>Es el <b>cuadrito con una flecha</b>, arriba a la derecha, dentro de la barra de la dirección.</>, scene: <IosChromeBar /> },
      { ...iosShare, text: <>Baja por la lista y toca <b>Agregar a inicio</b>. Si no aparece, toca <b>Abrir en Safari</b> y sigue la guía de Safari.</>, scene: <IosShareSheet chrome /> },
      iosAdd(false), iosDone,
    ],
  },
  androidChrome: {
    id: 'androidChrome', chip: 'Android · Chrome', heading: 'Android con Chrome',
    steps: [
      { title: 'Toca los tres puntos, arriba a la derecha', text: <>Están junto a la barra de la dirección de Chrome.</>, scene: <AndroidChromeBar /> },
      { title: 'Toca “Agregar a la pantalla principal”', text: <>Está casi al final del menú. En algunos celulares dice <b>Instalar app</b>: es lo mismo.</>, scene: <AndroidChromeMenu /> },
      { title: 'Elige “Instalar”', text: <>Si Chrome te pregunta, elige <b>Instalar</b> (no “Crear acceso directo”): así se abre como app.</>, scene: <AndroidChromeSheet /> },
      { title: 'Confirma con “Instalar”', text: <>Toca <b>Instalar</b>. Si tu celular pregunta dónde ponerla, toca <b>Agregar</b> o <b>Agregar automáticamente</b>. No pide permisos ni cuenta de Google.</>, scene: <AndroidInstallDialog /> },
      androidDone,
    ],
    tip: {
      title: '¿No aparece el ícono? (Xiaomi, Redmi, POCO, Huawei)',
      steps: [{
        title: 'Dale a Chrome el permiso de accesos directos',
        text: <>Ve a <b>Ajustes → Apps → Administrar apps → Chrome → Otros permisos</b>, toca <b>Accesos directos en la pantalla de inicio</b> y elige <b>Permitir</b>. Después vuelve a esta página y repite los pasos.</>,
        scene: <XiaomiPermission />,
      }],
    },
  },
  samsung: {
    id: 'samsung', chip: 'Samsung Internet', heading: 'Samsung con Samsung Internet',
    steps: [
      { title: 'Toca el menú, abajo a la derecha', text: <>Es el botón de <b>tres rayas</b> en la barra de abajo. (Si ves un ícono de descarga ⬇ en la barra de dirección, también puedes tocarlo y luego <b>Instalar</b>.)</>, scene: <SamsungBar /> },
      { title: 'Toca “Agregar página a”', text: <>Está entre las opciones del menú (en algunos celulares dice <b>Añadir página a</b>).</>, scene: <SamsungMenu /> },
      { title: 'Elige “Pantalla de inicio”', text: <>Así queda como app en tu pantalla, no como favorito.</>, scene: <SamsungSubmenu /> },
      { title: 'Toca “Agregar”', text: <>Confirma y listo. No pide permisos ni cuenta.</>, scene: <SamsungConfirm /> },
      androidDone,
    ],
  },
  inapp: {
    id: 'inapp', chip: 'Instagram / Facebook', heading: 'Si abriste el enlace en Instagram, Facebook o TikTok',
    steps: [
      { title: 'Toca los tres puntos, arriba a la derecha', text: <>Desde Instagram, Facebook o TikTok no se puede instalar. Primero hay que abrir la página en el navegador.</>, scene: <InAppBarScene /> },
      { title: 'Toca “Abrir en el navegador externo”', text: <>Puede decir <b>Abrir en Safari</b>, <b>Abrir en Chrome</b> o <b>Abrir en el navegador</b>. Se abre esta misma página y ahí te mostramos los pasos de tu celular.</>, scene: <InAppMenu /> },
    ],
  },
}

/** Android Chrome when the one-tap install is available: our button does the menu steps. */
export const ANDROID_ONE_TAP: Step[] = [
  { title: 'Toca el botón rojo “Instalar la app”', text: <>Está aquí abajo, en esta misma página.</>, scene: <AndroidOurButton /> },
  { title: 'Confirma con “Instalar”', text: <>Chrome te pregunta si quieres instalarla: toca <b>Instalar</b>. No pide permisos ni cuenta de Google.</>, scene: <AndroidInstallDialog /> },
  androidDone,
]

export const GUIDE_ORDER: Exclude<GuideId, 'desktop'>[] = ['ios27', 'ios26', 'ios18', 'iosChrome', 'androidChrome', 'samsung', 'inapp']
