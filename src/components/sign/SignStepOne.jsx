import { useEffect, useState } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { api } from '../../api'
import {
  PlusIcon,
  DocumentIcon,
  FingerPrintIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

export default function SignStepOne({ onFileSelected, session, onLogout }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        setIsDragOver(true)
      } else if (event.payload.type === 'drop') {
        setIsDragOver(false)
        const paths = event.payload.paths
        if (paths.length > 0 && paths[0].toLowerCase().endsWith('.pdf')) {
          const fileName = paths[0].split(/[\\/]/).pop()
          setSelected({ path: paths[0], name: fileName })
        }
      } else {
        setIsDragOver(false)
      }
    })
    return () => { unlisten.then((f) => f()) }
  }, [])

  const handleSelectPdf = async () => {
    const filePath = await api.selectPdf()
    if (!filePath) return
    const fileName = filePath.split(/[\\/]/).pop()
    setSelected({ path: filePath, name: fileName })
  }

  const handleContinue = () => {
    if (selected) onFileSelected(selected.path, selected.name)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-tight">
            Dokument signieren
          </h1>
          <p className="mt-3 text-charcoal/40 text-[13px]">
            Schritt 1: Wählen Sie das PDF für die digitale Signatur.
          </p>

          <div
            onClick={handleSelectPdf}
            className={`mt-12 relative flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200 py-16 ${
              isDragOver
                ? 'bg-amber-50 scale-[1.01] drop-zone-active'
                : selected
                  ? 'bg-surface-low'
                  : 'bg-surface-low hover:bg-surface-mid/60 border-2 border-dashed border-charcoal/10 hover:border-amber-500/30'
            }`}
          >
            {selected ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <DocumentIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal truncate max-w-xs">{selected.name}</p>
                  <p className="text-xs text-charcoal/40 mt-0.5">PDF-Dokument</p>
                </div>
              </div>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isDragOver ? 'bg-amber-500 shadow-golden scale-110' : 'bg-amber-50'
                }`}>
                  <PlusIcon className={`w-7 h-7 ${isDragOver ? 'text-white' : 'text-amber-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-charcoal/70">
                    {isDragOver ? 'PDF hier ablegen' : 'Datei hierher ziehen oder klicken'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar — Account */}
        <aside className="w-60 shrink-0">
          <div className="bg-surface-low rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FingerPrintIcon className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-700">
                Signatur
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <UserCircleIcon className="w-8 h-8 text-charcoal/20" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-charcoal truncate">{session?.name || session?.email}</p>
                <p className="text-[10px] text-charcoal/40 truncate">{session?.tenantSlug} · {session?.role}</p>
              </div>
            </div>

            <div className="space-y-2 text-[10px] text-charcoal/40">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Verbunden
              </div>
              <p className="leading-relaxed">
                Dokumente werden mit dem Zertifikat Ihres Tenants signiert.
                Nur der Hash verlässt Ihr Gerät.
              </p>
            </div>

            <button
              onClick={onLogout}
              className="mt-4 text-[10px] text-charcoal/30 hover:text-charcoal/50 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between pt-6 pb-2 mt-auto animate-fade-up">
        <div />
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            selected
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-surface-high text-charcoal/30 cursor-not-allowed'
          }`}
        >
          Weiter zu Schritt 2
        </button>
      </div>
    </div>
  )
}
