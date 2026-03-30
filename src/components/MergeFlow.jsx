import { useState, useCallback } from 'react'
import { api } from '../api'
import {
  PlusIcon,
  DocumentIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  PrinterIcon,
  LockClosedIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MergeFlow({ onGoToEncrypt, onGoToCompress }) {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([]) // [{ path, name }]
  const [merging, setMerging] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAddFiles = async () => {
    const paths = await api.selectMultiplePdfs()
    if (paths.length === 0) return
    const newFiles = paths.map((p) => ({
      path: p,
      name: p.split(/[\\/]/).pop(),
    }))
    setFiles((f) => [...f, ...newFiles])
  }

  const handleRemove = (idx) => {
    setFiles((f) => f.filter((_, i) => i !== idx))
  }

  const handleMoveUp = (idx) => {
    if (idx === 0) return
    setFiles((f) => {
      const arr = [...f]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
  }

  const handleMoveDown = (idx) => {
    setFiles((f) => {
      if (idx >= f.length - 1) return f
      const arr = [...f]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  const handleMerge = async () => {
    const names = files.map((f) => f.name.replace(/\.pdf$/i, ''))
    const suggested =
      names.length <= 3 ? names.join('_') + '.pdf' : names[0] + '_und_' + (names.length - 1) + '_weitere.pdf'
    const savePath = await api.selectMergeSavePath(suggested)
    if (!savePath) return
    setMerging(true)
    setError(null)
    try {
      const res = await api.mergePdfs({
        inputPaths: files.map((f) => f.path),
        outputPath: savePath,
      })
      setResult(res)
      setStep(2)
    } catch (err) {
      setError(String(err))
    }
    setMerging(false)
  }

  const handleReset = useCallback(() => {
    setStep(1)
    setFiles([])
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="h-full flex flex-col px-16 pt-10 pb-8 max-w-5xl">
      <div className="shrink-0">
        <div className="flex gap-2 mb-2">
          <div className={`h-1 flex-1 rounded-full bg-amber-500`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-amber-500' : 'bg-surface-high'}`} />
        </div>
        <p className="text-xs text-charcoal/40 font-medium">
          Schritt {step} von 2: {step === 1 ? 'Dateien auswählen' : 'Fertig'}
        </p>
      </div>

      <div className="flex-1 pt-12 min-h-0 animate-fade-up">
        {step === 1 ? (
          <StepSelect
            files={files}
            onAdd={handleAddFiles}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onMerge={handleMerge}
            merging={merging}
            error={error}
          />
        ) : (
          <StepDone
            result={result}
            onReset={handleReset}
            onGoToEncrypt={onGoToEncrypt}
            onGoToCompress={onGoToCompress}
          />
        )}
      </div>
    </div>
  )
}

function StepSelect({ files, onAdd, onRemove, onMoveUp, onMoveDown, onMerge, merging, error }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-tight">PDFs zusammenführen</h1>
          <p className="mt-3 text-charcoal/40 text-[13px]">
            Wählen Sie die Dateien aus und ordnen Sie sie in der gewünschten Reihenfolge.
          </p>

          {/* File list */}
          <div className="mt-10 space-y-2 animate-fade-up">
            {files.map((file, idx) => (
              <div key={`${file.path}-${idx}`} className="flex items-center gap-3 bg-surface-low rounded-xl px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                  {idx + 1}
                </span>
                <DocumentIcon className="w-4 h-4 text-charcoal/25 shrink-0" />
                <span className="text-xs font-medium text-charcoal truncate flex-1">{file.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onMoveUp(idx)}
                    className="p-1 text-charcoal/20 hover:text-charcoal/50 transition-colors"
                  >
                    <ChevronUpIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMoveDown(idx)}
                    className="p-1 text-charcoal/20 hover:text-charcoal/50 transition-colors"
                  >
                    <ChevronDownIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(idx)}
                    className="p-1 text-charcoal/20 hover:text-danger transition-colors ml-1"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-charcoal/10 hover:border-amber-500/30 hover:bg-surface-low transition-all text-xs font-medium text-charcoal/40 hover:text-charcoal/60"
            >
              <PlusIcon className="w-4 h-4" />
              {files.length === 0 ? 'PDF-Dateien auswählen' : 'Weitere Dateien hinzufügen'}
            </button>
          </div>

          {error && <div className="mt-4 bg-red-50 rounded-xl p-4 text-xs text-danger animate-fade-up">{error}</div>}
        </div>

        <aside className="w-60 shrink-0">
          <div className="bg-surface-low rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <DocumentDuplicateIcon className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-700">Info</span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/60 mb-1.5">
                  Reihenfolge
                </h4>
                <p className="text-xs text-charcoal/50 leading-relaxed">
                  Die Dateien werden in der angezeigten Reihenfolge zusammengeführt. Nutzen Sie die Pfeile zum
                  Sortieren.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.12em] uppercase text-charcoal/60 mb-1.5">Danach</h4>
                <p className="text-xs text-charcoal/50 leading-relaxed">
                  Nach dem Zusammenführen können Sie das Ergebnis drucken, komprimieren oder verschlüsseln.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between pt-6 pb-2 mt-auto animate-fade-up">
        <span className="text-[11px] text-charcoal/30">
          {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} ausgewählt
        </span>
        <button
          onClick={onMerge}
          disabled={files.length < 2 || merging}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            files.length >= 2 && !merging
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-surface-high text-charcoal/30 cursor-not-allowed'
          }`}
        >
          {merging ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Wird zusammengeführt…
            </>
          ) : (
            <>
              <DocumentDuplicateIcon className="w-4 h-4" />
              Jetzt zusammenführen
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function StepDone({ result, onReset, onGoToEncrypt, onGoToCompress }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 animate-scale-in">
            <CheckCircleIcon className="w-8 h-8 text-success" />
          </div>

          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-[1.1] animate-fade-up">
            Erfolgreich
            <br />
            zusammengeführt!
          </h1>

          <div className="mt-10 bg-amber-500/10 rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-700/50 mb-1">Ergebnis</p>
                <p className="text-lg font-bold text-charcoal">{result?.pageCount} Seiten</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-charcoal">{formatSize(result?.fileSize || 0)}</p>
              </div>
            </div>
          </div>

          {/* Aktionen */}
          <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <button
              onClick={() => result?.outputPath && api.showInFolder(result.outputPath)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowTopRightOnSquareIcon className="w-4.5 h-4.5 text-white/80" />
              <span className="text-xs font-semibold">Datei anzeigen</span>
            </button>
            <button
              onClick={() => result?.outputPath && api.printPdf(result.outputPath)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 transition-all duration-200"
            >
              <PrinterIcon className="w-4.5 h-4.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Drucken</span>
            </button>
          </div>

          {/* Weiterverarbeitung */}
          <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <button
              onClick={() =>
                onGoToEncrypt &&
                result?.outputPath &&
                onGoToEncrypt(result.outputPath, result.outputPath.split(/[\\/]/).pop())
              }
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-low hover:bg-surface-mid/50 transition-colors"
            >
              <LockClosedIcon className="w-4 h-4 text-charcoal/30" />
              <span className="text-xs font-medium text-charcoal/50">Verschlüsseln</span>
            </button>
            <button
              onClick={() =>
                onGoToCompress &&
                result?.outputPath &&
                onGoToCompress(result.outputPath, result.outputPath.split(/[\\/]/).pop())
              }
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-low hover:bg-surface-mid/50 transition-colors"
            >
              <ArrowsPointingInIcon className="w-4 h-4 text-charcoal/30" />
              <span className="text-xs font-medium text-charcoal/50">Komprimieren</span>
            </button>
          </div>
        </div>

        <aside className="w-60 shrink-0">
          <button
            onClick={onReset}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors group animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <DocumentDuplicateIcon className="w-5 h-5 text-amber-600/60" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-charcoal">Weitere Dateien?</p>
              <p className="text-xs text-charcoal/40">Neues Zusammenführen</p>
            </div>
          </button>
        </aside>
      </div>

      <div
        className="flex items-center gap-6 text-xs pt-6 pb-2 mt-auto animate-fade-up"
        style={{ animationDelay: '180ms' }}
      >
        <button onClick={onReset} className="text-charcoal/40 hover:text-charcoal/60 transition-colors">
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  )
}
