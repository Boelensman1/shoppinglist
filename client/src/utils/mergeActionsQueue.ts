import { isUndoableAction } from '../store/actions'
import Action, {
  MergeableUndoableAction,
  UndoableAction,
} from '../store/types/Action'

const canMerge = (a: UndoableAction): a is MergeableUndoableAction =>
  // @ts-expect-error could be an UndoableAction instead of an MergeableUndoableAction
  a.payload && typeof a.payload.id !== 'undefined'

export const mergeActionsQueue = (actions: Action[]) => {
  return actions.reduce((acc, action) => {
    if (!isUndoableAction(action)) {
      return acc
    }

    switch (action.type) {
      case 'UPDATE_LIST_ITEM_CHECKED':
      case 'UPDATE_LIST_ITEM_VALUE': {
        const existing = acc.find(
          (a) =>
            canMerge(a) &&
            a.payload.id === action.payload.id &&
            a.type === action.type,
        ) as MergeableUndoableAction | undefined
        if (existing) {
          existing.payload = action.payload
          return acc
        }
        break
      }
      case 'REMOVE_LIST_ITEM': {
        const addedWhileOffline = acc.find(
          (a) =>
            canMerge(a) &&
            a.payload.id === action.payload.id &&
            a.type === 'ADD_LIST_ITEM',
        ) as MergeableUndoableAction | undefined
        const newAcc = acc.filter(
          (a) => canMerge(a) && a.payload.id !== action.payload.id,
        )

        if (!addedWhileOffline) {
          newAcc.push(action)
        }
        return newAcc
      }
    }

    acc.push(action)
    return acc
  }, [] as UndoableAction[])
}
