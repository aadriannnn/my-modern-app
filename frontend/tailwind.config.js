/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          'navy': '#0D1B2A',       // Dark, almost black blue
          'blue': '#1B263B',       // A step lighter blue
          'steel': '#415A77',      // Muted steel blue
          'silver': '#778DA9',     // Lighter silver-blue
          'platinum': '#E0E1DD',   // Very light gray/platinum
          'gold': '#C9A227'        // Elegant gold accent
        },
        'background': '#F9FAFB',  // Off-white background
        'surface': '#FFFFFF',      // Card/modal background
        'text-primary': '#1F2937',  // Main text color
        'text-secondary': '#6B7280', // Lighter text
        'border-color': '#E5E7EB',     // Border color
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'sans-serif'], // As per instructions, not changing this
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/line-clamp'),
  ],
}
