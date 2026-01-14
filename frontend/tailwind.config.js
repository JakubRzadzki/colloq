/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  // --- NAPRAWA LIGHT/DARK MODE ---
  daisyui: {
    themes: ["light", "dark"],
  },
  darkMode: ['class', '[data-theme="dark"]']
}