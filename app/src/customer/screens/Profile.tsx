import { useState, type ChangeEvent } from 'react'
import { newId } from '../../domain/ids.ts'

import { useNavigate } from 'react-router-dom'
import { MAPS_URL, PHONE_TEL, WHATSAPP_URL } from '../../config.ts'
import { dateShort, fmt, orderId } from '../../domain/format.ts'
import { loyaltyCard, profileStats } from '../../domain/loyalty.ts'
import { hasUnread, statusName } from '../../domain/orders.ts'
import { downscaleAvatar, type Address } from '../../data/device.ts'
import { useDevice, useSnapshot } from '../../data/hooks.ts'
import { Silhouette, UnreadDot } from '../../ui/ui.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import x from './Profile.module.css'

export function Profile() {
  const nav = useNavigate()
  const snap = useSnapshot()
  const [dev, setDev] = useDevice()
  const [fLine, setLine] = useState('')
  const [fApt, setApt] = useState('')
  const [photoErr, setPhotoErr] = useState('')

  const first = dev.firstName.trim(), last = dev.lastName.trim()
  const fullName = (first + ' ' + last).trim()
  const initials = ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
  const card = loyaltyCard(snap.eligibility)
  const stats = profileStats(snap.orders)
  const unread = snap.orders.some(o => hasUnread(o, 'cliente'))
  const formOpen = dev.selectedAddr === 'new' || !dev.addresses.some(a => a.id === dev.selectedAddr)

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { setDev({ avatar: await downscaleAvatar(f) }); setPhotoErr('') } catch { setPhotoErr('No pudimos leer esa imagen.') }
  }
  const saveAddr = () => {
    const line = fLine.trim()
    if (!line) return
    const a: Address = { id: newId('a'), line, apt: fApt.trim(), notes: '' }
    setDev(st => ({ addresses: [...st.addresses, a], selectedAddr: a.id }))
    setLine(''); setApt('')
  }
  const removeAddr = (id: string) => setDev(st => ({ addresses: st.addresses.filter(a => a.id !== id), selectedAddr: st.selectedAddr === id ? 'new' : st.selectedAddr }))

  return (
    <div className={`${c.scroll} noscroll`}>
      <div className={x.title}>{fullName ? 'Mi cuenta' : 'Crea tu cuenta'}</div>
      <div className={x.card}>
        {dev.avatar
          ? <div className={x.avatar}><img src={dev.avatar} alt="Tu foto" /></div>
          : fullName ? <div className={`${x.avatar} ${x.initials}`}>{initials}</div>
          : <div className={x.avatar}><Silhouette size={34} stroke="#F0B7A0" /></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={x.name}>{fullName || 'Tu cuenta'}</div>
          <div className={x.email}>{dev.email.trim() || 'Cliente El Tradicional'}</div>
          <label className={x.photoBtn}>Cambiar foto<input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} /></label>
          {photoErr && <div style={{ fontSize: 11, color: '#F0A0A0', marginTop: 5 }}>{photoErr}</div>}
        </div>
      </div>

      <div className={x.fields}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><div className={x.fieldLabel}>Nombre</div><input className={x.locked} value={dev.firstName} readOnly aria-label="Nombre" /></div>
          <div style={{ flex: 1 }}><div className={x.fieldLabel}>Apellidos</div><input className={x.locked} value={dev.lastName} readOnly aria-label="Apellidos" /></div>
        </div>
        <div className={x.lockNote}>🔒 Tu nombre se guarda una sola vez y no se puede cambiar.</div>
      </div>

      <button type="button" className={x.rowBtn} onClick={() => nav(P.orders)}>
        <span style={{ fontSize: 22, flex: 'none' }}>🧾</span>
        <div style={{ flex: 1 }}><div className={x.rowTitle}>Mis pedidos</div><div className={x.rowSub}>Sigue el estado y chatea con el restaurante</div></div>
        <span style={{ fontSize: 20, flex: 'none', color: 'var(--red)' }}>›</span>
        {unread && <UnreadDot size={14} top={-5} right={-5} />}
      </button>

      <div className={x.loyal}>
        <div className={x.loyalHead}>Cliente El Tradicional</div>
        <div className={x.loyalTitle}>{card.title}</div>
        <div className={x.loyalSub}>{card.sub}</div>
        <div className={x.stamps} aria-label={card.label}>
          {card.stamps.map((on, i) => on ? <span key={i} className={`${x.stamp} ${x.stampOn}`}>✓</span> : <span key={i} className={x.stamp} />)}
        </div>
        <div className={x.stampsLabel}>{card.label}</div>
      </div>

      <div className={x.stats}>
        <div className={x.stat}><div className={x.statBig}>{stats.pedidos}</div><div className={x.statLabel}>Pedidos</div></div>
        <div className={x.stat}><div className={x.statFav}>{stats.favorito}</div><div className={x.statLabel}>Favorito</div></div>
      </div>

      <button type="button" className={x.corp} onClick={() => nav(P.corp)}>
        <span style={{ fontSize: 22, flex: 'none' }}>🍱</span>
        <div style={{ flex: 1 }}><div className={x.rowTitle}>Almuerzos empresariales</div><div className={x.rowSub} style={{ color: '#c9bfae' }}>Para grupos grandes · cotiza por WhatsApp</div></div>
        <span style={{ fontSize: 20, flex: 'none' }}>›</span>
      </button>

      <div className={x.secHead}><span>Mis direcciones</span><button type="button" className={x.link} onClick={() => setDev({ selectedAddr: 'new' })}>+ Agregar</button></div>
      <div className={x.list}>
        {dev.addresses.length === 0 && <div className={x.emptyBox}>Aún no tienes direcciones guardadas.</div>}
        {dev.addresses.map(a => (
          <div key={a.id} className={x.item}>
            <div style={{ flex: 1, minWidth: 0 }}><div className={x.itemMain}>{a.line}</div>{(a.apt || a.notes) && <div className={x.itemSub}>{[a.apt, a.notes].filter(Boolean).join(' · ')}</div>}</div>
            <button type="button" className={x.del} onClick={() => removeAddr(a.id)}>Eliminar</button>
          </div>
        ))}
        {formOpen && (
          <div className={x.form}>
            <input className={c.input} value={fLine} onChange={e => setLine(e.target.value)} placeholder="Dirección" aria-label="Dirección" />
            <input className={c.input} value={fApt} onChange={e => setApt(e.target.value)} placeholder="Apto / Torre (opcional)" aria-label="Apto / Torre" />
            <button type="button" className={x.saveBtn} onClick={saveAddr}>Guardar dirección</button>
          </div>
        )}
      </div>

      <div className={x.secHead} style={{ paddingTop: 18 }}>Historial de pedidos</div>
      <div className={x.list}>
        {snap.orders.length === 0 && <div className={x.emptyBox}>Aún no tienes pedidos.</div>}
        {snap.orders.map(o => (
          <div key={o.num} className={x.item}>
            <div style={{ minWidth: 0 }}><div className={x.itemMain} style={{ fontSize: 13.5 }}>{o.items}</div><div className={x.itemSub} style={{ fontSize: 11.5, color: 'var(--muted)' }}>{orderId(o.num)} · {dateShort(o.createdAt)} · {statusName(o)}</div></div>
            <div style={{ fontWeight: 600, fontSize: 13.5, flex: 'none' }}>{fmt(o.total)}</div>
          </div>
        ))}
      </div>

      <div className={x.secHead} style={{ paddingTop: 18 }}>Contacto</div>
      <div className={x.contact}>
        <a href={PHONE_TEL}>Llamar</a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
      </div>
      <div className={x.foot}>🔒 Tu cuenta está ligada a este dispositivo. Los beneficios son únicos por persona.</div>
    </div>
  )
}
