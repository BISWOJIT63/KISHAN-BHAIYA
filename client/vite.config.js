import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KisanExpress',
        short_name: 'Kishan',
        description: 'KisanExpress agriculture marketplace and smart logistics',
        theme_color: '#153d2e',
        background_color: '#f7f6ef',
        display: 'standalone',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/images\.unsplash\.com\//,
          handler: 'CacheFirst',
          options: { cacheName: 'produce-images', expiration: { maxEntries: 40, maxAgeSeconds: 604800 } }
        }]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('leaflet') || id.includes('@turf')) return 'maps';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@tanstack') || id.includes('axios') || id.includes('socket.io')) return 'data';
          if (id.includes('lucide-react')) return 'icons';
        }
      }
    }
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000', '/socket.io': { target: 'http://localhost:5000', ws: true } } },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js' }
});
