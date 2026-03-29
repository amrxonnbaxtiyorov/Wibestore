import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GoogleAuthProvider } from './context/GoogleAuthContext'
import queryClient from './lib/reactQuery'

// Fresh launch: clear legacy cache so API is the only source for listings/reviews/stats
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('wibeListings')
    localStorage.removeItem('wibeReviews')
    localStorage.removeItem('wibeSellerRatings')
  }
} catch {
  // Intentionally ignore: localStorage may be unavailable (e.g. private mode)
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const hasGoogleAuth = CLIENT_ID.length > 0

function AppRoot() {
  const content = <App />
  return (
    <GoogleAuthProvider enabled={hasGoogleAuth}>
      {hasGoogleAuth ? (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          {content}
        </GoogleOAuthProvider>
      ) : (
        content
      )}
    </GoogleAuthProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRoot />
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialPosition="bottom-right" />
      )}
    </QueryClientProvider>
  </StrictMode>,
)
