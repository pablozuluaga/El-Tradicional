import { useState } from 'react'
import { BANK_ACCOUNT, BANK_ACCOUNT_LABEL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config.ts'
import { fmt } from '../domain/format.ts'
import { WhatsAppIcon } from '../ui/ui.tsx'
import t from './TransferBox.module.css'

/** Bancolombia account for paying by transfer, and the WhatsApp chat where the receipt goes. */
export function TransferBox({ total, orderLabel }: { total: number; orderLabel?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(BANK_ACCOUNT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }, () => {})
  }
  const text = `Hola, te envío el comprobante de pago${orderLabel ? ' del pedido ' + orderLabel : ''} por ${fmt(total)}.`
  return (
    <div className={t.box} role="region" aria-label="Pago por transferencia">
      <div className={t.head}>🏦 Pago por transferencia</div>
      <div className={t.account}>
        <div>
          <div className={t.number}>{BANK_ACCOUNT}</div>
          <div className={t.kind}>{BANK_ACCOUNT_LABEL}</div>
        </div>
        <button type="button" className={t.copy} onClick={copy}>{copied ? '¡Copiado!' : 'Copiar'}</button>
      </div>
      <div className={t.text}>
        Transfiere el total (<b>{fmt(total)}</b>) a este número de cuenta y envía el comprobante de pago al WhatsApp para hacer tu orden.
      </div>
      <a className={t.wa} href={`${WHATSAPP_URL}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon size={22} />
        <span>Enviar comprobante<small>{WHATSAPP_DISPLAY}</small></span>
      </a>
    </div>
  )
}
