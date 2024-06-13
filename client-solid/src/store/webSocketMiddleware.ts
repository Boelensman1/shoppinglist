import WebSocketManager from '../WebSocketManager'
import type Action from './types/Action'

const webSocketSend = (wsm: WebSocketManager, action: Action) => {
  if (wsm.isConnected) {
    if (!action.private && !action.fromServer) {
      if (action.type === 'UNDO' || action.type === 'REDO') {
        wsm.sendMessage(action.payload)
      } else {
        wsm.sendMessage(action)
      }
    }
  }
}

export default webSocketSend
