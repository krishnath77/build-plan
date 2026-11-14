import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';

// In dev, the Firebase web config is fetched from the deployed Hosting site (same path the live app uses).
const projectId = JSON.parse(fs.readFileSync(new URL('./.firebaserc', import.meta.url), 'utf8')).projects.default;

export default defineConfig({
  server: {
    proxy: { '/__': { target: `https://${projectId}.web.app`, changeOrigin: true } }
  },
  build: { target: 'es2020', sourcemap: false },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Build Plan',
        short_name: 'Build Plan',
        description: 'Study planner for the CBSE Class 10 board exams, 2027.',
        theme_color: '#23262E',
        background_color: '#F6F3EA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Firebase Auth and config live under /__/ on Hosting; never serve the app shell for them.
        navigateFallbackDenylist: [/^\/__\//, /^\/papers\//, /^\/qbank\//], // kept for a future question bank
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'bp-fonts-css' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'bp-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /\/__\/firebase\/init\.json$/, handler: 'NetworkFirst', options: { cacheName: 'bp-config', networkTimeoutSeconds: 4 } }
        ]
      }
    })
  ]
});
