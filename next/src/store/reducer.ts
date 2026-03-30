import type { ItemId, ListId } from 'server/shared'
import type { State } from '../types/store/State'
import type { Action } from '../types/store/Action'

import { types } from './actions'
import { UndoableAction, UndoEntry } from '../types/store/Action'

const canUndo = (action: UndoableAction) =>
  !action.redo && action.from === 'user'

export const injectHlcTimestamp = (
  entry: UndoEntry,
  hlcTimestamp: string,
): UndoableAction => {
  if (Array.isArray(entry.payload)) {
    return {
      ...entry,
      payload: entry.payload.map((e) => injectHlcTimestamp(e, hlcTimestamp)),
    } as UndoableAction
  }
  return {
    ...entry,
    payload: { ...entry.payload, hlcTimestamp },
  } as UndoableAction
}

const applyAction = (
  action: Action,
  draft: State,
  seperateUndoList?: UndoEntry[],
) => {
  const undoList = seperateUndoList ?? draft.undoList

  switch (action.type) {
    case types.BATCH: {
      const batchUndoList: UndoEntry[] = []
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
      draft.items[id].hlcTimestamp = action.payload.hlcTimestamp

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
      const listId = action.payload.listId

      if (canUndo(action)) {
        const oldList = draft.items
        undoList.push({
          type: types.SET_LIST,
          redo: action,
          payload: oldList,
          from: 'user',
        })
      }

      // Remove only items belonging to this list
      for (const id of Object.keys(draft.items)) {
        if (draft.items[id as ItemId].listId === listId) {
          delete draft.items[id as ItemId]
        }
      }

      // Add initial item for this list
      const initialItemId = (
        listId === ('default' as ListId) ? 'INITIAL' : `initial-${listId}`
      ) as ItemId
      draft.items[initialItemId] = {
        id: initialItemId,
        value: '',
        prevItemId: 'HEAD',
        checked: false,
        deleted: false,
        listId,
        hlcTimestamp: action.payload.hlcTimestamp,
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
      draft.items[id].hlcTimestamp = action.payload.hlcTimestamp

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
        hlcTimestamp: action.payload.hlcTimestamp,
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
        const incoming = action.payload.items

        if (action.from === 'server') {
          // Per-item LWW merge: keep whichever has the newer timestamp
          for (const [id, serverItem] of Object.entries(incoming)) {
            const localItem = draft.items[id as ItemId]
            if (
              !localItem ||
              serverItem.hlcTimestamp >= localItem.hlcTimestamp
            ) {
              draft.items[id as ItemId] = serverItem
            }
          }
          // Remove items that exist locally but not on server,
          // only if we can confirm they're older than the server state.
          // Items with newer timestamps were added locally and haven't
          // been synced yet — keep them.
          const maxServerTs = Object.values(incoming).reduce<string>(
            (max, item) =>
              item.hlcTimestamp && item.hlcTimestamp > max
                ? item.hlcTimestamp
                : max,
            '',
          )
          for (const id of Object.keys(draft.items)) {
            if (!incoming[id as ItemId]) {
              const localTs = draft.items[id as ItemId].hlcTimestamp
              if (maxServerTs && localTs && localTs <= maxServerTs) {
                delete draft.items[id as ItemId]
              }
            }
          }
        } else {
          // For idbm loads, wholesale replace (no merge needed)
          draft.items = incoming
        }

        draft.lists = action.payload.lists
        // Set activeListId if not yet set or if current active list doesn't exist
        if (!draft.activeListId || !action.payload.lists[draft.activeListId]) {
          const listIds = Object.keys(action.payload.lists) as ListId[]
          if (listIds.length > 0) {
            draft.activeListId = listIds[0]
          }
        }
      }

      if (action.from === 'idbm') {
        draft.idbmLoaded = true
      }
      if (action.from === 'server') {
        draft.serverLoaded = true
      }
      break
    }
    case types.ADD_LIST: {
      const list = action.payload
      draft.lists[list.id] = list
      // Add initial empty item for the new list
      const newInitialId = `initial-${list.id}` as ItemId
      draft.items[newInitialId] = {
        id: newInitialId,
        value: '',
        prevItemId: 'HEAD',
        checked: false,
        deleted: false,
        listId: list.id as unknown as ListId,
        hlcTimestamp: action.payload.hlcTimestamp,
      }
      break
    }
    case types.UPDATE_LIST: {
      const list = action.payload
      if (draft.lists[list.id]) {
        draft.lists[list.id].name = list.name
        draft.lists[list.id].colour = list.colour
      }
      break
    }
    case types.REMOVE_LIST: {
      const { id } = action.payload
      delete draft.lists[id]
      // Remove items belonging to this list
      for (const itemId of Object.keys(draft.items)) {
        if (draft.items[itemId as ItemId].listId === id) {
          delete draft.items[itemId as ItemId]
        }
      }
      // Switch active list if needed
      if (draft.activeListId === id) {
        const remainingIds = Object.keys(draft.lists) as ListId[]
        if (remainingIds.length > 0) {
          draft.activeListId = remainingIds[0]
          localStorage.setItem('activeListId', remainingIds[0])
        }
      }
      break
    }
    case types.SWITCH_ACTIVE_LIST: {
      draft.activeListId = action.payload.id
      localStorage.setItem('activeListId', action.payload.id)
      break
    }
    case types.UNDO: {
      const index = draft.undoList.indexOf(action.payload)
      draft.undoList.splice(index, 1)

      const withTimestamp = injectHlcTimestamp(
        action.payload,
        action.hlcTimestamp,
      )
      applyAction(withTimestamp, draft, undoList)
      if (action.payload.redo) {
        draft.redoList.push(action.payload.redo)
      }
      break
    }
    case types.REDO: {
      const index = draft.redoList.indexOf(action.payload)
      draft.redoList.splice(index, 1)

      const withTimestamp = injectHlcTimestamp(
        action.payload,
        action.hlcTimestamp,
      )
      applyAction(withTimestamp, draft, undoList)
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
