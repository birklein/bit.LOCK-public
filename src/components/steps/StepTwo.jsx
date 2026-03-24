import { useState } from 'react'
import {
  DocumentIcon,
  KeyIcon,
  ArrowPathIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'

export default function StepTwo({
  data,
  onEncrypt,
  onNewPassword,
  onRecipientChange,
  onBack,
}) {
  const [copied, setCopied] = useState(false)
  const [encrypting, setEncrypting] = useState(false)

  const handleEncrypt = async () => {
    setEncrypting(true)
    await onEncrypt()
    setEncrypting(false)
  }

  const copyPassword = async () => {
    if (!data.password) return
    await navigator.clipboard.writeText(data.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === data.password) {
          await navigator.clipboard.writeText('')
        }
      } catch {}
    }, 30000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1">
        {/* Main content */}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-charcoal tracking-tight leading-tight">
            Sicherheit konfigurieren
          </h1>
          <p className="mt-1.5 text-charcoal/40 text-[11px]">
            Schritt 2 von 3
          </p>

          {/* Datei-Karte */}
          <div className="mt-8 bg-surface-low rounded-xl p-3.5 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <DocumentIcon className="w-4 h-4 text-amber-600/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-charcoal truncate">{data.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-medium tracking-wider uppercase text-charcoal/35">PDF-Dokument</span>
                  <span className="text-charcoal/15">·</span>
                  <span className="text-[9px] text-charcoal/35">AES-256-GCM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Passwort */}
          <div className="mt-3 bg-amber-500/10 rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700/50 mb-2.5">
              Generiertes Master-Passwort
            </p>

            <div
              onClick={copyPassword}
              className="group flex items-center justify-between px-4 py-4 rounded-xl bg-amber-500/10 cursor-pointer hover:bg-amber-500/15 transition-colors"
            >
              <span className="font-password text-sm tracking-wider text-charcoal">
                {data.password}
              </span>
              <ClipboardDocumentIcon className={`w-5 h-5 transition-colors ${copied ? 'text-success' : 'text-charcoal/25 group-hover:text-amber-600'}`} />
            </div>

            <button
              onClick={onNewPassword}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors ml-auto"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Neu generieren
            </button>
          </div>

          {/* Empfaenger */}
          <div className="mt-3 bg-surface-low rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <label className="block text-[11px] font-semibold text-charcoal/50 mb-1.5">
              Empfänger-E-Mail
              <span className="text-charcoal/25 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="email"
              value={data.recipient}
              onChange={(e) => onRecipientChange(e.target.value)}
              placeholder="empfaenger@beispiel.de"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all border-0"
            />
          </div>

          {/* Wichtiger Hinweis */}
          <div className="mt-3 bg-amber-50 rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-start gap-2.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-charcoal">Wichtiger Hinweis</p>
                <p className="text-[11px] text-charcoal/50 leading-relaxed mt-1">
                  bit.LOCK arbeitet nach dem Zero-Knowledge-Prinzip. Ihr Passwort wird niemals auf
                  unseren Servern gespeichert.{' '}
                  <strong className="text-charcoal/70">Bei Verlust des Passworts können Ihre Daten nicht
                  wiederhergestellt werden.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Fehler */}
          {data.error && (
            <div className="mt-4 flex items-start gap-3 bg-red-50 rounded-xl p-4 animate-fade-up">
              <ExclamationTriangleIcon className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger">Verschlüsselung fehlgeschlagen</p>
                <p className="text-xs text-danger/70 mt-1">{data.error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 pb-2 mt-auto animate-fade-up" style={{ animationDelay: '150ms' }}>
        <button
          onClick={onBack}
          className="text-[13px] font-medium text-charcoal/50 hover:text-charcoal/70 transition-colors"
        >
          Zurück
        </button>

        <div className="flex items-center gap-4">
          <p className="text-[11px] text-charcoal/25 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success/50" />
            Ende-zu-Ende verschlüsselt
          </p>
          <button
            onClick={handleEncrypt}
            disabled={encrypting}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
              encrypting
                ? 'bg-surface-high text-charcoal/40 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {encrypting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Verschlüsselt…
              </>
            ) : (
              <>
                <LockClosedIcon className="w-4 h-4" />
                Jetzt verschlüsseln
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
