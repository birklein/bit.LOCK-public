import { useState, useEffect } from 'react'
import {
  ClockIcon,
  KeyIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentMagnifyingGlassIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/solid'

export default function HistoryView() {
  const [entries, setEntries] = useState([])
  const [visiblePasswords, setVisiblePasswords] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    const data = await window.api.getHistory()
    setEntries(data)
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
    await window.api.deleteHistory(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const handleShowInFolder = (path) => {
    window.api.showInFolder(path)
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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-semibold text-stone-700">Verlauf</h2>
        </div>
        <span className="text-xs text-stone-400">{entries.length} Einträge</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-stone-300">
          <ClockIcon className="w-8 h-8 animate-pulse" />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center">
            <DocumentMagnifyingGlassIcon className="w-8 h-8 text-stone-300" />
          </div>
          <p className="text-sm text-stone-400">Noch keine Einträge</p>
          <p className="text-xs text-stone-300">Verschlüsselte Dateien erscheinen hier</p>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const isVisible = visiblePasswords.has(entry.id)
          return (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-stone-100 p-4 hover:border-amber-100 transition-colors slide-up"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                  <KeyIcon className="w-4 h-4 text-amber-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {entry.file_name}
                    </p>
                    <span className="text-xs text-stone-300 shrink-0 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>

                  {entry.recipient && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">→ {entry.recipient}</p>
                  )}

                  {/* Passwort */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                      <span className="font-password text-xs text-stone-500 flex-1 tracking-wider">
                        {isVisible ? entry.password : '• • • • • • • • • • • •'}
                      </span>
                      <button
                        onClick={() => togglePassword(entry.id)}
                        className="text-stone-300 hover:text-amber-500 transition-colors"
                      >
                        {isVisible ? (
                          <EyeSlashIcon className="w-3.5 h-3.5" />
                        ) : (
                          <EyeIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Aktionen */}
                    <button
                      onClick={() => handleShowInFolder(entry.encrypted_path)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      title="Im Explorer anzeigen"
                    >
                      <FolderOpenIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
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
