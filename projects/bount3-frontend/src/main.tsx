import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
// Use the legacy stylesheet from the backup folder as requested.
// This will apply the original project's styles located at:
// src/Bount3 backup 8-41/Style.css
import './Bount3 backup 8-41/Style.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
