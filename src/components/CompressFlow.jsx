import { useState, useCallback } from 'react'
import { api } from '../api'
import CompressStepOne from './compress/CompressStepOne'
import CompressStepTwo from './compress/CompressStepTwo'
import CompressStepThree from './compress/CompressStepThree'

export default function CompressFlow({ onGoToEncrypt }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    inputPath: null,
    fileName: null,
    outputPath: null,
    analysis: null,
    result: null,
    error: null,
  })

  const handleFileSelected = useCallback(async (filePath, fileName) => {
    setData((d) => ({ ...d, inputPath: filePath, fileName, error: null }))
    try {
      const analysis = await api.analyzePdf(filePath)
      setData((d) => ({ ...d, analysis }))
      setStep(2)
    } catch (err) {
      setData((d) => ({ ...d, error: String(err) }))
    }
  }, [])

  const handleCompress = useCallback(
    async (quality) => {
      if (!data.inputPath) return
      const baseName = data.fileName.replace(/\.pdf$/i, '')
      const savePath = await api.selectCompressSavePath(baseName)
      if (!savePath) return

      setData((d) => ({ ...d, outputPath: savePath, error: null }))
      try {
        const result = await api.compressPdf({
          inputPath: data.inputPath,
          outputPath: savePath,
          quality,
        })
        setData((d) => ({ ...d, result }))
        setStep(3)
      } catch (err) {
        setData((d) => ({ ...d, error: String(err) }))
      }
    },
    [data],
  )

  const handleReset = useCallback(() => {
    setStep(1)
    setData({ inputPath: null, fileName: null, outputPath: null, analysis: null, result: null, error: null })
  }, [])

  return (
    <div className="h-full flex flex-col px-16 pt-10 pb-8 max-w-5xl">
      <ProgressBar currentStep={step} />
      <div className="flex-1 pt-12 min-h-0 animate-fade-up">
        {step === 1 && <CompressStepOne onFileSelected={handleFileSelected} error={data.error} />}
        {step === 2 && (
          <CompressStepTwo
            data={data}
            onCompress={handleCompress}
            onBack={() => {
              setStep(1)
              setData((d) => ({ ...d, inputPath: null, fileName: null, analysis: null }))
            }}
          />
        )}
        {step === 3 && (
          <CompressStepThree
            data={data}
            onReset={handleReset}
            onGoToEncrypt={() => onGoToEncrypt(data.outputPath, data.fileName)}
          />
        )}
      </div>
    </div>
  )
}

function ProgressBar({ currentStep }) {
  const steps = [
    { num: 1, label: 'Datei wählen' },
    { num: 2, label: 'Komprimieren' },
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
