/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans Bengali"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Outfit', '"Hind Siliguri"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-strong': 'rgb(var(--color-surface-strong) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--color-ink-soft) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--color-accent-ink) / <alpha-value>)',
        focus: 'rgb(var(--color-focus) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        terracotta: 'rgb(var(--color-terracotta) / <alpha-value>)',
        sundarban: 'rgb(var(--color-sundarban) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
      },
      boxShadow: {
        panel: '0 24px 70px rgb(15 23 42 / 0.14)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        glow: '0 0 20px rgb(var(--color-accent) / 0.3)',
        'glow-success': '0 0 20px rgb(var(--color-success) / 0.4)',
        'glow-danger': '0 0 20px rgb(var(--color-danger) / 0.4)',
      },
      transitionDuration: {
        fast: '160ms',
        base: '220ms',
        slow: '360ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out',
        'slide-up': 'slide-up 260ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.2, 0, 0, 1)',
        float: 'float 3.6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'medal-shine': 'medal-shine 1.8s ease-out infinite',
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.72' },
          '50%': { opacity: '1' },
        },
        'medal-shine': {
          '0%': { transform: 'translateX(-60%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}

