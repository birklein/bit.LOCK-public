import { useRef, useCallback, useEffect } from 'react'

const MIN_WIDTH = 60

export default function SignatureOverlay({
  signatureDataUrl,
  containerWidth,
  containerHeight,
  position,
  onPositionChange,
}) {
  const modeRef = useRef('idle') // 'idle' | 'dragging' | 'resizing'
  const startRef = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 })
  const aspectRef = useRef(1)

  // Calculate aspect ratio from signature image
  useEffect(() => {
    if (!signatureDataUrl) return
    const img = new Image()
    img.onload = () => {
      aspectRef.current = img.width / img.height
    }
    img.src = signatureDataUrl
  }, [signatureDataUrl])

  const clamp = useCallback(
    (pos) => {
      return {
        x: Math.max(0, Math.min(pos.x, containerWidth - pos.w)),
        y: Math.max(0, Math.min(pos.y, containerHeight - pos.h)),
        w: Math.max(MIN_WIDTH, Math.min(pos.w, containerWidth)),
        h: Math.max(MIN_WIDTH / aspectRef.current, Math.min(pos.h, containerHeight)),
      }
    },
    [containerWidth, containerHeight],
  )

  const onMouseMove = useCallback(
    (e) => {
      if (modeRef.current === 'idle') return
      const s = startRef.current
      const dx = e.clientX - s.mx
      const dy = e.clientY - s.my

      if (modeRef.current === 'dragging') {
        onPositionChange(clamp({ x: s.x + dx, y: s.y + dy, w: s.w, h: s.h }))
      } else if (modeRef.current === 'resizing') {
        const newW = Math.max(MIN_WIDTH, s.w + dx)
        const newH = newW / aspectRef.current
        onPositionChange(clamp({ x: s.x, y: s.y, w: newW, h: newH }))
      }
    },
    [clamp, onPositionChange],
  )

  const onMouseUp = useCallback(() => {
    modeRef.current = 'idle'
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const startDrag = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      modeRef.current = 'dragging'
      startRef.current = { mx: e.clientX, my: e.clientY, ...position }
    },
    [position],
  )

  const startResize = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      modeRef.current = 'resizing'
      startRef.current = { mx: e.clientX, my: e.clientY, ...position }
    },
    [position],
  )

  if (!signatureDataUrl || !position) return null

  return (
    <div
      className="absolute ring-2 ring-amber-500/60 rounded bg-white/30 backdrop-blur-[1px] shadow-lg cursor-move select-none"
      style={{
        left: position.x,
        top: position.y,
        width: position.w,
        height: position.h,
      }}
      onMouseDown={startDrag}
    >
      <img
        src={signatureDataUrl}
        alt="Signatur"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 rounded-tl cursor-se-resize"
        onMouseDown={startResize}
      />
    </div>
  )
}
