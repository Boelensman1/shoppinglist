import { type Dispatch } from 'react'

import type Action from './types/Action'

class WebSocketManager {
  private static instance: WebSocketManager
  private webSocket: WebSocket | null = null
  private dispatch: Dispatch<Action> | null = null

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  connect(url: string, dispatch: Dispatch<Action>) {
    this.dispatch = dispatch // Set the dispatch function
    this.webSocket = new WebSocket(url)

    this.webSocket.onopen = () => {
      console.log('WebSocket connected.')
    }

    this.webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (this.dispatch) {
        this.dispatch({
          type: message.type,
          fromServer: true,
          payload: message.payload,
        })
      }
    }

    this.webSocket.onclose = () => {
      console.log('WebSocket disconnected.')
      this.webSocket = null
      this.dispatch = null // Clear the dispatch function on disconnect
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

export const webSocketManager = WebSocketManager.getInstance()
