import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 600, // 600KBまで警告を出さない
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ethersを独立したチャンクに分割
          if (id.includes('ethers')) {
            return 'ethers';
          }
          // その他のnode_modulesはvendorチャンクに
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['ethers'],
  },
  server: {
    host: true,
    port: 3000,
  },
});
