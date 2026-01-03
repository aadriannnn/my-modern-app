module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'serif': ['"Source Serif 4"', 'Georgia', 'serif'], // Added accessible serif font
      },
      colors: {
        // Legal Premium Palette
        'brand-dark': '#0B1120', // Deepest Navy
        'brand-primary': '#162032', // Rich Navy
        'brand-secondary': '#334155', // Slate 700

        // Accents
        'brand-gold': '#C5A059', // Muted Gold - for highlights (sobru)
        'brand-gold-light': '#E5C985',
        'brand-accent': '#0F766E', // Keep teal for specific actions if needed, or replace
        'brand-accent-light': '#14B8A6',

        'brand-light': '#F8FAFC', // Slate 50
        'brand-text': '#0F172A', // Slate 900
        'brand-text-secondary': '#64748B', // Slate 500

        // Extended Grays for Backgrounds
        'legal-bg': '#F9FAFB', // Cool gray 50
        'legal-border': '#E2E8F0', // Slate 200
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', // Clean card shadow
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', // Soft, deep shadow
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(-10px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
