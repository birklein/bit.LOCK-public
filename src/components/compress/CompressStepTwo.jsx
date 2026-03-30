import { useState } from 'react'
import { DocumentIcon, ArrowPathIcon, ArrowsPointingInIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const PRESETS = [
  { id: 'email', label: 'E-Mail', desc: 'Maximale Kompression', hint: '150 dpi · Q65' },
  { id: 'standard', label: 'Standard', desc: 'Balance aus Qualität und Größe', hint: '200 dpi · Q78' },
  { id: 'print', label: 'Druckqualität', desc: 'Minimale Kompression', hint: '250 dpi · Q88' },
]

export default function CompressStepTwo({ data, onCompress, onBack }) {
  const [quality, setQuality] = useState('standard')
  const [compressing, setCompressing] = useState(false)

  const { analysis, fileName, error } = data

  const estimatedSize = analysis
    ? quality === 'email'
      ? analysis.estimatedEmail
      : quality === 'print'
        ? analysis.estimatedPrint
        : analysis.estimatedStandard
    : 0

  const savingsPercent = analysis ? Math.round((1 - estimatedSize / analysis.fileSize) * 100) : 0

  const handleCompress = async () => {
    setCompressing(true)
    await onCompress(quality)
    setCompressing(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-tight">Komprimierung wählen</h1>
          <p className="mt-2 text-charcoal/40 text-[13px]">Schritt 2 von 3</p>

          {/* Datei-Info */}
          <div className="mt-8 bg-surface-low rounded-xl p-3.5 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <DocumentIcon className="w-4 h-4 text-amber-600/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-charcoal truncate">{fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-charcoal/35">{formatSize(analysis?.fileSize || 0)}</span>
                  <span className="text-charcoal/15">·</span>
                  <span className="text-[9px] text-charcoal/35">{analysis?.imageCount || 0} Bilder</span>
                  <span className="text-charcoal/15">·</span>
                  <span className="text-[9px] text-charcoal/35">
                    {analysis?.fontCount || 0} Fonts ({formatSize(analysis?.fontBytes || 0)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vorschau */}
          <div className="mt-4 bg-amber-500/10 rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700/50 mb-1">
                  Voraussichtliche Größe
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-charcoal">{formatSize(estimatedSize)}</span>
                  <span className="text-xs text-charcoal/30 line-through">{formatSize(analysis?.fileSize || 0)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600">−{savingsPercent}%</p>
                <p className="text-[10px] text-charcoal/35">geschätzte Ersparnis</p>
              </div>
            </div>
          </div>

          {/* Qualitätsstufen */}
          <div className="mt-4 space-y-2 animate-fade-up" style={{ animationDelay: '80ms' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setQuality(preset.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-150 ${
                  quality === preset.id
                    ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                    : 'bg-surface-low hover:bg-surface-mid/50'
                }`}
              >
                <div className="text-left">
                  <p className={`text-xs font-semibold ${quality === preset.id ? 'text-amber-700' : 'text-charcoal'}`}>
                    {preset.label}
                  </p>
                  <p className="text-[10px] text-charcoal/40 mt-0.5">{preset.desc}</p>
                </div>
                <span className="text-[9px] text-charcoal/30 font-medium">{preset.hint}</span>
              </button>
            ))}
          </div>

          {analysis?.imageCount === 0 && (
            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 rounded-xl p-4 animate-fade-up">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-charcoal">Kaum Komprimierung möglich</p>
                <p className="text-[11px] text-charcoal/50 mt-1">
                  Dieses PDF enthält keine eingebetteten Bilder. Nur Bilder lassen sich signifikant verkleinern — bei
                  reinen Text-PDFs ist die Ersparnis minimal (1–3%).
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-3 bg-red-50 rounded-xl p-4 animate-fade-up">
              <ExclamationTriangleIcon className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-danger">Komprimierung fehlgeschlagen</p>
                <p className="text-[11px] text-danger/70 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-6 pb-2 mt-auto animate-fade-up"
        style={{ animationDelay: '100ms' }}
      >
        <button
          onClick={onBack}
          className="text-[13px] font-medium text-charcoal/50 hover:text-charcoal/70 transition-colors"
        >
          Zurück
        </button>
        <button
          onClick={handleCompress}
          disabled={compressing}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            compressing
              ? 'bg-surface-high text-charcoal/40 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {compressing ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Komprimiert…
            </>
          ) : (
            <>
              <ArrowsPointingInIcon className="w-4 h-4" />
              Jetzt komprimieren
            </>
          )}
        </button>
      </div>
    </div>
  )
}
