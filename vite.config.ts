import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            const normalized = id.replace(/\\/g, '/');
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/scheduler/')
            ) return 'vendor-react';
            if (normalized.includes('/node_modules/@supabase/')) return 'vendor-supabase';
            if (normalized.includes('/node_modules/motion/') || normalized.includes('/node_modules/framer-motion/')) return 'vendor-motion';
            if (normalized.includes('/node_modules/recharts/') || normalized.includes('/node_modules/d3-')) return 'vendor-charts';
            if (normalized.includes('/node_modules/jspdf/')) return 'pdf-jspdf';
            if (normalized.includes('/node_modules/html2canvas/')) return 'pdf-html2canvas';
            if (normalized.includes('/node_modules/dompurify/')) return 'pdf-dompurify';
            return undefined;
          },
        },
      },
    },
  };
});
