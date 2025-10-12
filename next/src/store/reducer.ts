import type { State } from '../types/store/State'
import type { Action } from '../types/store/Action'

import { types } from './actions'
import { UndoableAction } from '../types/store/Action'
import { ItemId } from '../types/store/Item'

const canUndo = (action: UndoableAction) =>
  !action.redo && action.from === 'user'

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
          from: 'user',
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
          from: 'user',
        })
      }
      break
    }
    case types.REMOVE_LIST_ITEM: {
      const { id } = action.payload
      const deletedItem = draft.items[id]
      draft.items[id].deleted = true

      // focus the previous item
      if (action.payload.displayedNextItemId) {
        draft.focusTargetId = action.payload.displayedNextItemId
      } else if (action.payload.displayedPrevItemId) {
        draft.focusTargetId = action.payload.displayedPrevItemId
      }

      if (canUndo(action)) {
        undoList.push({
          type: types.ADD_LIST_ITEM,
          redo: action,
          payload: { ...deletedItem, deleted: false },
          from: 'user',
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
          from: 'user',
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
          from: 'user',
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
          from: 'user',
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
      // check that we don't overwrite the server data with idbm data
      if (action.from !== 'idbm' || draft.serverLoaded !== true) {
        draft.items = action.payload.reduce<State['items']>((acc, item) => {
          acc[item.id] = item
          return acc
        }, {})
      }

      if (action.from === 'idbm') {
        draft.idbmLoaded = true
      }
      if (action.from === 'server') {
        draft.serverLoaded = true
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

    case types.UPDATE_USER_ID: {
      draft.userId = action.payload.userId
      break
    }

    case types.UPDATE_HAS_PUSH_SUBSCRIPTION: {
      draft.hasPushNotificationsSubscription = action.payload.hasSubscription
      break
    }

    case types.UPDATE_CAN_SUBSCRIBE: {
      draft.canEnablePushNotifications = action.payload.canSubscribe
      break
    }

    case types.FOCUS_PROCESSED: {
      draft.focusTargetId = null
      break
    }
  }
}

const reducer = (draft: State, action: Action) => {
  applyAction(action, draft)
}

export default reducer
