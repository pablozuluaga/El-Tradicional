import { useNavigate } from 'react-router-dom'
import { PHONE_DISPLAY, WHATSAPP_CORP_URL } from '../../config.ts'
import { BackButton } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'

const INCLUDES = [
  'Menú a elección: bandeja paisa, sancocho, pescados y más.',
  'Jugo natural incluido para cada persona.',
  'Precio especial desde 10 personas.',
  'Entrega a la hora que necesites, empacado individual.',
]

export function Corporate() {
  const nav = useNavigate()
  return (
    <>
      <div className={`${c.scroll} noscroll`}>
        <div style={{ height: 180, position: 'relative', background: 'repeating-linear-gradient(45deg,#242019,#242019 12px,#2c281f 12px,#2c281f 24px)', display: 'flex', alignItems: 'flex-end' }}>
          <BackButton overPhoto onClick={() => nav(P.home)} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(20,17,14,0) 35%,rgba(20,17,14,.85) 100%)' }} />
          <div style={{ position: 'relative', padding: 20, color: '#fff' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--peach)', fontWeight: 600 }}>Para empresas y grupos</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1, marginTop: 3 }}>Almuerzos empresariales</div>
          </div>
        </div>
        <div style={{ padding: '18px 22px 6px', fontSize: 14, color: 'var(--body)', lineHeight: 1.6 }}>
          ¿Reunión, evento o equipo con hambre? Llevamos el sabor de la casa a tu empresa. Preparamos almuerzos para grupos grandes con menú a convenir, entrega puntual y precio especial por volumen.
        </div>
        <div style={{ padding: '14px 22px 4px', fontFamily: 'var(--serif)', fontSize: 20 }}>¿Qué incluye?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 22px' }}>
          {INCLUDES.map(t => (
            <div key={t} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 13.5 }}><span style={{ color: 'var(--red)', fontWeight: 700 }}>•</span> {t}</div>
          ))}
        </div>
        <div style={{ margin: '14px 16px 4px', background: 'var(--cream)', borderRadius: 16, padding: '16px 18px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Este servicio se cotiza directamente con el restaurante: cuéntanos cuántas personas son y para qué día, y te armamos la propuesta.
        </div>
        <div style={{ height: 100 }} />
      </div>
      <div className={c.footer} style={{ paddingBottom: 'max(22px, var(--safe-bottom))' }}>
        <a href={WHATSAPP_CORP_URL} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', height: 54, borderRadius: 15, background: 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 15 }}>
          Cotizar por WhatsApp
        </a>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>o llámanos al {PHONE_DISPLAY}</div>
      </div>
    </>
  )
}
