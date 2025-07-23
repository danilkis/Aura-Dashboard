import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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