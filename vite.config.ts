import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // добавлен плагин полифиллов Node.js (именованный импорт)

export default defineConfig({
  plugins: [
    react(), // React plugin
    nodePolyfills({ // подключаем полифиллы Node.js
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      buffer: 'buffer', // алиас для Node Buffer
    },
  },
  optimizeDeps: {
    include: ['buffer', 'process'], // предзагрузка зависимостей для полифиллов
  },
  server: {
    host: true, // listen on all addresses, including LAN and public addresses
    port: 5173, // default port
    open: true,
    proxy: {
      '/yandex-weather': {
        target: 'https://api.weather.yandex.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yandex-weather/, ''),
        secure: true,
      },
    },
  },
});