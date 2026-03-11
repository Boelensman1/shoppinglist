import type { ItemRecords, ListId, ListRecords } from 'server/shared'
import type { UndoableAction } from './Action'

export interface State {
  userId: string
  items: ItemRecords
  lists: ListRecords
  activeListId: ListId
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
