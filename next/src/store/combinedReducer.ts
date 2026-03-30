import type TrpcManager from '@/lib/TrpcManager'
import type IndexedDbManager from '@/lib/IndexedDbManager'
import type { Action } from '../types/store/Action'
import reducer, { injectHlcTimestamp } from './reducer'
import { State } from '@/types/store/State'

export const combinedReducer =
  (trpcm: TrpcManager, idbm: IndexedDbManager) =>
  (draft: State, action: Action) => {
    reducer(draft, action)

    trpcSend(trpcm, action)
    if (draft.idbmLoaded) {
      idbm.updateItems(draft.items).catch(console.error)
      idbm.updateLists(draft.lists).catch(console.error)
    }
  }

const trpcSend = (trpcm: TrpcManager, action: Action) => {
  if (action.from === 'user') {
    if (action.type === 'UNDO' || action.type === 'REDO') {
      trpcm.sendAction(injectHlcTimestamp(action.payload, action.hlcTimestamp))
    } else {
      trpcm.sendAction(action)
    }
  }
}
