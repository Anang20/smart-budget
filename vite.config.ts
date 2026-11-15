import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // PWA: installable app + offline cache. The service worker only exists in production builds.
    VitePWA({
      registerType: 'prompt', // the user decides when to apply an update (see PwaPrompt)
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Smart Budget & Investment Planner',
        short_name: 'Smart Budget',
        description: 'Atur anggaran, catat transaksi, pantau target, dan simulasikan investasi. Bisa dipakai offline.',
        lang: 'id',
        categories: ['finance', 'productivity'],
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#ECF1E9',
        background_color: '#ECF1E9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
