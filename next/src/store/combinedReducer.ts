import type TrpcManager from '@/lib/TrpcManager'
import type IndexedDbManager from '@/lib/IndexedDbManager'
import type { Action } from '../types/store/Action'
import reducer from './reducer'
import { State } from '@/types/store/State'

export const combinedReducer =
  (trpcm: TrpcManager, idbm: IndexedDbManager) =>
  (draft: State, action: Action) => {
    reducer(draft, action)

    trpcSend(trpcm, action)
    if (draft.idbmLoaded) {
      idbm.updateItems(draft.items)
    }
  }

const trpcSend = (trpcm: TrpcManager, action: Action) => {
  if (action.from === 'user') {
    if (action.type === 'UNDO' || action.type === 'REDO') {
      trpcm.sendAction(action.payload)
    } else {
      trpcm.sendAction(action)
    }
  }
}
