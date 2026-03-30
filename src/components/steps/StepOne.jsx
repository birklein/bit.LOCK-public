import { useEffect, useState } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { api } from '../../api'
import {
  PlusIcon,
  DocumentIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export default function StepOne({ onFileSelected }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selected, setSelected] = useState(null) // { path, name }

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
    return () => {
      unlisten.then((f) => f())
    }
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

  const handleCancel = () => {
    setSelected(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-tight">Datei auswählen</h1>
          <p className="mt-3 text-charcoal/40 text-[13px]">Schritt 1: Bereiten Sie Ihre Daten für den Tresor vor.</p>

          {/* Drop Zone */}
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
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isDragOver ? 'bg-amber-500 shadow-golden scale-110' : 'bg-amber-50'
                  }`}
                >
                  <PlusIcon className={`w-7 h-7 ${isDragOver ? 'text-white' : 'text-amber-500'}`} />
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-charcoal/70">
                    {isDragOver ? 'PDF hier ablegen' : 'Datei hierher ziehen oder klicken Sie zum Durchsuchen'}
                  </p>
                  <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-charcoal/30 mt-2">
                    Unterstützte Formate: PDF-Dateitypen
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar — Tipp */}
        <aside className="w-60 shrink-0">
          <div className="bg-surface-low rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <InformationCircleIcon className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-700">Tipp</span>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/60 mb-1.5">
                  Drag-and-Drop
                </h4>
                <p className="text-xs text-charcoal/50 leading-relaxed">
                  Sie können eine PDF-Datei direkt in das Upload-Feld ziehen. bit.PDF verarbeitet diese lokal auf Ihrem
                  Gerät.
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/60 mb-1.5">
                  Datenschutz
                </h4>
                <p className="text-xs text-charcoal/50 leading-relaxed">
                  Ihre Dateien verlassen niemals Ihr Gerät. Die Vorbereitung findet ausschließlich in Ihrem gesicherten
                  lokalen Speicher statt.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 bg-surface rounded-xl p-3">
              <CheckCircleIcon className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <p className="text-xs text-charcoal/50 leading-relaxed">
                Ende-zu-Ende Verschlüsselung nach AES-256 Standard.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 pb-2 mt-auto animate-fade-up">
        <button
          onClick={handleCancel}
          className={`text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors ${!selected ? 'invisible' : ''}`}
        >
          Abbrechen
        </button>
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
