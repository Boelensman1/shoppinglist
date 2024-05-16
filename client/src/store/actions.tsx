import type Item from '../types/Item'

import type WebSocketManager from '../WebSocketManager'
import randomString from '../utils/randomString'
import type {
  AddListItemAction,
  ConnectWebSocketManagerAction,
  WebsocketConnectionStateChangedAction,
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

  // actions that should not be forwarded
  CONNECT_WEBSOCKET_MANAGER: 'CONNECT_WEBSOCKET_MANAGER' as const,
  WEBSOCKET_CONNECTIONSTATE_CHANGED:
    'WEBSOCKET_CONNECTIONSTATE_CHANGED' as const,
}

const actions = {
  connectWebSocketManager: (
    wsm: WebSocketManager,
  ): ConnectWebSocketManagerAction => ({
    type: types.CONNECT_WEBSOCKET_MANAGER,
    payload: wsm,
    private: true,
  }),
  webSocketConnectionStateChanged: (
    newState: WebsocketConnectionStateChangedAction['payload'],
  ): WebsocketConnectionStateChangedAction => ({
    type: types.WEBSOCKET_CONNECTIONSTATE_CHANGED,
    payload: newState,
    private: true,
  }),
  removeListItem: (id: string): RemoveListItemAction => ({
    type: types.REMOVE_LIST_ITEM,
    payload: { id },
  }),
  addListItem: (afterId: string, item?: Item): AddListItemAction => {
    return {
      type: types.ADD_LIST_ITEM,
      payload: {
        afterId,
        item: item ?? { id: randomString(), value: '', checked: false },
      },
    }
  },
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
}

export default actions
