import type State from '../types/State'

const initialState: State = {
  items: [],
  focusTargetId: null,
  loaded: false,
  undoList: [],
  redoList: [],
  webSocketManager: null,
  webSocketState: 'disconnected',
}

export default initialState
