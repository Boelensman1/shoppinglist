import { State } from '../types/store/State'

const initial: State = {
  items: {},
  focusTargetId: null,
  idbmLoaded: false,
  wsConnectTimedOut: false, // grace period for ws to load (we're showing the loading spinner untill this is true)
  undoList: [],
  redoList: [],
  webSocketState: 'disconnected',
}

export default initial
