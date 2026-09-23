import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Register service worker for PWA support
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch(() => {
        // SW registration failed — app still works online
      });
  });
}

// Remove a production worker left on a development origin before Vite runs.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
    registrations.filter(registration => {
      const script = registration.active?.scriptURL || registration.waiting?.scriptURL;
      return script && new URL(script).origin === location.origin && new URL(script).pathname === '/sw.js';
    }).map(registration => registration.unregister())
  )).catch(() => {});
}
