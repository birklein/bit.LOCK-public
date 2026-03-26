import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../api'
import SignatureCanvas from './SignatureCanvas'
import PdfPreview from './PdfPreview'
import SignatureOverlay from './SignatureOverlay'
import {
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

const DEFAULT_SIG_WIDTH_PT = 280
const DEFAULT_SIG_HEIGHT_PT = 100

export default function SignStepTwo({ data, session, onSign, onBack }) {
  const [reason, setReason] = useState('approved')
  const [customReason, setCustomReason] = useState('')
  const [signing, setSigning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [showCaption, setShowCaption] = useState(false)
  const [captionPlace, setCaptionPlace] = useState('')
  const [captionName, setCaptionName] = useState(session?.name || '')
  const timerRef = useRef(null)

  // PDF preview state
  const [pdfBase64, setPdfBase64] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0) // 0 = not set, will default to last
  const [pdfInfo, setPdfInfo] = useState(null)
  const [overlayPos, setOverlayPos] = useState(null)

  // Load PDF for preview
  useEffect(() => {
    if (!data.inputPath) return
    api.readPdfBase64(data.inputPath).then((b64) => {
      setPdfBase64(b64)
      setPdfLoading(false)
    }).catch(() => setPdfLoading(false))
  }, [data.inputPath])

  // Initialize overlay position when pdfInfo arrives
  useEffect(() => {
    if (!pdfInfo) return
    const scale = pdfInfo.pdfScale
    const w = DEFAULT_SIG_WIDTH_PT * scale
    const h = DEFAULT_SIG_HEIGHT_PT * scale
    const containerW = 460
    const containerH = pdfInfo.pageHeight * scale
    setOverlayPos({
      x: containerW - w - 20,
      y: containerH - h - 30,
      w,
      h,
    })
  }, [pdfInfo])

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

  const handleSignatureChange = useCallback((dataUrl) => {
    setSignatureDataUrl(dataUrl)
  }, [])

  const handleSign = async () => {
    if (!signatureDataUrl) return

    setSigning(true)
    const base64 = signatureDataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // Convert overlay position from screen px to PDF points
    let position = null
    if (overlayPos && pdfInfo) {
      const scale = pdfInfo.pdfScale
      position = {
        x: overlayPos.x / scale,
        y: pdfInfo.pageHeight - (overlayPos.y + overlayPos.h) / scale,
        width: overlayPos.w / scale,
        height: overlayPos.h / scale,
        page: currentPage || -1,
      }
    }

    await onSign(effectiveReason, Array.from(bytes), position, showCaption)
    setSigning(false)
  }

  const caption = showCaption
    ? [captionPlace, new Date().toLocaleDateString('de-DE'), captionName].filter(Boolean).join(', ')
    : null

  const canSign = signatureDataUrl && (reason !== 'custom' || customReason.trim())

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: PDF Preview */}
        <div className="shrink-0 animate-fade-up">
          {pdfLoading ? (
            <div className="w-[460px] h-[600px] rounded-xl bg-surface-low flex items-center justify-center">
              <ArrowPathIcon className="w-6 h-6 text-charcoal/30 animate-spin" />
            </div>
          ) : pdfBase64 ? (
            <PdfPreview
              pdfBase64={pdfBase64}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPdfInfo={setPdfInfo}
            >
              <SignatureOverlay
                signatureDataUrl={signatureDataUrl}
                containerWidth={460}
                containerHeight={pdfInfo ? pdfInfo.pageHeight * pdfInfo.pdfScale : 600}
                position={overlayPos}
                onPositionChange={setOverlayPos}
              />
            </PdfPreview>
          ) : (
            <div className="w-[460px] h-[200px] rounded-xl bg-surface-low flex items-center justify-center">
              <p className="text-xs text-charcoal/30">PDF-Vorschau nicht verfügbar</p>
            </div>
          )}
          {signatureDataUrl && (
            <p className="text-[10px] text-charcoal/30 mt-1 text-center">
              Unterschrift per Drag & Drop positionieren
            </p>
          )}
        </div>

        {/* Right: Signature + Options */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <h1 className="text-xl font-bold text-charcoal tracking-tight leading-tight">
            Signatur konfigurieren
          </h1>
          <p className="mt-1 text-charcoal/40 text-[12px]">Schritt 2 von 3</p>

          {/* Unterschrift */}
          <div className="mt-4 animate-fade-up" style={{ animationDelay: '30ms' }}>
            <label className="block text-[11px] font-semibold text-charcoal/50 mb-2">
              Ihre Unterschrift
            </label>
            <SignatureCanvas onChange={handleSignatureChange} caption={caption} width={380} height={140} />
          </div>

          {/* Ort, Datum, Name */}
          <div className="mt-2 animate-fade-up" style={{ animationDelay: '40ms' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCaption}
                onChange={(e) => setShowCaption(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-charcoal/20 text-amber-500 focus:ring-amber-500/30"
              />
              <span className="text-[11px] text-charcoal/50">Ort, Datum und Name unter Unterschrift</span>
            </label>
            {showCaption && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={captionPlace}
                  onChange={(e) => setCaptionPlace(e.target.value)}
                  placeholder="Ort"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-low text-[11px] text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
                />
                <input
                  type="text"
                  value={captionName}
                  onChange={(e) => setCaptionName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-low text-[11px] text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
                />
              </div>
            )}
          </div>

          {/* Signatur-Grund */}
          <div className="mt-3 bg-surface-low rounded-xl p-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <label className="block text-[10px] font-semibold text-charcoal/50 mb-2">
              Grund der Signatur
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 ${
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
                className="mt-2 w-full px-3 py-1.5 rounded-lg bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
                autoFocus
              />
            )}
          </div>

          {/* Sicherheitshinweis */}
          <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-xl p-2.5 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <ShieldCheckIcon className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-charcoal/50 leading-relaxed">
              <span className="font-semibold text-charcoal">PKCS#7-Zertifikat</span> — Ihr PDF wird mit einem
              rechtsgültigen digitalen Zertifikat signiert (birklein IT GmbH).
            </p>
          </div>

          {data.error && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 rounded-xl p-2.5 animate-fade-up">
              <ExclamationTriangleIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-medium text-danger">Signatur fehlgeschlagen</p>
                <p className="text-[10px] text-danger/70 mt-0.5">{data.error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 pb-2 mt-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
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
