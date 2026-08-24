/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 50: '#eff7f2', 100: '#daede0', 200: '#b7dcc4', 300: '#88c3a0', 400: '#55a578', 500: '#34885e', 600: '#256d4a', 700: '#1e573c', 800: '#194632', 900: '#153d2e', 950: '#0a2119' },
        cream: '#f7f6ef',
        ink: '#17221d',
        harvest: '#e7a52e'
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Manrope', 'Inter', 'sans-serif'] },
      boxShadow: { soft: '0 14px 36px rgba(21,61,46,.08)', lift: '0 20px 50px rgba(21,61,46,.13)' },
      borderRadius: { '4xl': '2rem' }
    }
  },
  plugins: []
};
