import { produce } from 'solid-js/store'
import type { Component, JSX } from 'solid-js'

import Context from './Context'
import store from './store'
// import State from './types/State'
import Action from './types/Action'
import webSocketSend from './webSocketMiddleware'

import reducer from './reducer'
import WebSocketManager from '../WebSocketManager'

interface ProviderProps {
  wsm: WebSocketManager
  children: JSX.Element
}

const dispatch = (action: Action) => {
  store.setState(
    produce((state) => {
      reducer(action, state)
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
          dispatch(action)
        },
      ]}
    >
      {props.children}
    </Context.Provider>
  )
}

export default Provider
