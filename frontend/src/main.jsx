import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Apply persisted theme BEFORE React renders to prevent flash of wrong theme
(() => {
  try {
    const stored = localStorage.getItem('nurachat-ui');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  } catch {}
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
