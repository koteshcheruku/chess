import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy socket.io to Express (port 5000), not Vite
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,  // enable WebSocket proxying
      },
    },
  },
});

