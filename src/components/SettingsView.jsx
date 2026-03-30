import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import {
  EnvelopeIcon,
  FolderIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline'

const RETENTION_OPTIONS = [
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
  { value: 365, label: '1 Jahr' },
  { value: 0, label: 'Nie löschen' },
]

export default function SettingsView() {
  const [settings, setSettings] = useState(null)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [signStatus, setSignStatus] = useState(null)
  const [signTenantUrl, setSignTenantUrl] = useState('')

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s)
      // Load saved tenant URL from settings
      if (s?.bitsignTenantUrl) setSignTenantUrl(s.bitsignTenantUrl)
    })
    api
      .bitsignStatus()
      .then(setSignStatus)
      .catch(() => {})
  }, [])

  const update = useCallback((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }))
    setSaved(false)
  }, [])

  const handleSave = async () => {
    await api.updateSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSelectDir = async () => {
    const dir = await api.selectDirectory()
    if (dir) update('defaultOutputDir', dir)
  }

  const handleClearDir = () => {
    update('defaultOutputDir', '')
  }

  const handleReset = async () => {
    await api.resetData()
    setConfirmReset(false)
    const fresh = await api.getSettings()
    setSettings(fresh)
  }

  if (!settings) return null

  return (
    <div className="h-full overflow-auto px-16 pt-10 pb-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-charcoal tracking-tight">Einstellungen</h1>
      <p className="mt-2 text-charcoal/40 text-[13px]">Passen Sie die Einstellungen nach Ihren Wünschen an.</p>

      {/* E-Mail */}
      <Section icon={EnvelopeIcon} title="E-Mail-Vorlagen" className="mt-10">
        <Field label="Mail-Client">
          <div className="flex gap-2">
            <RadioPill
              active={settings.mailClient === 'system'}
              onClick={() => update('mailClient', 'system')}
              label="System-Standard"
            />
            <RadioPill
              active={settings.mailClient === 'outlook'}
              onClick={() => update('mailClient', 'outlook')}
              label="Outlook"
            />
          </div>
        </Field>

        <Field label="PDF-Mail: Betreff" hint="Platzhalter: {fileName}">
          <input
            type="text"
            value={settings.pdfMailSubject}
            onChange={(e) => update('pdfMailSubject', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
          />
        </Field>

        <Field label="PDF-Mail: Text" hint="Platzhalter: {fileName}">
          <textarea
            value={settings.pdfMailBody}
            onChange={(e) => update('pdfMailBody', e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0 resize-none"
          />
        </Field>

        <Field label="Passwort-Mail: Betreff" hint="Platzhalter: {fileName}">
          <input
            type="text"
            value={settings.passwordMailSubject}
            onChange={(e) => update('passwordMailSubject', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
          />
        </Field>

        <Field label="Passwort-Mail: Text" hint="Platzhalter: {fileName}, {password}">
          <textarea
            value={settings.passwordMailBody}
            onChange={(e) => update('passwordMailBody', e.target.value)}
            rows={5}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0 resize-none"
          />
        </Field>
      </Section>

      {/* Speicherort */}
      <Section icon={FolderIcon} title="Speicherort" className="mt-6">
        <Field label="Standard-Ausgabeordner" hint="Leer = jedes Mal fragen">
          <div className="flex items-center gap-2">
            <div
              onClick={handleSelectDir}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal cursor-pointer hover:bg-surface-mid/50 transition-colors truncate"
            >
              {settings.defaultOutputDir || 'Kein Ordner gewählt — Klicken zum Auswählen'}
            </div>
            {settings.defaultOutputDir && (
              <button
                onClick={handleClearDir}
                className="p-2 rounded-lg text-charcoal/30 hover:text-charcoal/60 hover:bg-surface-mid/50 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </Field>
      </Section>

      {/* Verlauf */}
      <Section icon={ClockIcon} title="Verlauf" className="mt-6">
        <Field label="Aufbewahrungsdauer">
          <div className="flex gap-2 flex-wrap">
            {RETENTION_OPTIONS.map((opt) => (
              <RadioPill
                key={opt.value}
                active={settings.historyRetentionDays === opt.value}
                onClick={() => update('historyRetentionDays', opt.value)}
                label={opt.label}
              />
            ))}
          </div>
        </Field>
      </Section>

      {/* Updates */}
      <Section icon={ArrowPathIcon} title="Updates" className="mt-6">
        <Field label="Automatisch nach Updates suchen">
          <Toggle checked={settings.autoCheckUpdates} onChange={(v) => update('autoCheckUpdates', v)} />
        </Field>
      </Section>

      {/* Signatur-Server */}
      <Section icon={FingerPrintIcon} title="Signatur-Server" className="mt-6">
        <Field label="Server-Adresse" hint="Format: https://sign.example.com">
          <input
            type="url"
            value={signTenantUrl}
            onChange={(e) => setSignTenantUrl(e.target.value)}
            placeholder="https://sign.example.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface text-xs text-charcoal placeholder-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border-0"
          />
        </Field>
        <Field label="Digitale Signaturen">
          <div className="flex items-center justify-between">
            <div>
              {signStatus ? (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-xs text-charcoal/60">Verbunden als {signStatus.name || signStatus.email}</span>
                </div>
              ) : (
                <span className="text-xs text-charcoal/40">Nicht verbunden</span>
              )}
            </div>
            <Toggle
              checked={!!signStatus}
              onChange={async (enabled) => {
                if (!enabled && signStatus) {
                  await api.bitsignLogout()
                  await api.bitsignSetEnabled(false)
                  setSignStatus(null)
                } else {
                  await api.bitsignSetEnabled(true)
                }
              }}
            />
          </div>
        </Field>
        {signStatus && (
          <Field label="Account">
            <div className="bg-surface rounded-xl p-3 space-y-1">
              <p className="text-xs text-charcoal">{signStatus.name || signStatus.email}</p>
              <p className="text-[10px] text-charcoal/40">
                {signStatus.tenantSlug} · {signStatus.role} · {signStatus.apiUrl}
              </p>
            </div>
          </Field>
        )}
        <p className="text-[10px] text-charcoal/25 leading-relaxed">
          Wenn aktiviert, erscheint "Signieren" in der Navigation. Die Anmeldung erfolgt sicher über den Browser (OAuth2
          PKCE).
        </p>
      </Section>

      {/* Daten zurücksetzen */}
      <Section icon={TrashIcon} title="Daten" className="mt-6">
        <Field label="Verlauf und Einstellungen löschen" hint="Setzt alles auf Werkseinstellungen zurück">
          {confirmReset ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-danger font-medium">Wirklich alles löschen?</span>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Ja, löschen
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-lg bg-surface-mid text-xs font-medium text-charcoal/60 hover:bg-surface-high transition-colors"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2 rounded-lg bg-surface-mid text-xs font-medium text-charcoal/50 hover:bg-red-50 hover:text-danger transition-colors"
            >
              Daten zurücksetzen
            </button>
          )}
        </Field>
      </Section>

      {/* Speichern-Button */}
      <div className="mt-10 pb-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
            saved
              ? 'bg-success text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-golden hover:shadow-golden-lg hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {saved ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Gespeichert
            </>
          ) : (
            'Einstellungen speichern'
          )}
        </button>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, className, children }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-amber-600" />
        <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-amber-700">{title}</h2>
      </div>
      <div className="bg-surface-low rounded-2xl p-5 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-charcoal/60 mb-1.5">
        {label}
        {hint && <span className="text-charcoal/25 font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function RadioPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-amber-500/15 text-amber-700'
          : 'bg-surface text-charcoal/40 hover:bg-surface-mid/50 hover:text-charcoal/60'
      }`}
    >
      {label}
    </button>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-surface-high'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
