import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: [
        'C:/Users/amank/.gemini/antigravity/brain/fd0893e7-ce54-4dc4-af76-ec22f719c3bf/.user_uploaded',
        'C:/Users/amank/OneDrive/Desktop/New folder/STEM_JAM_GAME'
      ]
    }
  },
  resolve: {
    alias: {
      '@uploaded': 'C:/Users/amank/.gemini/antigravity/brain/fd0893e7-ce54-4dc4-af76-ec22f719c3bf/.user_uploaded'
    }
  }
})
