import type { Action } from '../types/store/Action'
import type { Dispatch } from '../types/store/Dispatch'
import actions from '../store/actions'

import { isUndoableAction } from '../store/actions'

class WebSocketManager {
  private webSocket: WebSocket | null = null
  private dispatch: Dispatch<Action> | null = null
  private shouldReconnect = true
  private reconnectTimeout: NodeJS.Timeout | null = null

  private offlineMessageQueue: Action[] = []

  get isConnected() {
    return this.webSocket?.readyState === WebSocket.OPEN
  }

  connect(url: string, dispatch: Dispatch<Action>) {
    console.log('Websocket connecting...')
    this.dispatch = dispatch // Set the dispatch function

    this.webSocket = new WebSocket(url)

    this.webSocket.onopen = () => {
      console.log('WebSocket connected.')

      const offlineActions = this.offlineMessageQueue.filter((action) =>
        isUndoableAction(action),
      )
      this.sendMessage(actions.syncWithServer(offlineActions), false)
      this.offlineMessageQueue = []

      dispatch(actions.webSocketConnectionStateChanged('connected'))
    }

    this.webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (this.dispatch) {
        this.dispatch({
          ...message,
          fromUser: false,
        })
      }
    }

    this.webSocket.onclose = () => {
      console.log('WebSocket disconnected.')
      dispatch(actions.webSocketConnectionStateChanged('disconnected'))

      this.webSocket = null
      this.dispatch = null // Clear the dispatch function on disconnect

      if (this.shouldReconnect) {
        this.reconnectTimeout = setTimeout(
          () => this.connect(url, dispatch.bind(null)),
          1000,
        )
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.webSocket) {
      this.webSocket.close()
    }
    if (this.reconnectTimeout) {
      console.log('Clearing timeout')
      clearTimeout(this.reconnectTimeout)
    }
  }

  sendMessage(message: Action, queueIfOffline = true) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message))
    } else {
      if (queueIfOffline) {
        this.offlineMessageQueue.push(message)
      }
    }
  }
}

export default WebSocketManager
