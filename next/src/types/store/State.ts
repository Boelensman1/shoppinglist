import type { UndoableAction } from './Action'
import type { Item } from './Item'

export interface State {
  userId: string
  items: Record<string, Item>
  focusTargetId: string | null
  idbmLoaded: boolean
  serverLoaded: boolean
  wsConnectTimedOut: boolean
  undoList: UndoableAction[]
  redoList: UndoableAction[]
  webSocketState: 'connected' | 'disconnected'
  hasPushNotificationsSubscription: boolean
  canEnablePushNotifications: boolean
}
