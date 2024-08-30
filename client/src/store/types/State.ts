// import type WebSocketManager from '../WebSocketManager'
import type { UndoableAction } from './Action'
import type Item from './Item'

interface State {
  items: Item[]
  focusTargetId: string | null
  loaded: boolean
  undoList: UndoableAction[]
  redoList: UndoableAction[]
  webSocketState: 'connected' | 'disconnected'
}

export default State
