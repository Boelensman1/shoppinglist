import type Item from '../types/Item'
import type Action from '../types/Action'

import { webSocketManager } from '../WebSocketManager'
import randomString from '../utils/randomString'

export const types = {
  ADD_LIST_ITEM: 'ADD_LIST_ITEM',
  REMOVE_LIST_ITEM: 'REMOVE_LIST_ITEM',
  UPDATE_LIST_ITEM_VALUE: 'UPDATE_LIST_ITEM_VALUE',
  UPDATE_LIST_ITEM_CHECKED: 'UPDATE_LIST_ITEM_CHECKED',
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
      webSocketManager.sendMessage(actionObj)
      return actionObj
    }
  })
  return actionsToDecorate
}

const actions = addWebSocketManager({
  removeListItem: (id: string) => ({
    type: types.REMOVE_LIST_ITEM,
    payload: { id },
  }),
  addListItem: (afterId: string, item?: Item) => ({
    type: types.ADD_LIST_ITEM,
    payload: {
      afterId,
      item: item ?? { id: randomString(), value: '', checked: false },
    },
  }),
  updateListItemValue: (id: string, newValue: string) => ({
    type: types.UPDATE_LIST_ITEM_VALUE,
    payload: { id, newValue },
  }),
  updateListItemChecked: (id: string, newChecked: boolean) => ({
    type: types.UPDATE_LIST_ITEM_CHECKED,
    payload: { id, newChecked },
  }),
})

export default actions
