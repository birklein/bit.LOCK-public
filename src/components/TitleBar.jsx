import { getCurrentWindow } from '@tauri-apps/api/window'
import { LockClosedIcon } from '@heroicons/react/24/solid'

export default function TitleBar() {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const appWindow = getCurrentWindow()

  return (
    <div data-tauri-drag-region className="drag-region flex items-center h-12 px-4 bg-stone-900 select-none shrink-0">
      {/* macOS: Platz fuer native Traffic Lights */}
      {isMac && <div className="w-20 shrink-0" />}

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
          <LockClosedIcon className="w-4 h-4 text-stone-900" />
        </div>
        <span className="text-white font-medium text-sm tracking-wide">
          bit<span className="text-amber-400">.</span>LOCK
        </span>
        <span className="text-stone-500 text-xs ml-1">by birklein IT</span>
      </div>

      {/* Windows: custom Fenster-Buttons */}
      {!isMac && (
        <div className="no-drag ml-auto flex items-center">
          <WindowButton onClick={() => appWindow.minimize()} label="—" />
          <WindowButton onClick={() => appWindow.toggleMaximize()} label="□" />
          <WindowButton onClick={() => appWindow.close()} label="✕" danger />
        </div>
      )}
    </div>
  )
}

function WindowButton({ onClick, label, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-11 h-12 flex items-center justify-center text-xs transition-colors ${
        danger
          ? 'text-stone-400 hover:bg-red-500 hover:text-white'
          : 'text-stone-400 hover:bg-stone-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}
