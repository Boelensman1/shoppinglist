'use client'

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react'
import { useImmerReducer } from 'use-immer'
import { v4 as genUuidv4 } from 'uuid'

import { State } from '../types/store/State'
import { Action } from '../types/store/Action'
import initial from './initial'
import { combinedReducer } from './combinedReducer'
import WebSocketManager from '../lib/WebSocketManager'
import IndexedDbManager from '../lib/IndexedDbManager'
import PushNotificationManager from '../lib/PushNotificationManager'
import actions from './actions'

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === '1'

interface StoreContextValue {
  state: State
  dispatch: (action: Action) => void
  wsm: WebSocketManager
  idbm: IndexedDbManager
  pushSub: PushNotificationManager
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined)

const wsm = new WebSocketManager()
const idbm = new IndexedDbManager()
const pushSub = new PushNotificationManager()

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [syncWithServerRequestHandled, setSyncWithServerRequestHandled] =
    useState(true)
  const [state, dispatch] = useImmerReducer(combinedReducer(wsm, idbm), initial)

  useEffect(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = IS_LOCAL
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath ? basePath + '/' : ''}ws/`

    // Connect to WebSocket and pass the dispatch function
    wsm.connect(wsUrl, dispatch)

    // Set timeout for websocket to connect (this is the time the loading animtation plays before we give up)
    // Only set timeout if user is online
    if (navigator.onLine) {
      const tId = setTimeout(() => {
        dispatch(actions.websocketConnectionTimeoutExceeded())
      }, 2000)
      return () => clearTimeout(tId)
    } else {
      // if the user is offline, assume the timeout will be exceeded and stop loading immediately (the websocket will keep trying to connect in the background)
      dispatch(actions.websocketConnectionTimeoutExceeded())
    }
  }, [dispatch])

  useEffect(() => {
    idbm.init().then(async () => {
      let userId = await idbm.getUserId()
      if (!userId) {
        // no userId yet, generate one!
        userId = genUuidv4()
        await idbm.saveUserId(userId)
      }
      dispatch(actions.updateUserId(userId))

      await pushSub.initialize(dispatch, userId)

      // Check for pending notification data first
      const pendingItems = await idbm.getPendingNotification()
      if (pendingItems) {
        // Use notification data and clear it
        await idbm.clearPendingNotification()
        dispatch({
          type: 'INITIAL_FULL_DATA',
          payload: pendingItems,
          from: 'idbm',
        })
      } else {
        // No notification, load from IndexedDB as usual
        const items = await idbm.getItems()
        dispatch({
          type: 'INITIAL_FULL_DATA',
          payload: Object.values(items),
          from: 'idbm',
        })
      }
    })
  }, [dispatch])

  // Sync with server when page becomes visible (works for both browser and installed PWA)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setSyncWithServerRequestHandled(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (syncWithServerRequestHandled) {
      // already handled the sync with server request, nothing to do
      return
    }

    if (!state.idbmLoaded || state.webSocketState !== 'connected') {
      // not loaded/connected yet, wait for syncing untill we are
      return
    }

    // no risk for cascading re-renders, this effect is stable
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncWithServerRequestHandled(true)
    wsm.syncWithServer()
  }, [state.webSocketState, state.idbmLoaded, syncWithServerRequestHandled])

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        wsm,
        idbm,
        pushSub,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
