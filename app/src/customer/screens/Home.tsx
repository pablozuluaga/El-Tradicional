import { useNavigate } from 'react-router-dom'
import { ADDRESS, ADDRESS_AREA, FACEBOOK_URL, INSTAGRAM_URL, MAPS_URL, PHONE_DISPLAY, WHATSAPP_URL } from '../../config.ts'
import { FEATURED_IDS } from '../../domain/catalog.ts'
import { dishById } from '../../domain/menu.ts'
import type { Origin } from '../../domain/types.ts'
import { useDevice, useSnapshot } from '../../data/hooks.ts'
import { InstagramIcon, SectionHeading, Silhouette } from '../../ui/ui.tsx'
import { DishCard } from '../DishCard.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import h from './Home.module.css'

const GALLERY = [
  ['/assets/afuera.jpeg', 'Fachada'],
  ['/assets/bandeja-paisa.webp', 'Bandeja Paisa'],
  ['/assets/sancocho.webp', 'Sancocho Trifásico'],
  ['/assets/trucha.webp', 'Trucha'],
]

export function Home() {
  const nav = useNavigate()
  const snap = useSnapshot()
  const [dev, setDev] = useDevice()
  const s = snap.settings
  const promos = s.promos.filter(p => p.active && !(p.id === 'primer' && snap.eligibility.kind !== 'primer'))
  const featured = FEATURED_IDS.map(id => dishById(s, id)).filter(d => d !== null)
  const order = (mode: Origin) => { setDev({ mode }); nav(P.menu) }

  return (
    <div className={`${c.scroll} noscroll`}>
      <div className={h.topbar}>
        <div className={h.brand}>
          <img className={h.logo} src="/assets/logo.jpeg" alt="El Tradicional" />
          <div>
            <div className={h.brandName}>El Tradicional</div>
            {s.storeOpen
              ? <div className={h.status} style={{ color: 'var(--green)' }}><span className={h.statusDot} style={{ background: 'var(--green)' }} />Abierto · hasta 4:00pm</div>
              : <div className={h.status} style={{ color: 'var(--red)' }}><span className={h.statusDot} style={{ background: 'var(--red)' }} />Cerrado ahora</div>}
          </div>
        </div>
        <button type="button" className={h.profilePill} onClick={() => nav(P.profile)}>
          <span className={h.pillIcon}>{dev.avatar ? <img src={dev.avatar} alt="" /> : <Silhouette size={17} stroke="#7c756a" width={1.9} />}</span>
          <span className={h.pillLabel}>Mi perfil</span>
        </button>
      </div>

      <div className={h.hero}>
        <img className={h.heroImg} src="/assets/afuera.jpeg" alt="Fachada El Tradicional" />
        <div className={h.heroShade} />
        <div className={h.heroBody}>
          <div className={h.heroEyebrow}>Cocina típica · Envigado</div>
          <div className={h.heroTitle}>Almuerzos caseros,<br />como en casa</div>
          <button type="button" className={h.heroCta} onClick={() => nav(P.menu)}>Ver el menú de hoy</button>
        </div>
      </div>

      <div className={h.quick}>
        <button type="button" className={`${h.quickBtn} ${h.quickRed}`} onClick={() => order('domicilio')}>
          <span className={h.quickEmoji}>🛵</span><span className={h.quickTitle}>Pedir a domicilio</span>
          <span className={h.quickSub} style={{ color: 'rgba(255,255,255,.85)' }}>Llega en 35–45 min</span>
        </button>
        <button type="button" className={`${h.quickBtn} ${h.quickDark}`} onClick={() => order('recoger')}>
          <span className={h.quickEmoji}>🍽️</span><span className={h.quickTitle}>Recoger en el local</span>
          <span className={h.quickSub} style={{ color: 'rgba(240,183,160,.9)' }}>Sin costo de envío</span>
        </button>
      </div>

      {promos.length > 0 && (
        <>
          <SectionHeading first eyebrow="Ofertas" title="Promociones" sub="Cupones y descuentos vigentes" />
          <div className={`${h.promos} xscroll`}>
            {promos.map(p => (
              <button key={p.id} type="button" className={h.promo} onClick={() => nav(P.menu)}>
                <div className={h.promoTitle}>{p.title}</div>
                <div className={h.promoSub}>{p.sub}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionHeading eyebrow="Galería" title="El Tradicional por dentro" sub="Un vistazo al local y la cocina" />
      <div className={`${h.gallery} xscroll`}>
        {GALLERY.map(([src, alt]) => <div key={src} className={h.galleryItem}><img src={src} alt={alt} loading="lazy" /></div>)}
      </div>

      <div className={h.story}>
        <div className={h.storyTitle}>Nuestra historia</div>
        <div className={h.storyText}>Somos un restaurante familiar en Envigado. Cada almuerzo se cocina el mismo día, con recetas de la casa: bandeja paisa, sancocho trifásico, mondongo y más. Sabor tradicional, servido con cariño.</div>
        <div className={h.facts}>
          <div className={h.fact}><span className={h.factIcon}>🕒</span><div><div className={h.factMain}>Lun a Dom · 11:30am – 4:00pm</div><div className={h.factSub}>Festivos incluidos</div></div></div>
          <div className={h.fact}><span className={h.factIcon}>📍</span><div><div className={h.factMain}>{ADDRESS}</div><div className={h.factSub}>{ADDRESS_AREA}</div></div></div>
        </div>
        <a className={h.directions} href={MAPS_URL} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
      </div>

      <button type="button" className={h.corp} onClick={() => nav(P.corp)}>
        <span style={{ fontSize: 18, flex: 'none' }}>🍱</span>
        <div style={{ flex: 1 }}><div className={h.corpTitle}>Combo empresarial</div><div className={h.corpSub}>Grupos grandes · se cotiza por WhatsApp</div></div>
        <span style={{ fontSize: 16, color: 'var(--peach)', flex: 'none' }}>›</span>
      </button>

      <SectionHeading
        eyebrow="Favoritos de la casa"
        title="Los más pedidos"
        right={<button type="button" className={h.seeAll} onClick={() => nav(P.menu)}>Ver todo →</button>}
        sub="Los platos que más nos piden todos los días"
      />
      <div className={`${c.dishList} ${h.featured}`}>
        {featured.map(d => <DishCard key={d.id} d={d} s={s} onOpen={() => nav(P.dish(d.id))} />)}
      </div>

      <footer className={h.footer}>
        <div className={h.footBrand}>
          <img className={h.footLogo} src="/assets/logo.jpeg" alt="El Tradicional" />
          <div><div className={h.footName}>El Tradicional</div><div className={h.footTag}>Cocina típica paisa · Envigado</div></div>
        </div>
        <div className={h.footCols}>
          <div className={h.footCol}>
            <div className={h.footHead}>Menú</div>
            <button type="button" className={h.footLink} onClick={() => nav(P.menu)}>Ver el menú</button>
            <button type="button" className={h.footLink} onClick={() => nav(P.corp)}>Almuerzos empresariales</button>
            <button type="button" className={h.footLink} onClick={() => nav(P.profile)}>Mi perfil</button>
            <button type="button" className={h.footLink} onClick={() => nav('/instalar')}>Instala la app</button>
          </div>
          <div className={h.footCol}>
            <div className={h.footHead}>Contacto</div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#e7ddce', fontSize: 13 }}>WhatsApp {PHONE_DISPLAY}</a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#e7ddce', fontSize: 13 }}>Cómo llegar</a>
            <span style={{ color: '#e7ddce', fontSize: 13 }}>Lun a Dom · 11:30am – 4pm</span>
          </div>
        </div>
        <div className={h.socials}>
          <a className={h.social} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon size={19} /></a>
          <a className={h.social} href={FACEBOOK_URL || '#'} target={FACEBOOK_URL ? '_blank' : undefined} rel="noopener noreferrer" aria-label="Facebook"
            onClick={e => { if (!FACEBOOK_URL) e.preventDefault() }}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff" aria-hidden="true"><path d="M14 9V7.2c0-.8.2-1.2 1.3-1.2H17V3.1C16.6 3 15.5 3 14.3 3 11.7 3 10 4.6 10 7v2H7.5v3H10v9h3.2v-9H16l.5-3H14z" /></svg>
          </a>
          <a className={h.social} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.3.1.9-.1 1.6z" /></svg>
          </a>
        </div>
        <div className={h.legal}>
          Razón social: — · NIT: —<br />
          © {new Date().getFullYear()} El Tradicional. Todos los derechos reservados.<br />
          <a href="#" onClick={e => e.preventDefault()}>Términos y condiciones</a> · <a href="#" onClick={e => e.preventDefault()}>Política de privacidad</a>
        </div>
      </footer>
    </div>
  )
}
