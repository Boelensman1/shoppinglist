import type WebSocketManager from '@/lib/WebSocketManager'
import type IndexedDbManager from '@/lib/IndexedDbManager'
import type { Action } from '../types/store/Action'
import reducer from './reducer'
import { State } from '@/types/store/State'

export const combinedReducer =
  (wsm: WebSocketManager, idbm: IndexedDbManager) =>
  (draft: State, action: Action) => {
    reducer(draft, action)

    webSocketSend(wsm, action)
    if (draft.idbmLoaded) {
      idbm.updateItems(draft.items)
    }
  }

const webSocketSend = (wsm: WebSocketManager, action: Action) => {
  if (action.from === 'user') {
    if (action.type === 'UNDO' || action.type === 'REDO') {
      wsm.sendMessage(action.payload)
    } else {
      wsm.sendMessage(action)
    }
  }
}
