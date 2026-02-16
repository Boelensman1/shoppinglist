import type { ItemRecords } from '@shoppinglist/shared'
import type { UndoableAction } from './Action'

export interface State {
  userId: string
  items: ItemRecords
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
