import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://chess-client-rlw5.onrender.com',
        changeOrigin: true,
      },
      // Proxy socket.io to Express (port 5000), not Vite
      '/socket.io': {
        target: 'https://chess-client-rlw5.onrender.com',
        changeOrigin: true,
        ws: true,  // enable WebSocket proxying
      },
    },
  },
});

