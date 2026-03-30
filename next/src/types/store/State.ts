import type { ItemRecords, ListId, ListRecords } from 'server/shared'
import type { UndoEntry } from './Action'

export interface State {
  userId: string
  items: ItemRecords
  lists: ListRecords
  activeListId: ListId
  focusTargetId: string | null
  idbmLoaded: boolean
  serverLoaded: boolean
  wsConnectTimedOut: boolean
  undoList: UndoEntry[]
  redoList: UndoEntry[]
  webSocketState: 'connected' | 'disconnected'
  hasPushNotificationsSubscription: boolean
  canEnablePushNotifications: boolean
}
