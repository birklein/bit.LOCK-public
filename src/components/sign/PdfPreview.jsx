import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const DISPLAY_WIDTH = 460

export default function PdfPreview({ pdfBase64, currentPage, onPageChange, onPdfInfo, children }) {
  const canvasRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: DISPLAY_WIDTH, height: 650 })

  // Load PDF document
  useEffect(() => {
    if (!pdfBase64) return
    const raw = atob(pdfBase64)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

    pdfjsLib.getDocument({ data: bytes }).promise.then((doc) => {
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
    })
  }, [pdfBase64])

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    pdfDoc.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1.0 })
      const pdfScale = DISPLAY_WIDTH / viewport.width
      const displayHeight = viewport.height * pdfScale

      setCanvasSize({ width: DISPLAY_WIDTH, height: displayHeight })

      onPdfInfo?.({
        totalPages: pdfDoc.numPages,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
        pdfScale,
      })

      const dpr = window.devicePixelRatio || 1
      const canvas = canvasRef.current
      canvas.width = DISPLAY_WIDTH * dpr
      canvas.height = displayHeight * dpr
      canvas.style.width = `${DISPLAY_WIDTH}px`
      canvas.style.height = `${displayHeight}px`

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const renderViewport = page.getViewport({ scale: pdfScale })
      page.render({ canvasContext: ctx, viewport: renderViewport })
    })
  }, [pdfDoc, currentPage, onPdfInfo])

  // Default to last page when PDF loads
  useEffect(() => {
    if (totalPages > 0 && currentPage === 0) {
      onPageChange?.(totalPages)
    }
  }, [totalPages, currentPage, onPageChange])

  return (
    <div>
      <div
        className="relative rounded-xl overflow-hidden border border-charcoal/10 bg-white"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        <canvas ref={canvasRef} />
        {children}
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded-lg text-charcoal/40 hover:text-charcoal/70 disabled:opacity-30 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-charcoal/50 font-medium">
            Seite {currentPage} von {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded-lg text-charcoal/40 hover:text-charcoal/70 disabled:opacity-30 transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
