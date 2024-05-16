import { Dispatch } from 'react'
import type Action from '../types/Action'
import State from '../types/State'

const webSocketMiddleware =
  (dispatch: Dispatch<Action>, state: State) => (action: Action) => {
    if (state.webSocketManager?.isConnected) {
      if (!action.private && !action.fromServer) {
        if (action.type === 'UNDO' || action.type === 'REDO') {
          state.webSocketManager.sendMessage(action.payload)
        } else {
          state.webSocketManager.sendMessage(action)
        }
      }
    }
    dispatch(action)
  }

export default webSocketMiddleware
