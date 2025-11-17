/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo for focus
        secondary: '#06B6D4', // Cyan for accents
        background: '#F9FAFB', // Light gray background
        surface: '#FFFFFF',
        calm: '#E0E7FF', // Calm purple tint
      },
    },
  },
  plugins: [],
}


