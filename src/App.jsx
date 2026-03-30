import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import WizardFlow from './components/WizardFlow'
import CompressFlow from './components/CompressFlow'
import MergeFlow from './components/MergeFlow'
import SignFlow from './components/SignFlow'
import HistoryView from './components/HistoryView'
import SettingsView from './components/SettingsView'
import UpdateBanner from './components/UpdateBanner'
import { api } from './api'

const VIEWS = {
  ENCRYPT: 'encrypt',
  COMPRESS: 'compress',
  MERGE: 'merge',
  SIGN: 'sign',
  HISTORY: 'history',
  SETTINGS: 'settings',
}

export default function App() {
  const [view, setView] = useState(VIEWS.ENCRYPT)
  const [preselectedFile, setPreselectedFile] = useState(null)
  const [signEnabled, setSignEnabled] = useState(false)

  useEffect(() => {
    api
      .bitsignStatus()
      .then((s) => setSignEnabled(!!s))
      .catch(() => {})
  }, [view])

  const handleGoToEncrypt = useCallback((filePath, fileName) => {
    setPreselectedFile({ path: filePath, name: fileName })
    setView(VIEWS.ENCRYPT)
  }, [])

  const handleGoToCompress = useCallback((filePath, fileName) => {
    // TODO: preselect file in compress flow
    setView(VIEWS.COMPRESS)
  }, [])

  return (
    <div className="h-screen flex bg-surface overflow-hidden">
      <Sidebar
        activeView={view}
        onNavigate={(v) => {
          setPreselectedFile(null)
          setView(v)
        }}
        signEnabled={signEnabled}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div data-tauri-drag-region className="h-10 shrink-0 drag-region" />
        <UpdateBanner />

        <main className="flex-1 overflow-auto">
          {view === VIEWS.ENCRYPT && (
            <WizardFlow onGoToHistory={() => setView(VIEWS.HISTORY)} preselectedFile={preselectedFile} />
          )}
          {view === VIEWS.COMPRESS && <CompressFlow onGoToEncrypt={handleGoToEncrypt} />}
          {view === VIEWS.MERGE && <MergeFlow onGoToEncrypt={handleGoToEncrypt} onGoToCompress={handleGoToCompress} />}
          {view === VIEWS.SIGN && <SignFlow onConnected={() => setSignEnabled(true)} />}
          {view === VIEWS.HISTORY && (
            <HistoryView
              onNewEncrypt={() => {
                setPreselectedFile(null)
                setView(VIEWS.ENCRYPT)
              }}
            />
          )}
          {view === VIEWS.SETTINGS && <SettingsView />}
        </main>
      </div>
    </div>
  )
}
