import type { ListId } from 'server/shared'
import { State } from '../types/store/State'

const getSavedActiveListId = (): ListId => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('activeListId')
    if (saved) return saved as ListId
  }
  return 'default' as ListId
}

const initial: State = {
  userId: '',
  items: {},
  lists: {},
  activeListId: getSavedActiveListId(),
  focusTargetId: null,
  idbmLoaded: false,
  serverLoaded: false,
  wsConnectTimedOut: false, // grace period for ws to load (we're showing the loading spinner untill this is true)
  undoList: [],
  redoList: [],
  webSocketState: 'disconnected',
  hasPushNotificationsSubscription: false,
  canEnablePushNotifications: false,
}

export default initial
