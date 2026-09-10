import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes Vite to the local network (allows access from mobile phones, OBS PCs, etc.)
  }
});