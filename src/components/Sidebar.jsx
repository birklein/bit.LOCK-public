import {
  LockClosedIcon,
  ArrowsPointingInIcon,
  FingerPrintIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { LockClosedIcon as LockSolid } from '@heroicons/react/24/solid'

export default function Sidebar({ activeView, onNavigate, signEnabled }) {
  const navItems = [
    { id: 'encrypt', label: 'Verschlüsseln', icon: LockClosedIcon },
    { id: 'compress', label: 'Komprimieren', icon: ArrowsPointingInIcon },
    ...(signEnabled ? [{ id: 'sign', label: 'Signieren', icon: FingerPrintIcon }] : []),
    { id: 'history', label: 'Verlauf', icon: ClockIcon },
  ]

  return (
    <aside className="w-56 shrink-0 bg-surface-low flex flex-col h-full select-none">
      {/* macOS traffic lights space */}
      <div data-tauri-drag-region className="h-12 shrink-0 drag-region" />

      {/* Logo */}
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <LockSolid className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-charcoal font-bold text-base tracking-wide">
            bit.LOCK
          </span>
        </div>
        <span className="block mt-2 px-11 text-[9px] font-medium tracking-[0.15em] uppercase text-amber-700/40">
          AES-256 Active
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const active = activeView === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`no-drag w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'text-amber-700 bg-amber-500/10'
                  : 'text-charcoal/50 hover:text-charcoal/80 hover:bg-surface-mid/50'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-amber-600' : ''}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* bit.SIGN CTA — only when not connected */}
      {!signEnabled && (
        <div className="px-4 pb-3">
          <button
            onClick={() => onNavigate('sign')}
            className="no-drag w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] text-charcoal/30 hover:text-amber-600 hover:bg-amber-500/5 transition-all duration-150"
          >
            <FingerPrintIcon className="w-[15px] h-[15px]" />
            Mit bit.SIGN verbinden
          </button>
        </div>
      )}

      {/* Bottom */}
      <div className="px-4 pb-5">
        <button
          onClick={() => onNavigate('settings')}
          className={`no-drag w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
            activeView === 'settings'
              ? 'text-amber-700 bg-amber-500/10'
              : 'text-charcoal/40 hover:text-charcoal/60 hover:bg-surface-mid/50'
          }`}
        >
          <Cog6ToothIcon className={`w-[18px] h-[18px] ${activeView === 'settings' ? 'text-amber-600' : ''}`} />
          Einstellungen
        </button>
      </div>
    </aside>
  )
}
