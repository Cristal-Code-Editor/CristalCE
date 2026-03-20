import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Proceso principal de Electron (Node.js)
  main: {
    plugins: [externalizeDepsPlugin()],
  },

  // Script preload — puente IPC seguro entre Main y Renderer
  preload: {
    plugins: [externalizeDepsPlugin()],
  },

  // Proceso Renderer — React + Tailwind CSS 4
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
