import { useState, useCallback, useEffect } from 'react'
import { generatePassword } from '../utils/password'
import { api } from '../api'
import StepOne from './steps/StepOne'
import StepTwo from './steps/StepTwo'
import StepThree from './steps/StepThree'

export default function WizardFlow({ onGoToHistory, preselectedFile }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    inputPath: null,
    fileName: null,
    outputPath: null,
    password: null,
    recipient: '',
    error: null,
  })

  // If a file was preselected (e.g. from compress flow), jump to step 2
  useEffect(() => {
    if (preselectedFile) {
      setData((d) => ({
        ...d,
        inputPath: preselectedFile.path,
        fileName: preselectedFile.name,
        password: generatePassword(),
        error: null,
      }))
      setStep(2)
    }
  }, [preselectedFile])

  // Schritt 1: Datei gewaehlt
  const handleFileSelected = useCallback((filePath, fileName) => {
    setData((d) => ({
      ...d,
      inputPath: filePath,
      fileName,
      password: generatePassword(),
      error: null,
    }))
    setStep(2)
  }, [])

  // Schritt 2: Verschluesseln
  const handleEncrypt = useCallback(async () => {
    if (!data.inputPath) return

    const baseName = data.fileName.replace(/\.pdf$/i, '')
    const savePath = await api.selectSavePath(baseName)
    if (!savePath) return

    setData((d) => ({ ...d, outputPath: savePath, error: null }))

    try {
      await api.encryptPdf({
        inputPath: data.inputPath,
        outputPath: savePath,
        password: data.password,
      })
      await api.saveHistory({
        fileName: data.fileName,
        encryptedPath: savePath,
        recipient: data.recipient,
        password: data.password,
      })
      setStep(3)
    } catch (err) {
      setData((d) => ({ ...d, error: String(err) }))
    }
  }, [data])

  const handleNewPassword = useCallback(() => {
    setData((d) => ({ ...d, password: generatePassword() }))
  }, [])

  const handleRecipientChange = useCallback((v) => {
    setData((d) => ({ ...d, recipient: v }))
  }, [])

  const handleReset = useCallback(() => {
    setStep(1)
    setData({
      inputPath: null,
      fileName: null,
      outputPath: null,
      password: null,
      recipient: '',
      error: null,
    })
  }, [])

  return (
    <div className="h-full flex flex-col px-16 pt-10 pb-8 max-w-5xl">
      {/* Progress bar */}
      <ProgressBar currentStep={step} />

      <div className="flex-1 pt-12 min-h-0 animate-fade-up">
        {step === 1 && (
          <StepOne onFileSelected={handleFileSelected} />
        )}
        {step === 2 && (
          <StepTwo
            data={data}
            onEncrypt={handleEncrypt}
            onNewPassword={handleNewPassword}
            onRecipientChange={handleRecipientChange}
            onBack={() => { setStep(1); setData((d) => ({ ...d, inputPath: null, fileName: null })) }}
          />
        )}
        {step === 3 && (
          <StepThree
            data={data}
            onReset={handleReset}
            onGoToHistory={onGoToHistory}
          />
        )}
      </div>
    </div>
  )
}

function ProgressBar({ currentStep }) {
  const steps = [
    { num: 1, label: 'Datei wählen' },
    { num: 2, label: 'Verschlüsseln' },
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
