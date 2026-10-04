// Ensure window.fetch has both a getter and setter to prevent "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  try {
    const origFetch = window.fetch;
    let customFetch = origFetch ? origFetch.bind(window) : null;
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        get() {
          return customFetch || origFetch;
        },
        set(fn) {
          customFetch = typeof fn === 'function' ? fn : origFetch;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (_e) {
    // Gracefully continue
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
