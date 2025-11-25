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
        'brand-dark': '#0F2347',
        'brand-primary': '#1B3A6B',
        'brand-secondary': '#475569',
        'brand-accent': '#0D7377',
        'brand-light': '#F0F2F5',
        'brand-text': '#1E293B',
        'brand-text-secondary': '#64748B',
        // Landing page colors
        'navy': {
          50: '#E6EBF5',
          100: '#CCD7EB',
          200: '#99AFD7',
          300: '#6687C3',
          400: '#335FAF',
          500: '#1B3A6B', // Primary Navy
          600: '#162E56',
          700: '#102241',
          800: '#0B172B',
          900: '#050B16',
        },
        'emerald': {
          50: '#E6F7F0',
          100: '#CCEFE1',
          200: '#99DFC3',
          300: '#66CFA5',
          400: '#33BF87',
          500: '#10B981', // Cyber Security Green
          600: '#0D9468',
          700: '#0A6F4E',
          800: '#064A34',
          900: '#03251A',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
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
        'subtle': '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-navy': '0 0 20px rgba(27, 58, 107, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(30px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(-30px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
