import { useState } from 'react'
import { api } from '../../api'
import {
  CheckCircleIcon,
  DocumentIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

export default function StepThree({ data, onReset, onGoToHistory }) {
  const [copied, setCopied] = useState(false)

  const copyPassword = async () => {
    await navigator.clipboard.writeText(data.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === data.password) await navigator.clipboard.writeText('')
      } catch {}
    }, 30000)
  }

  const openPdfMail = () => {
    api.openPdfMail({
      recipient: data.recipient,
      filePath: data.outputPath,
      fileName: data.fileName,
    })
  }

  const openPasswordMail = () => {
    api.openPasswordMail({
      recipient: data.recipient,
      password: data.password,
      fileName: data.fileName,
    })
  }

  return (
    <div className="flex gap-10 min-w-0">
      {/* Main content */}
      <div className="flex-1">
        {/* Success icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircleIcon className="w-8 h-8 text-success" />
        </div>

        <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-[1.1] animate-fade-up">
          Erfolgreich
          <br />
          verschlüsselt!
        </h1>
        <p className="mt-3 text-charcoal/50 text-[13px] leading-relaxed max-w-md animate-fade-up">
          Deine Datei wurde sicher verpackt und ist nun bereit für den Versand. Du kannst jetzt die Datei teilen und das
          Passwort separat übermitteln.
        </p>

        {/* Ergebnis-Karten */}
        <div className="mt-12 grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {/* Datei-Karte */}
          <div className="bg-surface-low rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <DocumentIcon className="w-5 h-5 text-amber-600/60" />
            </div>
            <h3 className="text-sm font-bold text-charcoal">Die Datei</h3>
            <p className="text-xs text-charcoal/40 mt-1 truncate">
              {data.fileName?.replace(/\.pdf$/i, '') + '_verschluesselt.pdf'}
            </p>
            <button
              onClick={() => api.showInFolder(data.outputPath)}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              Datei öffnen
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Passwort-Karte */}
          <div className="bg-surface-low rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <KeyIcon className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-charcoal">Das Passwort</h3>
            <p className="font-password text-xs text-charcoal/40 mt-1 tracking-wider">•••• •••• •••• ••••</p>
            <button
              onClick={copyPassword}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              {copied ? 'Kopiert!' : 'Passwort kopieren'}
              <ClipboardDocumentIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Aktions-Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <button
            onClick={openPdfMail}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <EnvelopeIcon className="w-4.5 h-4.5 text-white/80" />
            <span className="text-xs font-semibold">PDF per Mail senden</span>
          </button>
          <button
            onClick={openPasswordMail}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 transition-all duration-200"
          >
            <KeyIcon className="w-4.5 h-4.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Passwort per Mail senden</span>
          </button>
        </div>

        <p
          className="mt-2 text-[10px] text-charcoal/30 leading-relaxed animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          Hinweis: Unter macOS und Outlook muss der Anhang manuell zur E-Mail hinzugefügt werden.
        </p>

        {/* Footer-Links */}
        <div className="mt-10 flex items-center gap-6 text-xs animate-fade-up" style={{ animationDelay: '200ms' }}>
          <button onClick={onReset} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
            Zurück zur Übersicht
          </button>
          <button onClick={onGoToHistory} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
            Verlauf ansehen
          </button>
          <div className="flex-1" />
          <button onClick={onReset} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
            Schließen
          </button>
        </div>
      </div>

      {/* Sicherheitstipp */}
      <aside className="w-60 shrink-0">
        <div className="bg-surface-low rounded-2xl p-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-700">Sicherheitstipp</span>
          </div>

          <h3 className="text-sm font-bold text-charcoal mb-2">Zwei-Kanal-Methode</h3>
          <p className="text-xs text-charcoal/50 leading-relaxed italic">
            "Sende die PDF per Mail und das Passwort über einen anderen Weg, z.B. Signal oder SMS."
          </p>

          <div className="mt-5 space-y-3">
            <InfoItem num="1" text="E-Mail für die verschlüsselte Datei nutzen." />
            <InfoItem num="2" text="Messenger oder Anruf für das Passwort wählen." />
          </div>
        </div>

        {/* Nochmal verschluesseln */}
        <button
          onClick={onReset}
          className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors group animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <SparklesIcon className="w-5 h-5 text-amber-600/60" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-charcoal">Noch etwas verschlüsseln?</p>
            <p className="text-xs text-charcoal/40">Starte einen neuen Vorgang</p>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-charcoal/25 group-hover:text-amber-600 transition-colors" />
        </button>
      </aside>
    </div>
  )
}

function InfoItem({ num, text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-surface-mid flex items-center justify-center text-xs font-semibold text-charcoal/50 shrink-0">
        {num}
      </span>
      <p className="text-xs text-charcoal/45 leading-relaxed pt-0.5">{text}</p>
    </div>
  )
}
