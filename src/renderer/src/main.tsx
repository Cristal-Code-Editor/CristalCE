import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import App from './App'
import './main.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root no encontrado en el DOM')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
