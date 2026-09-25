import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dev-only 3D character comparison harness, reached via ?demo=characters —
// not linked anywhere in the site nav, so it never affects real visitors.
const CharacterDemoPage = lazy(() => import('./avatar/demo/CharacterDemoPage.jsx'))
const isDemo = new URLSearchParams(window.location.search).get('demo') === 'characters'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDemo ? (
      <Suspense fallback={null}>
        <CharacterDemoPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
