import type State from './types/State'
import type Action from './types/Action'

import { types } from './actions'

const reducer = (action: Action, draft: State) => {
  switch (action.type) {
    case types.ADD_LIST_ITEM: {
      const { afterId, ...item } = action.payload
      const afterIndex = draft.items.findIndex((item) => item.id === afterId)

      draft.items.splice(afterIndex + 1, 0, item)
      draft.focusTargetId = item.id

      if (!action.redo && !action.fromServer) {
        draft.undoList.push({
          type: types.REMOVE_LIST_ITEM,
          redo: action,
          payload: { id: item.id },
        })
      }
      break
    }
    case types.REMOVE_LIST_ITEM: {
      const index = draft.items.findIndex(
        (item) => item.id === action.payload.id,
      )
      const [deletedItem] = draft.items.splice(index, 1)

      if (!action.redo && !action.fromServer) {
        draft.undoList.push({
          type: types.ADD_LIST_ITEM,
          redo: action,
          payload: {
            afterId: draft.items[index - 1].id,
            ...deletedItem,
          },
        })
      }

      if (draft.items.length > index) {
        // Focus the item below
        draft.focusTargetId = draft.items[index].id
      } else {
        // Focus the item above if it was the last item
        draft.focusTargetId = draft.items[index - 1].id
      }
      break
    }
    case types.UPDATE_LIST_ITEM_VALUE: {
      const index = draft.items.findIndex(
        (item) => item.id === action.payload.id,
      )

      if (!action.redo && !action.fromServer) {
        const oldValue = draft.items[index].value
        draft.undoList.push({
          type: types.UPDATE_LIST_ITEM_VALUE,
          redo: action,
          payload: { id: action.payload.id, newValue: oldValue },
        })
      }

      /*
      draft.items[index] = {
        ...draft.items[index],
        value: action.payload.newValue,
      }

      */
      draft.items[index].value = action.payload.newValue

      break
    }
    case types.UPDATE_LIST_ITEM_CHECKED: {
      const index = draft.items.findIndex(
        (item) => item.id === action.payload.id,
      )

      if (!action.redo && !action.fromServer) {
        const oldChecked = draft.items[index].checked
        draft.undoList.push({
          type: types.UPDATE_LIST_ITEM_CHECKED,
          redo: action,
          payload: { id: action.payload.id, newChecked: oldChecked },
        })
      }

      // Find the last unchecked item
      let lastUncheckedIndex = draft.items.length - 1
      while (
        lastUncheckedIndex >= 0 &&
        draft.items[lastUncheckedIndex].checked
      ) {
        lastUncheckedIndex--
      }

      // update item
      draft.items[index] = {
        ...draft.items[index],
        checked: action.payload.newChecked,
      }

      if (lastUncheckedIndex === index) {
        break
      }

      // Move it to the end of the unchecked array
      const [item] = draft.items.splice(index, 1)
      if (lastUncheckedIndex === -1) {
        // Put it at the start if all other items are checked
        draft.items.unshift(item)
      } else {
        // Insert before/after the last unchecked item, depending on checked
        draft.items.splice(
          lastUncheckedIndex + Number(!action.payload.newChecked),
          0,
          item,
        )
      }
      break
    }
    case types.INITIAL_FULL_DATA: {
      draft.items = action.payload
      console.log('items', draft.items)
      draft.loaded = true
      break
    }
    case types.UNDO: {
      const undoActionDone = draft.undoList.pop()
      if (undoActionDone) {
        draft.redoList.push(undoActionDone.redo!)
      }
      break
    }
    case types.REDO: {
      draft.redoList.pop()
      break
    }

    case types.WEBSOCKET_CONNECTIONSTATE_CHANGED: {
      draft.webSocketState = action.payload
      break
    }
  }
}

export default reducer
