import type { UndoableAction } from './Action'
import type { Item } from './Item'

export interface State {
  items: Record<string, Item>
  focusTargetId: string | null
  idbmLoaded: boolean
  wsConnectTimedOut: boolean
  undoList: UndoableAction[]
  redoList: UndoableAction[]
  webSocketState: 'connected' | 'disconnected'
}
