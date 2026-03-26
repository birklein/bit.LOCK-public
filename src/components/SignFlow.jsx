import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import SignStepOne from './sign/SignStepOne'
import SignStepTwo from './sign/SignStepTwo'
import SignStepThree from './sign/SignStepThree'
import SignLogin from './sign/SignLogin'

export default function SignFlow({ onConnected }) {
  const [session, setSession] = useState(null)
  const [tenantUrl, setTenantUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    inputPath: null,
    fileName: null,
    reason: '',
    result: null,
    error: null,
  })

  useEffect(() => {
    api.bitsignStatus().then((s) => {
      setSession(s)
      setLoading(false)
    })
    // Load tenant URL from settings
    api.getSettings().then((s) => {
      if (s?.bitsignTenantUrl) setTenantUrl(s.bitsignTenantUrl)
    }).catch(() => {})
  }, [])

  const handleLogin = useCallback(async (apiUrl) => {
    const s = await api.bitsignLogin(apiUrl)
    setSession(s)
    onConnected?.()
    return s
  }, [])

  const handleLogout = useCallback(async () => {
    await api.bitsignLogout()
    setSession(null)
  }, [])

  const handleFileSelected = useCallback((filePath, fileName) => {
    setData((d) => ({ ...d, inputPath: filePath, fileName, error: null }))
    setStep(2)
  }, [])

  const handleSign = useCallback(async (reason, signaturePng, position, captionInPng, signers, inviteMessage) => {
    if (!data.inputPath) return
    setData((d) => ({ ...d, reason, error: null }))
    try {
      // Step 1: Upload PDF (with optional external signers)
      const upload = await api.bitsignUploadPdf({
        inputPath: data.inputPath,
        reason,
        signers: signers?.length ? signers : undefined,
      })
      const documentId = upload.id

      // Step 2: Submit signature + download signed PDF
      const result = await api.bitsignSignPdf({
        documentId,
        signaturePng,
        reason,
        fileName: data.fileName,
        position,
        captionInPng: captionInPng || false,
      })

      // Step 3: Send invitations to external signers
      if (signers?.length) {
        await api.bitsignSendInvites({
          documentId,
          message: inviteMessage,
        })
        result.status = 'PENDING'
        result.signers = signers
      }

      setData((d) => ({ ...d, result }))
      setStep(3)
    } catch (err) {
      setData((d) => ({ ...d, error: String(err) }))
    }
  }, [data])

  const handleReset = useCallback(() => {
    setStep(1)
    setData({ inputPath: null, fileName: null, reason: '', result: null, error: null })
  }, [])

  if (loading) return null

  // Not logged in → show login
  if (!session) {
    return (
      <div className="h-full flex flex-col px-16 pt-10 pb-8 max-w-3xl">
        <SignLogin onLogin={handleLogin} defaultUrl={tenantUrl} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col px-16 pt-10 pb-8 max-w-5xl">
      <ProgressBar currentStep={step} />
      <div className="flex-1 pt-12 min-h-0 animate-fade-up">
        {step === 1 && (
          <SignStepOne
            onFileSelected={handleFileSelected}
            session={session}
            onLogout={handleLogout}
          />
        )}
        {step === 2 && (
          <SignStepTwo
            data={data}
            session={session}
            onSign={handleSign}
            onBack={() => { setStep(1); setData((d) => ({ ...d, inputPath: null, fileName: null })) }}
          />
        )}
        {step === 3 && (
          <SignStepThree
            data={data}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}

function ProgressBar({ currentStep }) {
  const steps = [
    { num: 1, label: 'Datei wählen' },
    { num: 2, label: 'Signieren' },
    { num: 3, label: 'Fertig' },
  ]
  return (
    <div className="shrink-0">
      <div className="flex gap-2 mb-2">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              s.num <= currentStep ? 'bg-amber-500' : 'bg-surface-high'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-charcoal/40 font-medium">
        Schritt {currentStep} von 3: {steps[currentStep - 1].label}
      </p>
    </div>
  )
}
