import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3001';
  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        // Dev frontend and API share the browser origin, so sessions/CSRF work like production.
        '/api': { target: apiTarget, changeOrigin: false, secure: true },
      },
    },
    preview: { host: 'localhost', port: 4173, strictPort: true },
  };
});
