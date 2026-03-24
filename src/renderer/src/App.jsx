import { useState } from 'react'
import { generatePassword } from './utils/password'
import TitleBar from './components/TitleBar'
import EncryptView from './components/EncryptView'
import HistoryView from './components/HistoryView'
import {
  LockClosedIcon,
  ClockIcon,
} from '@heroicons/react/24/solid'

const VIEWS = {
  ENCRYPT: 'encrypt',
  HISTORY: 'history',
}

export default function App() {
  const [view, setView] = useState(VIEWS.ENCRYPT)
  const [state, setState] = useState({
    inputPath: null,
    outputPath: null,
    fileName: null,
    password: null,
    recipient: '',
    status: 'idle', // idle | encrypting | done | error
    errorMsg: null,
  })

  const reset = () =>
    setState({
      inputPath: null,
      outputPath: null,
      fileName: null,
      password: null,
      recipient: '',
      status: 'idle',
      errorMsg: null,
    })

  const handleDropFile = (filePath, fileName, password) => {
    setState((s) => ({
      ...s,
      inputPath: filePath,
      fileName,
      password,
      outputPath: null,
      status: 'idle',
      errorMsg: null,
    }))
  }

  const handleSelectPdf = async () => {
    const filePath = await window.api.selectPdf()
    if (!filePath) return

    const parts = filePath.split(/[\\/]/)
    const fileName = parts[parts.length - 1]
    const pw = generatePassword()

    setState((s) => ({
      ...s,
      inputPath: filePath,
      fileName,
      password: pw,
      outputPath: null,
      status: 'idle',
      errorMsg: null,
    }))
  }

  const handleEncrypt = async () => {
    if (!state.inputPath) return

    const baseName = state.fileName.replace(/\.pdf$/i, '')
    const savePath = await window.api.selectSavePath(baseName)
    if (!savePath) return

    setState((s) => ({ ...s, status: 'encrypting', outputPath: savePath }))

    const result = await window.api.encryptPdf({
      inputPath: state.inputPath,
      outputPath: savePath,
      password: state.password,
    })

    if (result.success) {
      // In Historie speichern
      await window.api.saveHistory({
        fileName: state.fileName,
        encryptedPath: savePath,
        recipient: state.recipient,
        password: state.password,
      })
      setState((s) => ({ ...s, status: 'done' }))
    } else {
      setState((s) => ({ ...s, status: 'error', errorMsg: result.error }))
    }
  }

  const handleOpenPdfMail = async () => {
    if (!state.outputPath) return
    await window.api.openPdfMail({
      recipient: state.recipient,
      filePath: state.outputPath,
      fileName: state.fileName,
    })
  }

  const handleOpenPasswordMail = async () => {
    await window.api.openPasswordMail({
      recipient: state.recipient,
      password: state.password,
      fileName: state.fileName,
    })
  }

  const handleNewPassword = () => {
    setState((s) => ({ ...s, password: generatePassword() }))
  }

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Navigation */}
      <nav className="flex items-center gap-1 px-5 pt-2 pb-0 border-b border-amber-100">
        <NavTab
          active={view === VIEWS.ENCRYPT}
          onClick={() => setView(VIEWS.ENCRYPT)}
          icon={<LockClosedIcon className="w-4 h-4" />}
          label="Verschlüsseln"
        />
        <NavTab
          active={view === VIEWS.HISTORY}
          onClick={() => setView(VIEWS.HISTORY)}
          icon={<ClockIcon className="w-4 h-4" />}
          label="Verlauf"
        />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {view === VIEWS.ENCRYPT && (
          <EncryptView
            state={state}
            onDropFile={handleDropFile}
          onSelectPdf={handleSelectPdf}
            onEncrypt={handleEncrypt}
            onOpenPdfMail={handleOpenPdfMail}
            onOpenPasswordMail={handleOpenPasswordMail}
            onNewPassword={handleNewPassword}
            onRecipientChange={(v) => setState((s) => ({ ...s, recipient: v }))}
            onReset={reset}
          />
        )}
        {view === VIEWS.HISTORY && <HistoryView />}
      </main>
    </div>
  )
}

function NavTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`no-drag flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 ${
        active
          ? 'bg-amber-500 text-white shadow-sm'
          : 'text-stone-500 hover:text-amber-600 hover:bg-amber-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
