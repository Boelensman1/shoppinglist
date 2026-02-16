import type { Item } from '@shoppinglist/shared'
import type { UndoableAction } from './Action'

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
