import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When using `npx netlify dev`, functions run on 8888.
      // Plain `npm run dev` will fail the probe gracefully and use algorithmic planning.
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
})
