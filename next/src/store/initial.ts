import type { ListId } from 'server/shared'
import { State } from '../types/store/State'

const initial: State = {
  userId: '',
  items: {},
  lists: {},
  activeListId: 'default' as ListId,
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
