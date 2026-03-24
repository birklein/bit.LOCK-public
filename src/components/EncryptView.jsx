import { useState, useEffect } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { generatePassword } from '../utils/password'
import { api } from '../api'
import {
  LockClosedIcon,
  LockOpenIcon,
  DocumentIcon,
  EnvelopeIcon,
  KeyIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'

export default function EncryptView({
  state,
  onDropFile,
  onSelectPdf,
  onEncrypt,
  onOpenPdfMail,
  onOpenPasswordMail,
  onNewPassword,
  onRecipientChange,
  onReset,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        setIsDragOver(true)
      } else if (event.payload.type === 'drop') {
        setIsDragOver(false)
        const paths = event.payload.paths
        if (paths.length > 0 && paths[0].toLowerCase().endsWith('.pdf')) {
          const fileName = paths[0].split(/[\\/]/).pop()
          onDropFile(paths[0], fileName, generatePassword())
        }
      } else {
        setIsDragOver(false)
      }
    })
    return () => { unlisten.then((f) => f()) }
  }, [onDropFile])

  const copyPassword = async () => {
    if (!state.password) return
    await navigator.clipboard.writeText(state.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    // Clipboard nach 30 Sekunden loeschen (Security)
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === state.password) {
          await navigator.clipboard.writeText('')
        }
      } catch {
        // Clipboard-Zugriff verweigert — ignorieren
      }
    }, 30000)
  }

  const isDone = state.status === 'done'
  const isEncrypting = state.status === 'encrypting'
  const hasError = state.status === 'error'
  const hasFile = !!state.inputPath

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {!hasFile ? (
        <DropZone isDragOver={isDragOver} onSelect={onSelectPdf} />
      ) : (
        <FileCard fileName={state.fileName} status={state.status} onReset={onReset} />
      )}

      {hasFile && (
        <div className="mt-4 slide-up">
          <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                <KeyIcon className="w-4 h-4 text-amber-500" />
                Verschlüsselungspasswort
              </div>
              <button
                onClick={onNewPassword}
                disabled={isDone || isEncrypting}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Neu generieren
              </button>
            </div>

            <div
              onClick={copyPassword}
              className={`group flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                isDone
                  ? 'bg-emerald-50 border-2 border-emerald-200'
                  : 'bg-stone-900 hover:bg-stone-800'
              }`}
            >
              <span
                className={`font-password text-lg tracking-wider ${
                  isDone ? 'text-emerald-700' : 'text-amber-400'
                }`}
              >
                {state.password}
              </span>
              <span
                className={`text-xs ml-3 shrink-0 transition-all ${
                  copied
                    ? 'text-emerald-400'
                    : isDone
                    ? 'text-emerald-400'
                    : 'text-stone-500 group-hover:text-amber-400'
                }`}
              >
                {copied ? '✓ Kopiert' : 'Klicken zum Kopieren'}
              </span>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Empfänger-E-Mail (optional)
              </label>
              <input
                type="email"
                value={state.recipient}
                onChange={(e) => onRecipientChange(e.target.value)}
                placeholder="behoerde@beispiel.de"
                disabled={isDone || isEncrypting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {hasError && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 slide-up">
          <ExclamationCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Verschlüsselung fehlgeschlagen</p>
            <p className="text-xs text-red-500 mt-1">{state.errorMsg}</p>
          </div>
        </div>
      )}

      {hasFile && (
        <div className="mt-4 space-y-3 slide-up">
          {!isDone && (
            <button
              onClick={onEncrypt}
              disabled={isEncrypting}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-medium text-base transition-all duration-200 ${
                isEncrypting
                  ? 'bg-amber-200 text-amber-600 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 hover:shadow-amber-300 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isEncrypting ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Wird verschlüsselt…
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  PDF jetzt verschlüsseln
                </>
              )}
            </button>
          )}

          {isDone && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700">Erfolgreich verschlüsselt</p>
                  <p className="text-xs text-emerald-500 truncate mt-0.5">{state.outputPath}</p>
                </div>
                <button
                  onClick={() => api.showInFolder(state.outputPath)}
                  className="shrink-0 text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
                  <FolderOpenIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Schritt 1 – Verschlüsselte PDF senden
                </p>
                <button
                  onClick={onOpenPdfMail}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm shadow-md shadow-amber-100 transition-all hover:-translate-y-0.5"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  <span>PDF-Mail öffnen</span>
                  <ArrowDownTrayIcon className="w-4 h-4 opacity-70" />
                </button>
              </div>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                  Schritt 2 – Passwort separat senden
                </p>
                <button
                  onClick={onOpenPasswordMail}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium text-sm shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <KeyIcon className="w-5 h-5 text-amber-400" />
                  <span>Passwort-Mail öffnen</span>
                </button>
              </div>

              <button
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-stone-400 hover:text-amber-600 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Neue Datei verschlüsseln
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DropZone({ isDragOver, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all duration-200 py-14 ${
        isDragOver
          ? 'drop-zone-active bg-amber-50 scale-[1.01]'
          : 'border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 bg-white'
      }`}
    >
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg ${
          isDragOver ? 'bg-amber-500 scale-110 shadow-amber-200' : 'bg-amber-50 shadow-amber-100'
        }`}
      >
        {isDragOver ? (
          <LockClosedIcon className="w-10 h-10 text-white lock-close" />
        ) : (
          <LockOpenIcon className="w-10 h-10 text-amber-400" />
        )}
      </div>

      <div className="text-center">
        <p className="text-base font-medium text-stone-700">
          {isDragOver ? 'PDF hier ablegen' : 'PDF hier ablegen oder klicken'}
        </p>
        <p className="text-sm text-stone-400 mt-1">
          Die Datei wird AES-256 verschlüsselt
        </p>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
        <span className="text-xs text-teal-600 font-medium">BSI-konform · AES-256</span>
      </div>
    </div>
  )
}

function FileCard({ fileName, status, onReset }) {
  const isEncrypting = status === 'encrypting'
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-amber-100 p-4 shadow-sm slide-up">
      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
        {isEncrypting ? (
          <LockClosedIcon className="w-6 h-6 text-amber-500 animate-pulse" />
        ) : (
          <DocumentIcon className="w-6 h-6 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{fileName}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {isEncrypting ? 'Wird verschlüsselt…' : 'Bereit zur Verschlüsselung'}
        </p>
      </div>
      {!isEncrypting && (
        <button
          onClick={onReset}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
