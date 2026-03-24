import { useState, useEffect } from 'react'
import { api } from '../api'
import {
  ClockIcon,
  KeyIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderOpenIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline'

export default function HistoryView({ onNewEncrypt }) {
  const [entries, setEntries] = useState([])
  const [visiblePasswords, setVisiblePasswords] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await api.getHistory()
      setEntries(data)
    } catch (err) {
      console.error('History laden fehlgeschlagen:', err)
    }
    setLoading(false)
  }

  const togglePassword = (id) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async (id) => {
    await api.deleteHistory(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="px-10 py-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-charcoal tracking-tight">Verlauf</h1>
      <p className="mt-2 text-charcoal/40 text-sm">
        {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'}
      </p>

      {loading && (
        <div className="flex items-center justify-center py-20 text-charcoal/20">
          <ClockIcon className="w-8 h-8 animate-pulse" />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-low flex items-center justify-center">
            <DocumentIcon className="w-8 h-8 text-charcoal/15" />
          </div>
          <div>
            <p className="text-sm text-charcoal/40">Noch keine Einträge</p>
            <p className="text-xs text-charcoal/25 mt-1">Verschlüsselte Dateien erscheinen hier</p>
          </div>
          <button
            onClick={onNewEncrypt}
            className="mt-2 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors shadow-golden"
          >
            Erste Datei verschlüsseln
          </button>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {entries.map((entry) => {
          const isVisible = visiblePasswords.has(entry.id)
          return (
            <div
              key={entry.id}
              className="bg-surface-low rounded-2xl p-5 hover:bg-surface-mid/60 transition-colors animate-fade-up"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-mid flex items-center justify-center shrink-0 mt-0.5">
                  <DocumentIcon className="w-5 h-5 text-charcoal/25" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">
                        {entry.fileName}
                      </p>
                      {entry.recipient && (
                        <p className="text-xs text-charcoal/35 mt-0.5 truncate">
                          → {entry.recipient}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-charcoal/25 shrink-0 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
                      <KeyIcon className="w-3.5 h-3.5 text-charcoal/20 shrink-0" />
                      <span className="font-password text-xs text-charcoal/40 flex-1 tracking-wider">
                        {isVisible ? entry.password : '•••• •••• •••• ••••'}
                      </span>
                      <button
                        onClick={() => togglePassword(entry.id)}
                        className="text-charcoal/20 hover:text-amber-600 transition-colors"
                      >
                        {isVisible ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => api.showInFolder(entry.encryptedPath)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/20 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Im Finder anzeigen"
                    >
                      <FolderOpenIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-charcoal/20 hover:text-danger hover:bg-red-50 transition-colors"
                      title="Eintrag löschen"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
