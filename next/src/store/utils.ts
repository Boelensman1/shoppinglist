import type { State } from '@/types/store/State'

export const isLoaded = (state: State) =>
  state.idbmLoaded &&
  (state.webSocketState === 'connected' || state.wsConnectTimedOut)
