import { useState, useEffect, useRef, useCallback } from 'react'
import SignatureCanvas from './SignatureCanvas'
import {
  DocumentIcon,
  FingerPrintIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

const REASONS = [
  { id: 'approved', label: 'Genehmigt' },
  { id: 'reviewed', label: 'Zur Kenntnis genommen' },
  { id: 'released', label: 'Freigegeben' },
  { id: 'custom', label: 'Eigener Text…' },
]

export default function SignStepTwo({ data, session, onSign, onBack }) {
  const [reason, setReason] = useState('approved')
  const [customReason, setCustomReason] = useState('')
  const [signing, setSigning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [signatureFn, setSignatureFn] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (signing) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [signing])

  const effectiveReason = reason === 'custom'
    ? customReason
    : REASONS.find((r) => r.id === reason)?.label || ''

  const handleSignatureChange = useCallback((exportFn) => {
    setSignatureFn(() => exportFn)
  }, [])

  const handleSign = async () => {
    if (!signatureFn) return
    const dataUrl = signatureFn()
    if (!dataUrl) return

    setSigning(true)
    // Convert data URL to byte array
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    await onSign(effectiveReason, Array.from(bytes))
    setSigning(false)
  }

  const canSign = signatureFn && (reason !== 'custom' || customReason.trim())

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-10 flex-1">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-charcoal tracking-tight leading-tight">
            Signatur konfigurieren
          </h1>
          <p className="mt-2 text-charcoal/40 text-[13px]">Schritt 2 von 3</p>

          {/* Datei-Info */}
          <div className="mt-6 bg-surface-low rounded-xl p-3.5 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <DocumentIcon className="w-4 h-4 text-amber-600/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-charcoal truncate">{data.fileName}</p>
                <p className="text-[9px] text-charcoal/35 mt-0.5">Wird digital signiert</p>
              </div>
            </div>
          </div>

          {/* Unterschrift zeichnen */}
          <div className="mt-4 animate-fade-up" style={{ animationDelay: '30ms' }}>
            <label className="block text-[11px] font-semibold text-charcoal/50 mb-2">
              Ihre Unterschrift
            </label>
            <SignatureCanvas onSignature={handleSignatureChange} />
          </div>

          {/* Signatur-Grund */}
          <div className="mt-4 bg-surface-low rounded-2xl p-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <label className="block text-[11px] font-semibold text-charcoal/50 mb-2">
              Grund der Signatur
            </label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                    reason === r.id
                      ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30'
                      : 'bg-surface text-charcoal/50 hover:bg-surface-mid/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reason === 'custom' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Grund eingeben…"
                className="mt-2 w-full px-3 py-2 rounded-lg bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
                autoFocus
              />
            )}
          </div>

          {/* Sicherheitshinweis */}
          <div className="mt-3 flex items-start gap-2.5 bg-amber-50 rounded-xl p-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <ShieldCheckIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-charcoal">PKCS#7-Zertifikat</p>
              <p className="text-[10px] text-charcoal/50 mt-0.5 leading-relaxed">
                Ihr PDF wird mit einem rechtsgültigen digitalen Zertifikat signiert,
                das in Adobe Reader verifizierbar ist.
              </p>
            </div>
          </div>

          {data.error && (
            <div className="mt-3 flex items-start gap-3 bg-red-50 rounded-xl p-3 animate-fade-up">
              <ExclamationTriangleIcon className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-danger">Signatur fehlgeschlagen</p>
                <p className="text-[11px] text-danger/70 mt-1">{data.error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 pb-2 mt-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
        <button onClick={onBack} className="text-[13px] font-medium text-charcoal/50 hover:text-charcoal/70 transition-colors">
          Zurück
        </button>
        <button
          onClick={handleSign}
          disabled={signing || !canSign}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            signing || !canSign
              ? 'bg-surface-high text-charcoal/40 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {signing ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Signierung läuft… {elapsed}s
            </>
          ) : (
            <>
              <FingerPrintIcon className="w-4 h-4" />
              Jetzt signieren
            </>
          )}
        </button>
      </div>
    </div>
  )
}
