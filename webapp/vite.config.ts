import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** «Пропустить вход»: локальный `vite dev` и деплой Vercel Preview (не Production). */
function guestLoginEnabled(command: string): boolean {
  if (command === 'serve') return true;
  const env = process.env.VERCEL_ENV;
  return env === 'preview' || env === 'development';
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    __GUEST_LOGIN_ENABLED__: JSON.stringify(guestLoginEnabled(command)),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
}));
