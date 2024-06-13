import { produce } from 'solid-js/store'
import type { Component, JSX } from 'solid-js'

import Context from './Context'
import store from './store'
// import State from './types/State'
import Action from './types/Action'
import webSocketSend from './sendToWebsocketManager'
import saveItemsInIndexedDb from './saveItemsInIndexedDB'

import reducer from './reducer'
import WebSocketManager from '../WebSocketManager'
import IndexedDbManager from '../IndexedDbManager'

interface ProviderProps {
  wsm: WebSocketManager
  idbm: IndexedDbManager
  children: JSX.Element
}

const dispatch = (idbm: IndexedDbManager, action: Action) => {
  store.setState(
    produce((state) => {
      reducer(action, state)
      if (state.loaded) {
        saveItemsInIndexedDb(idbm, state.items)
      }
    }),
  )
}

const Provider: Component<ProviderProps> = (props) => {
  return (
    <Context.Provider
      value={[
        store.state,
        // eslint-disable-next-line solid/reactivity
        (action: Action) => {
          webSocketSend(props.wsm, action)
          dispatch(props.idbm, action)
        },
      ]}
    >
      {props.children}
    </Context.Provider>
  )
}

export default Provider
