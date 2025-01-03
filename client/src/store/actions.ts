import Item from './types/Item'

import randomString from '../utils/randomString'
import type {
  AddListItemAction,
  WebsocketConnectionStateChangedAction,
  RedoAction,
  RemoveListItemAction,
  UndoAction,
  UndoableAction,
  UpdateListItemCheckedAction,
  UpdateListItemValueAction,
  SyncWithServerAction,
  ClearListAction,
} from './types/Action'
import Action from './types/Action'

export const types = {
  ADD_LIST_ITEM: 'ADD_LIST_ITEM' as const,
  REMOVE_LIST_ITEM: 'REMOVE_LIST_ITEM' as const,
  UPDATE_LIST_ITEM_VALUE: 'UPDATE_LIST_ITEM_VALUE' as const,
  UPDATE_LIST_ITEM_CHECKED: 'UPDATE_LIST_ITEM_CHECKED' as const,
  CLEAR_LIST: 'CLEAR_LIST' as const,
  SET_LIST: 'SET_LIST' as const,

  UNDO: 'UNDO' as const,
  REDO: 'REDO' as const,

  // actions only received by server, never send
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA' as const,

  SYNC_WITH_SERVER: 'SYNC_WITH_SERVER' as const,

  // actions that should not be forwarded
  WEBSOCKET_CONNECTIONSTATE_CHANGED:
    'WEBSOCKET_CONNECTIONSTATE_CHANGED' as const,
}

const actions = {
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
  clear: (): ClearListAction => ({
    type: types.CLEAR_LIST,
  }),
  addListItem: (afterId: string, item?: Item): AddListItemAction => {
    return {
      type: types.ADD_LIST_ITEM,
      payload: {
        afterId,
        ...(item ?? { id: randomString(), value: '', checked: false }),
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

  syncWithServer: (offlineActions: UndoableAction[]): SyncWithServerAction => ({
    type: types.SYNC_WITH_SERVER,
    payload: offlineActions,
  }),
}

export const isUndoableAction = (action: Action): action is UndoableAction => {
  return [
    types.REMOVE_LIST_ITEM,
    types.ADD_LIST_ITEM,
    types.UPDATE_LIST_ITEM_VALUE,
    types.UPDATE_LIST_ITEM_CHECKED,
    types.CLEAR_LIST,
    types.SET_LIST,
  ].includes((action as UndoableAction).type)
}

export default actions
