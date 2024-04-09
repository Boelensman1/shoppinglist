import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/inter'

import CssBaseline from '@mui/joy/CssBaseline'
import { CssVarsProvider } from '@mui/joy/styles'

import App from './App.tsx'
import StoreProvider from './store/provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CssBaseline />
    <CssVarsProvider>
      <StoreProvider>
        <main>
          <App />
        </main>
      </StoreProvider>
    </CssVarsProvider>
  </React.StrictMode>,
)
