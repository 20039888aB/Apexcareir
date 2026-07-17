import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep React with every package that calls React.forwardRef / createElement
        // at module init. Splitting lucide/framer into a separate "vendor" chunk
        // caused a blank page in production: React was still undefined when
        // vendor-*.js evaluated (Cannot read properties of undefined (reading 'forwardRef')).
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'charts';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
