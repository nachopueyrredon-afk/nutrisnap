import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nutrisnap/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
})
