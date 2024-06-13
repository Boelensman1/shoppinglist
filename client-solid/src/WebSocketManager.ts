import { createWS } from '@solid-primitives/websocket'

import type Action from './store/types/Action'
import type Dispatch from './store/types/Dispatch'
import actions from './store/actions'

class WebSocketManager {
  private webSocket: WebSocket | null = null
  private dispatch: Dispatch<Action> | null = null
  private shouldReconnect = true
  private reconnectTimeout: NodeJS.Timeout | null = null

  get isConnected() {
    return !!this.webSocket?.OPEN
  }

  connect(url: string, dispatch: Dispatch<Action>) {
    console.log('Websocket connecting...')
    this.dispatch = dispatch // Set the dispatch function

    this.webSocket = createWS(url)

    this.webSocket.onopen = () => {
      console.log('WebSocket connected.')
      dispatch(actions.webSocketConnectionStateChanged('connected'))
    }

    this.webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (this.dispatch) {
        this.dispatch({
          ...message,
          fromServer: true,
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

  sendMessage(message: object) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message))
    } else {
      console.log('WebSocket is not connected.')
    }
  }
}

export default WebSocketManager
