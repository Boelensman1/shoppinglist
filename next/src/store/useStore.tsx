'use client'

import {
  createContext,
  useContext,
  ReactNode,
  useRef,
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

interface StoreContextValue {
  state: State
  dispatch: (action: Action) => void
  wsm: WebSocketManager
  idbm: IndexedDbManager
  pushSubRef: PushNotificationManager
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined)

export const useStore = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [focusEventHandled, setFocusEventHandled] = useState(false)
  const wsmRef = useRef<WebSocketManager>(new WebSocketManager())
  const idbmRef = useRef<IndexedDbManager>(new IndexedDbManager())
  const pushSubRef = useRef<PushNotificationManager>(
    new PushNotificationManager(),
  )
  const [state, dispatch] = useImmerReducer(
    combinedReducer(wsmRef.current, idbmRef.current),
    initial,
  )

  useEffect(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = window.location.host.startsWith('localhost')
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath ? basePath + '/' : ''}ws/`

    // Connect to WebSocket and pass the dispatch function
    wsmRef.current.connect(wsUrl, dispatch)

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
    idbmRef.current.init().then(async () => {
      let userId = await idbmRef.current.getUserId()
      if (!userId) {
        // no userId yet, generate one!
        userId = genUuidv4()
        await idbmRef.current.saveUserId(userId)
      }
      dispatch(actions.updateUserId(userId))

      await pushSubRef.current.initialize(dispatch, userId)

      // Check for pending notification data first
      const pendingItems = await idbmRef.current.getPendingNotification()
      if (pendingItems) {
        // Use notification data and clear it
        await idbmRef.current.clearPendingNotification()
        dispatch({
          type: 'INITIAL_FULL_DATA',
          payload: pendingItems,
          fromUser: false,
          fromIdbm: true,
        })
      } else {
        // No notification, load from IndexedDB as usual
        const items = await idbmRef.current.getItems()
        dispatch({
          type: 'INITIAL_FULL_DATA',
          payload: Object.values(items),
          fromUser: false,
          fromIdbm: true,
        })
      }
    })
  }, [dispatch])

  // Sync with server when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      setFocusEventHandled(false)
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    if (focusEventHandled) {
      return
    }

    if (state.webSocketState === 'connected') {
      setFocusEventHandled(true)
      wsmRef.current.sendMessage(actions.syncWithServer([]), false)
    }
  }, [state.webSocketState, focusEventHandled])

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        wsm: wsmRef.current,
        idbm: idbmRef.current,
        pushSubRef: pushSubRef.current,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
