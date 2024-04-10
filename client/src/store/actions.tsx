import type Item from '../types/Item'
import type Action from '../types/Action'

import { webSocketManager } from '../WebSocketManager'
import randomString from '../utils/randomString'
import type {
  AddListItemAction,
  RedoAction,
  RemoveListItemAction,
  UndoAction,
  UndoableAction,
  UpdateListItemCheckedAction,
  UpdateListItemValueAction,
} from '../types/Action'

export const types = {
  ADD_LIST_ITEM: 'ADD_LIST_ITEM' as const,
  REMOVE_LIST_ITEM: 'REMOVE_LIST_ITEM' as const,
  UPDATE_LIST_ITEM_VALUE: 'UPDATE_LIST_ITEM_VALUE' as const,
  UPDATE_LIST_ITEM_CHECKED: 'UPDATE_LIST_ITEM_CHECKED' as const,

  UNDO: 'UNDO' as const,
  REDO: 'REDO' as const,

  // actions only received by server, never send
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA' as const,
}

// Define a type for the actions object to specify the function signatures
type ActionsToDecorate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => Action
}

const addWebSocketManager = (actionsToDecorate: ActionsToDecorate) => {
  Object.entries(actionsToDecorate).forEach(([key, value]) => {
    actionsToDecorate[key] = (...input) => {
      const actionObj = value(...input)
      if (actionObj.type === 'UNDO' || actionObj.type === 'REDO') {
        webSocketManager.sendMessage(actionObj.payload)
      } else {
        webSocketManager.sendMessage(actionObj)
      }
      return actionObj
    }
  })
  return actionsToDecorate
}

const actions = addWebSocketManager({
  removeListItem: (id: string): RemoveListItemAction => ({
    type: types.REMOVE_LIST_ITEM,
    payload: { id },
  }),
  addListItem: (afterId: string, item?: Item): AddListItemAction => ({
    type: types.ADD_LIST_ITEM,
    payload: {
      afterId,
      item: item ?? { id: randomString(), value: '', checked: false },
    },
  }),
  updateListItemValue: (
    id: string,
    newValue: string,
  ): UpdateListItemValueAction => ({
    type: types.UPDATE_LIST_ITEM_VALUE,
    payload: { id, newValue },
  }),
  updateListItemChecked: (
    id: string,
    newChecked: boolean,
  ): UpdateListItemCheckedAction => ({
    type: types.UPDATE_LIST_ITEM_CHECKED,
    payload: { id, newChecked },
  }),
  undo: (action: UndoableAction): UndoAction => ({
    type: types.UNDO,
    payload: action,
  }),
  redo: (action: UndoableAction): RedoAction => ({
    type: types.REDO,
    payload: action,
  }),
})

export default actions
