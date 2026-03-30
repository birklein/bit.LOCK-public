/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        ubuntu: ['Ubuntu', 'sans-serif'],
        mono: ['Ubuntu Mono', 'monospace'],
      },
      colors: {
        // Precision Vault palette
        charcoal: '#1C1917',
        cream: '#FFFBF5',
        amber: {
          50: '#FFF8EB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Surface tonal system (no borders, depth via tone)
        surface: {
          DEFAULT: '#FFFBF5',
          low: '#F7F3ED',
          mid: '#EFEBE5',
          high: '#E7E3DD',
          highest: '#DFDBD5',
        },
        vault: {
          lid: '#31302D', // Titlebar — "heavy lid"
          floor: '#FFFBF5', // Main background
          wall: '#F7F3ED', // Card backgrounds
          steel: '#D8C3AD', // Ghost borders (20% opacity)
        },
        // Semantic
        success: '#059669',
        danger: '#DC2626',
      },
      boxShadow: {
        // Ambient shadows — tinted, diffused, never pure black
        'ambient-sm': '0 2px 8px rgba(28, 28, 24, 0.04)',
        ambient: '0 4px 16px rgba(28, 28, 24, 0.05)',
        'ambient-lg': '0 8px 32px rgba(28, 28, 24, 0.06)',
        'ambient-xl': '0 16px 48px rgba(28, 28, 24, 0.08)',
        // Golden glow for primary CTA
        golden: '0 4px 20px rgba(245, 158, 11, 0.25)',
        'golden-lg': '0 8px 32px rgba(245, 158, 11, 0.3)',
      },
      spacing: {
        4.5: '1.125rem',
        18: '4.5rem',
      },
      animation: {
        'pulse-amber': 'pulseAmber 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.35s cubic-bezier(0.34, 1.3, 0.64, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        pulseAmber: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
          '50%': { boxShadow: '0 0 0 12px rgba(245, 158, 11, 0.12)' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
