import type { State } from '../types/store/State'
import type { Action } from '../types/store/Action'

import { types } from './actions'
import { UndoableAction } from '../types/store/Action'
import { ItemId } from '../types/store/Item'

const canUndo = (action: UndoableAction) =>
  !action.redo && (action.fromUser ?? true)

const applyAction = (
  action: Action,
  draft: State,
  seperateUndoList?: UndoableAction[],
) => {
  const undoList = seperateUndoList ?? draft.undoList

  switch (action.type) {
    case types.BATCH: {
      const batchUndoList: UndoableAction[] = []
      // Execute each action in the batch
      action.payload.forEach((batchAction) => {
        applyAction(batchAction, draft, batchUndoList)
      })

      if (canUndo(action)) {
        undoList.push({
          type: types.BATCH,
          redo: action,
          payload: batchUndoList.reverse(),
        })
      }
      break
    }
    case types.ADD_LIST_ITEM: {
      draft.items[action.payload.id] = action.payload
      draft.focusTargetId = action.payload.id

      if (canUndo(action)) {
        undoList.push({
          type: types.REMOVE_LIST_ITEM,
          redo: action,
          payload: { id: action.payload.id },
        })
      }
      break
    }
    case types.REMOVE_LIST_ITEM: {
      const { id } = action.payload
      const deletedItem = draft.items[id]
      draft.items[id].deleted = true

      if (canUndo(action)) {
        undoList.push({
          type: types.ADD_LIST_ITEM,
          redo: action,
          payload: { ...deletedItem, deleted: false },
        })
      }
      break
    }
    case types.CLEAR_LIST: {
      if (canUndo(action)) {
        const oldList = draft.items
        undoList.push({
          type: types.SET_LIST,
          redo: action,
          payload: oldList,
        })
      }

      draft.items = {
        INITIAL: {
          id: 'INITIAL' as ItemId,
          value: '',
          prevItemId: 'HEAD',
          checked: false,
          deleted: false,
        },
      }
      break
    }
    case types.UPDATE_LIST_ITEM_VALUE: {
      const { id } = action.payload

      if (canUndo(action)) {
        const oldValue = draft.items[id].value
        undoList.push({
          type: types.UPDATE_LIST_ITEM_VALUE,
          redo: action,
          payload: { id: action.payload.id, newValue: oldValue },
        })
      }
      draft.items[id].value = action.payload.newValue

      break
    }
    case types.UPDATE_LIST_ITEM_CHECKED: {
      const { id } = action.payload

      if (canUndo(action)) {
        const oldChecked = draft.items[id].checked
        undoList.push({
          type: types.UPDATE_LIST_ITEM_CHECKED,
          redo: action,
          payload: { id: action.payload.id, newChecked: oldChecked },
        })
      }

      // update item
      draft.items[id] = {
        ...draft.items[id],
        checked: action.payload.newChecked,
      }

      break
    }
    case types.SET_LIST: {
      draft.items = action.payload
      break
    }
    case types.INITIAL_FULL_DATA: {
      draft.items = action.payload.reduce<State['items']>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})
      if (action.fromIdbm) {
        draft.idbmLoaded = true
      }
      break
    }
    case types.UNDO: {
      const index = draft.undoList.indexOf(action.payload)
      draft.undoList.splice(index, 1)

      applyAction(action.payload, draft, undoList)
      draft.redoList.push(action.payload.redo!)
      break
    }
    case types.REDO: {
      const index = draft.redoList.indexOf(action.payload)
      draft.redoList.splice(index, 1)

      applyAction(action.payload, draft, undoList)
      break
    }

    case types.WEBSOCKET_CONNECTIONSTATE_CHANGED: {
      draft.webSocketState = action.payload
      break
    }

    case types.WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED: {
      draft.wsConnectTimedOut = true
      break
    }
  }
}

const reducer = (draft: State, action: Action) => {
  applyAction(action, draft)
}

export default reducer
