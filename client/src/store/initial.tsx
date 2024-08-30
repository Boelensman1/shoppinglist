import State from './types/State'

const initial: State = {
  items: [],
  focusTargetId: null,
  loaded: false,
  undoList: [],
  redoList: [],
  webSocketState: 'disconnected',
}

export default initial
