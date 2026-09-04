/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Small phones (360-400px) are the primary form factor for farmer users,
      // so we need a breakpoint below Tailwind's 640px `sm`.
      screens: { xs: '400px' },
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16'
        },
        cream: '#fafafa',
        ink: '#171717',
        harvest: '#fa8c16'
      },
      fontFamily: { sans: ['Noto Sans', 'Noto Sans Devanagari', 'Segoe UI', 'sans-serif'], display: ['Noto Sans Display', 'Noto Sans', 'sans-serif'] },
      boxShadow: { soft: '0 2px 8px rgba(23,23,23,.07)', lift: '0 10px 28px rgba(36,20,92,.14)' },
      borderRadius: { '4xl': '2rem' }
    }
  },
  plugins: []
};
