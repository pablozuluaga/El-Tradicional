import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { allDishes, categories } from '../../domain/menu.ts'
import { useSnapshot } from '../../data/hooks.ts'
import { TonoTip } from '../../ui/ui.tsx'
import ui from '../../ui/ui.module.css'
import { DishCard } from '../DishCard.tsx'
import { P } from '../paths.ts'
import c from '../c.module.css'
import m from './Menu.module.css'

export function Menu() {
  const nav = useNavigate()
  const s = useSnapshot().settings
  const [cat, setCat] = useState('Todos')
  const cats = categories(s)
  const active = cats.includes(cat) ? cat : 'Todos'
  const dishes = allDishes(s).filter(d => active === 'Todos' || d.cat === active)

  return (
    <div className={`${c.scroll} noscroll`}>
      {!s.storeOpen && <div className={m.closed}>Cocina cerrada · atendemos 11:30am – 4pm</div>}
      <div className={ui.eyebrowRow} style={{ paddingTop: 20 }}><span className={ui.eyebrowBar} /><span className={ui.eyebrow}>Menú de hoy</span></div>
      <div className={m.titleRow}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={m.title}>Nuestro menú</div>
          <div className={m.titleSub}>Cambia cada día según lo que se cocina</div>
        </div>
        <img className={m.logo} src="/assets/logo.jpeg" alt="El Tradicional" />
      </div>
      <TonoTip variant="menuTip" w={44} h={48} style={{ margin: '8px 22px 2px' }}>
        Toca cualquier plato para elegir tus opciones y personalizar los ingredientes a tu gusto.
      </TonoTip>
      <div className={`${m.chips} xscroll`} role="tablist">
        {cats.map(x => (
          <button key={x} type="button" role="tab" aria-selected={x === active} className={`${m.chip} ${x === active ? m.chipOn : ''}`} onClick={() => setCat(x)}>{x}</button>
        ))}
      </div>
      <div className={`${c.dishList} ${m.list}`}>
        {dishes.map(d => <DishCard key={d.id} d={d} s={s} onOpen={() => nav(P.dish(d.id))} />)}
      </div>
    </div>
  )
}
