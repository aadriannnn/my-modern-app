/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1a237e', // Un albastru foarte închis, aproape negru
        'brand-secondary': '#283593', // Un albastru mai deschis pentru elemente secundare
        'brand-accent': '#c5a265', // Un auriu elegant pentru accente
        'brand-light': '#f5f5f5', // Un gri foarte deschis pentru fundaluri
        'brand-text': '#212121', // Culoare text principală
        'brand-text-secondary': '#757575', // Culoare text secundară
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
