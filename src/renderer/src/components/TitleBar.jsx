import { LockClosedIcon } from '@heroicons/react/24/solid'

export default function TitleBar() {
  const isMac = navigator.platform.toUpperCase().includes('MAC')

  return (
    <div className="drag-region flex items-center h-12 px-4 bg-stone-900 select-none shrink-0">
      {/* macOS: traffic lights sind links, Titel mittig */}
      {isMac && <div className="w-16" />}

      {/* Logo + Name */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
          <LockClosedIcon className="w-4 h-4 text-stone-900" />
        </div>
        <span className="text-white font-medium text-sm tracking-wide">
          bit<span className="text-amber-400">.</span>LOCK
        </span>
        <span className="text-stone-500 text-xs ml-1">PDF Security</span>
      </div>

      {/* Windows: Fenster-Buttons rechts */}
      {!isMac && (
        <div className="no-drag ml-auto flex items-center">
          <WindowButton onClick={() => window.api.minimize()} label="—" />
          <WindowButton onClick={() => window.api.maximize()} label="□" />
          <WindowButton onClick={() => window.api.close()} label="✕" danger />
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
