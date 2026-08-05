import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import FeedbackDashboard from './components/FeedbackDashboard'
import './index.css'

registerSW({ immediate: true })

// The owner feedback dashboard lives at /?admin — the flag carries no secret,
// the HttpOnly session cookie is the real gate (see FeedbackDashboard).
const isAdmin = new URLSearchParams(window.location.search).has('admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <FeedbackDashboard /> : <App />}</StrictMode>,
)
