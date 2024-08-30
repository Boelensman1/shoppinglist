/* @refresh reload */
import { render } from 'solid-js/web'

import './index.css'
import App from './App'
import StoreProvider from './store/provider'
import WebSocketManager from './WebSocketManager'
import IndexedDbManager from './IndexedDbManager'

const root = document.getElementById('root')

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  )
}

render(() => {
  const wsm = new WebSocketManager()
  const idbm = new IndexedDbManager()

  return (
    <StoreProvider wsm={wsm} idbm={idbm}>
      <App wsm={wsm} idbm={idbm} />
    </StoreProvider>
  )
}, root!)
