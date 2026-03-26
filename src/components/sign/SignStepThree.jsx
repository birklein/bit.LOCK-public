import { useState } from 'react'
import { save } from '@tauri-apps/plugin-dialog'
import { api } from '../../api'
import {
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  UsersIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function SignStepThree({ data, onReset }) {
  const { result } = data
  const [savedPath, setSavedPath] = useState(null)
  const isPending = result?.status === 'PENDING'

  const handleSaveAs = async () => {
    if (!result?.signedPath) return
    const fileName = data.fileName?.replace(/\.pdf$/i, '_signiert.pdf') || 'signiert.pdf'
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (!path) return
    await api.bitsignSaveSigned({ tempPath: result.signedPath, savePath: path })
    setSavedPath(path)
  }

  const handleSendMail = () => {
    const filePath = savedPath || result?.signedPath
    if (!filePath) return
    const fileName = filePath.split(/[\\/]/).pop() || 'signiert.pdf'
    api.openPdfMail({ recipient: '', filePath, fileName })
  }

  const handleOpenInBitSign = async () => {
    if (!result?.documentId || !result?.apiUrl) return
    const url = `${result.apiUrl}/dokumente/${result.documentId}`
    await api.openUrl(url)
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
          <ClockIcon className="w-8 h-8 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal tracking-tight">
          Signierung läuft
        </h1>
        <p className="mt-3 text-charcoal/40 text-[13px] leading-relaxed">
          Das Dokument wird von bit.SIGN verarbeitet. Sie können den Status
          in bit.SIGN verfolgen oder später zurückkehren.
        </p>
        <div className="mt-8 space-y-3 w-full">
          <button
            onClick={handleOpenInBitSign}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-golden transition-all duration-200"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            In bit.SIGN öffnen
          </button>
          <button
            onClick={onReset}
            className="w-full py-2.5 text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
          >
            Weiteres Dokument signieren
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 animate-scale-in">
            <CheckCircleIcon className="w-8 h-8 text-success" />
          </div>

          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-[1.1] animate-fade-up">
            Erfolgreich<br />signiert!
          </h1>
          <p className="mt-3 text-charcoal/40 text-[13px] leading-relaxed max-w-md animate-fade-up">
            Ihr Dokument wurde digital signiert. Speichern Sie die
            rechtsgültig signierte Kopie an einem sicheren Ort.
          </p>

          {/* Signatur-Details */}
          <div className="mt-10 bg-amber-500/10 rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheckIcon className="w-4 h-4 text-amber-600" />
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700">
                Signatur-Details
              </span>
            </div>
            <div className="space-y-2">
              <DetailRow label="Zertifikat" value={result?.certificate || 'birklein IT GmbH'} />
              <DetailRow label="Dokument-ID" value={result?.documentId || '\u2014'} />
              <DetailRow
                label="Zeitstempel"
                value={result?.timestamp ? new Date(result.timestamp).toLocaleString('de-DE') : '\u2014'}
              />
            </div>
          </div>

          {/* Primäre Aktionen */}
          <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <button
              onClick={handleSaveAs}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowDownTrayIcon className="w-4.5 h-4.5 text-white/80" />
              <span className="text-xs font-semibold">
                {savedPath ? 'Erneut speichern' : 'Signierte PDF speichern'}
              </span>
            </button>
            <button
              onClick={handleSendMail}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 transition-all duration-200"
            >
              <EnvelopeIcon className="w-4.5 h-4.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Per Mail versenden</span>
            </button>
          </div>

          {savedPath && (
            <div className="mt-2 flex items-center gap-2 animate-fade-up">
              <CheckCircleIcon className="w-3.5 h-3.5 text-success" />
              <p className="text-[10px] text-success">
                Gespeichert: {savedPath.split(/[\\/]/).pop()}
              </p>
              <button
                onClick={() => api.showInFolder(savedPath)}
                className="text-[10px] text-amber-600 hover:text-amber-700 underline ml-1"
              >
                Im Ordner anzeigen
              </button>
            </div>
          )}

          <p className="mt-2 text-[10px] text-charcoal/30 animate-fade-up" style={{ animationDelay: '130ms' }}>
            Hinweis: Unter macOS und Outlook muss der Anhang manuell zur E-Mail hinzugefügt werden.
          </p>

          {/* Weitere Signaturen anfordern */}
          <div className="mt-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="bg-surface-low rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <UsersIcon className="w-4 h-4 text-charcoal/30" />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/40">
                  Weitere Unterschriften benötigt?
                </span>
              </div>
              <p className="text-xs text-charcoal/40 leading-relaxed mb-3">
                Fordern Sie über bit.SIGN weitere Signaturteilnehmer an —
                z.B. Geschäftsführer, Vertragspartner oder Genehmiger.
              </p>
              <button
                onClick={handleOpenInBitSign}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-mid/50 transition-colors text-xs font-medium text-charcoal/50 hover:text-charcoal/70"
              >
                <UsersIcon className="w-3.5 h-3.5" />
                In bit.SIGN öffnen und Teilnehmer einladen
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-60 shrink-0">
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors group animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <FingerPrintIcon className="w-5 h-5 text-amber-600/60" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-charcoal">Weiteres Dokument?</p>
              <p className="text-xs text-charcoal/40">Neue Signatur starten</p>
            </div>
          </button>

          <p className="mt-4 px-2 text-[10px] text-charcoal/20 leading-relaxed animate-fade-up" style={{ animationDelay: '170ms' }}>
            Die signierte Kopie ist schreibgeschützt und kann nicht verändert werden.
          </p>
        </aside>
      </div>

      <div className="flex items-center gap-6 text-xs pt-6 pb-2 mt-auto animate-fade-up" style={{ animationDelay: '180ms' }}>
        <button onClick={onReset} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] text-charcoal/40 shrink-0">{label}</span>
      <span className="text-[11px] text-charcoal font-medium text-right truncate">{value}</span>
    </div>
  )
}
