/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'Source Sans 3', 'system-ui', 'sans-serif'],
      },
      colors: {
        'brand-dark': '#0F172A', // Slate 900 - Darker, more premium
        'brand-primary': '#1E293B', // Slate 800
        'brand-secondary': '#475569', // Slate 600
        'brand-accent': '#0F766E', // Teal 700 - Slightly deeper teal for trust
        'brand-accent-light': '#14B8A6', // Teal 500
        'brand-light': '#F8FAFC', // Slate 50 - Very clean background
        'brand-text': '#0F172A', // Slate 900
        'brand-text-secondary': '#64748B', // Slate 500

        // Premium Grays (Slate-based for modern feel)
        'slate': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)', // New soft premium shadow
        'glow': '0 0 20px rgba(20, 184, 166, 0.2)', // Updated glow color
        'glow-strong': '0 0 30px rgba(20, 184, 166, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(-20px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
