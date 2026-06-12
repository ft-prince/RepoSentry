import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * Design tokens: near-monochrome zinc base, one indigo accent used sparingly,
 * muted semantic severity palette. Dark mode first (class strategy).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'surface-raised': 'hsl(var(--surface-raised))',
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        faint: 'hsl(var(--faint))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          foreground: 'hsl(var(--accent-foreground))',
          subtle: 'hsl(var(--accent-subtle))',
        },
        severity: {
          critical: 'hsl(var(--severity-critical))',
          high: 'hsl(var(--severity-high))',
          medium: 'hsl(var(--severity-medium))',
          low: 'hsl(var(--severity-low))',
        },
        success: 'hsl(var(--success))',
        danger: 'hsl(var(--danger))',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [animate],
}

export default config
