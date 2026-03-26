import { useRef, useState, useEffect, useCallback } from 'react'
import { TrashIcon, PencilIcon, LanguageIcon } from '@heroicons/react/24/outline'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap'

export default function SignatureCanvas({ onChange, width = 500, height = 180 }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [mode, setMode] = useState('draw') // 'draw' | 'type'
  const [typedName, setTypedName] = useState('')
  const [fontLoaded, setFontLoaded] = useState(false)
  const strokeCountRef = useRef(0)

  // Load Caveat font
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_URL}"]`)) {
      setFontLoaded(true)
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_URL
    link.onload = () => setTimeout(() => setFontLoaded(true), 100)
    document.head.appendChild(link)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

  useEffect(() => { clearCanvas() }, [clearCanvas])

  const emitDataUrl = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange?.(canvas.toDataURL('image/png'))
  }, [onChange])

  // Render typed name on canvas
  useEffect(() => {
    if (mode !== 'type' || !fontLoaded) return
    clearCanvas()
    if (!typedName.trim()) {
      setHasContent(false)
      onChange?.(null)
      return
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1a1a1a'
    ctx.font = '700 56px Caveat'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, width / 2, height / 2)
    setHasContent(true)
    emitDataUrl()
  }, [typedName, mode, fontLoaded, width, height, clearCanvas, onChange, emitDataUrl])

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDraw = useCallback((e) => {
    if (mode !== 'draw') return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }, [getPos, mode])

  const draw = useCallback((e) => {
    if (!drawing || mode !== 'draw') return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    if (!hasContent) setHasContent(true)
  }, [drawing, getPos, mode, hasContent])

  const stopDraw = useCallback(() => {
    if (drawing) {
      setDrawing(false)
      strokeCountRef.current += 1
      emitDataUrl()
    }
  }, [drawing, emitDataUrl])

  const clear = useCallback(() => {
    clearCanvas()
    setHasContent(false)
    setTypedName('')
    strokeCountRef.current = 0
    onChange?.(null)
  }, [clearCanvas, onChange])

  const switchMode = useCallback((newMode) => {
    clear()
    setMode(newMode)
  }, [clear])

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => switchMode('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            mode === 'draw'
              ? 'bg-amber-500/15 text-amber-700'
              : 'text-charcoal/40 hover:text-charcoal/60'
          }`}
        >
          <PencilIcon className="w-3 h-3" />
          Zeichnen
        </button>
        <button
          onClick={() => switchMode('type')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            mode === 'type'
              ? 'bg-amber-500/15 text-amber-700'
              : 'text-charcoal/40 hover:text-charcoal/60'
          }`}
        >
          <LanguageIcon className="w-3 h-3" />
          Tippen
        </button>
      </div>

      {/* Type input */}
      {mode === 'type' && (
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Ihren Namen eingeben…"
          className="w-full px-3 py-2 rounded-lg bg-surface-low text-sm text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
          autoFocus
        />
      )}

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-charcoal/10">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full touch-none ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ height: `${height * 0.6}px` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-charcoal/20 text-sm">
              {mode === 'draw' ? 'Hier unterschreiben' : 'Name oben eingeben'}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[10px] text-charcoal/30">
          {mode === 'draw'
            ? 'Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Touchpad'
            : 'Ihr Name wird in Handschrift dargestellt'}
        </p>
        {hasContent && (
          <button
            onClick={clear}
            className="flex items-center gap-1 text-[10px] text-charcoal/40 hover:text-danger transition-colors"
          >
            <TrashIcon className="w-3 h-3" />
            Löschen
          </button>
        )}
      </div>
    </div>
  )
}
