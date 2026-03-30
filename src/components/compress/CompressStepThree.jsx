import { api } from '../../api'
import {
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
  ArrowsPointingInIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CompressStepThree({ data, onReset, onGoToEncrypt }) {
  const { result, outputPath } = data

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          {/* Success */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 animate-scale-in">
            <CheckCircleIcon className="w-8 h-8 text-success" />
          </div>

          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-[1.1] animate-fade-up">
            Erfolgreich
            <br />
            komprimiert!
          </h1>

          {/* Vorher/Nachher */}
          <div className="mt-10 bg-amber-500/10 rounded-2xl p-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700/50 mb-1">Vorher</p>
                <p className="text-lg font-bold text-charcoal/40 line-through">
                  {formatSize(result?.originalSize || 0)}
                </p>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-charcoal/20" />
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700/50 mb-1">Nachher</p>
                <p className="text-lg font-bold text-charcoal">{formatSize(result?.compressedSize || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">−{result?.savingsPercent || 0}%</p>
                <p className="text-[10px] text-charcoal/35">gespart</p>
              </div>
            </div>
          </div>

          {/* Aktions-Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <button
              onClick={() => api.showInFolder(outputPath)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowTopRightOnSquareIcon className="w-4.5 h-4.5 text-white/80" />
              <span className="text-xs font-semibold">Datei anzeigen</span>
            </button>
            <button
              onClick={onGoToEncrypt}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 transition-all duration-200"
            >
              <LockClosedIcon className="w-4.5 h-4.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Jetzt verschlüsseln</span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-60 shrink-0">
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors group animate-fade-up"
            style={{ animationDelay: '150ms' }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <ArrowsPointingInIcon className="w-5 h-5 text-amber-600/60" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-charcoal">Weitere Datei?</p>
              <p className="text-xs text-charcoal/40">Neue Komprimierung starten</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-charcoal/25 group-hover:text-amber-600 transition-colors" />
          </button>
        </aside>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-6 text-xs pt-6 pb-2 mt-auto animate-fade-up"
        style={{ animationDelay: '150ms' }}
      >
        <button onClick={onReset} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  )
}
