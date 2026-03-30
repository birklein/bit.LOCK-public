import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { ArrowDownTrayIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid'

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [status, setStatus] = useState('idle') // idle | downloading | installing | error
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkForUpdate()
  }, [])

  const checkForUpdate = async () => {
    try {
      const result = await check()
      if (result) {
        setUpdate(result)
      }
    } catch {
      // Kein Update-Server erreichbar oder kein pubkey konfiguriert — still ignorieren
    }
  }

  const installUpdate = async () => {
    if (!update) return
    setStatus('downloading')
    setError(null)

    try {
      let totalSize = 0
      let downloaded = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalSize = event.data.contentLength || 0
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            if (totalSize > 0) {
              setProgress(Math.round((downloaded / totalSize) * 100))
            }
            break
          case 'Finished':
            setStatus('installing')
            break
        }
      })

      await relaunch()
    } catch (err) {
      setStatus('error')
      setError(String(err))
    }
  }

  if (!update || dismissed) return null

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-sm">
      {status === 'idle' && (
        <>
          <ArrowDownTrayIcon className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 flex-1">
            Version <strong>{update.version}</strong> verfügbar
          </span>
          <button
            onClick={installUpdate}
            className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            Jetzt aktualisieren
          </button>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </>
      )}

      {status === 'downloading' && (
        <>
          <ArrowPathIcon className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
          <span className="text-amber-800 flex-1">Download läuft… {progress > 0 ? `${progress}%` : ''}</span>
          <div className="w-32 h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {status === 'installing' && (
        <>
          <ArrowPathIcon className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
          <span className="text-amber-800">Update wird installiert…</span>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="text-red-600 flex-1 text-xs">Update fehlgeschlagen: {error}</span>
          <button
            onClick={() => {
              setStatus('idle')
              setError(null)
            }}
            className="text-xs text-amber-600 hover:text-amber-800"
          >
            Erneut versuchen
          </button>
        </>
      )}
    </div>
  )
}
