import { useRef, useState, useEffect, useCallback } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'

export default function SignatureCanvas({ onSignature, width = 500, height = 180 }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

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
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }, [getPos])

  const draw = useCallback((e) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasContent(true)
  }, [drawing, getPos])

  const stopDraw = useCallback(() => {
    setDrawing(false)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasContent(false)
    onSignature?.(null)
  }, [width, height, onSignature])

  const exportPng = useCallback(() => {
    if (!hasContent) return null
    const canvas = canvasRef.current
    return canvas.toDataURL('image/png')
  }, [hasContent])

  // Expose export to parent
  useEffect(() => {
    onSignature?.(hasContent ? exportPng : null)
  }, [hasContent, exportPng, onSignature])

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-charcoal/10">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
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
            <p className="text-charcoal/20 text-sm">Hier unterschreiben</p>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-[10px] text-charcoal/30">
          Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Touchpad
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
