import { useState } from 'react'
import {
  FingerPrintIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function SignLogin({ onLogin }) {
  const [apiUrl, setApiUrl] = useState('https://sign.birklein.de')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await onLogin(apiUrl)
    } catch (err) {
      setError(String(err))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
        <FingerPrintIcon className="w-8 h-8 text-amber-600" />
      </div>

      <h1 className="text-2xl font-bold text-charcoal tracking-tight text-center">
        Mit bit.SIGN anmelden
      </h1>
      <p className="mt-3 text-charcoal/40 text-[13px] text-center leading-relaxed">
        Melden Sie sich mit Ihrem bit.SIGN Konto an, um Dokumente
        digital zu signieren. Ihr Browser wird für die Anmeldung geöffnet.
      </p>

      <div className="mt-8 w-full space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-charcoal/50 mb-1.5">
            bit.SIGN Server-URL
          </label>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://sign.firma.de"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-low text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 rounded-xl p-3.5">
            <ExclamationTriangleIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-[11px] text-danger">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !apiUrl}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold transition-all duration-200 ${
            loading
              ? 'bg-surface-high text-charcoal/40 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Warte auf Anmeldung im Browser…
            </>
          ) : (
            <>
              <FingerPrintIcon className="w-4 h-4" />
              Im Browser anmelden
            </>
          )}
        </button>
      </div>

      <p className="mt-6 text-[10px] text-charcoal/25 text-center leading-relaxed">
        bit.LOCK öffnet Ihren Browser für die sichere Anmeldung.
        Ihre Zugangsdaten werden nie in bit.LOCK eingegeben.
      </p>
    </div>
  )
}
