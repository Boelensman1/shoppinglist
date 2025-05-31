import type { types } from '../actions'
import type Item from './Item'
import type State from './State'

interface BaseAction {
  fromServer?: true
  private?: true
}

export interface RemoveListItemAction extends BaseAction {
  type: typeof types.REMOVE_LIST_ITEM
  redo?: UndoableAction
  payload: {
    id: string
  }
}

export interface ClearListAction extends BaseAction {
  type: typeof types.CLEAR_LIST
  redo?: UndoableAction
}

export interface AddListItemAction extends BaseAction {
  type: typeof types.ADD_LIST_ITEM
  redo?: UndoableAction
  payload: Item & {
    afterId: string
  }
}

export interface UpdateListItemValueAction extends BaseAction {
  type: typeof types.UPDATE_LIST_ITEM_VALUE
  redo?: UndoableAction
  payload: {
    id: string
    newValue: string
  }
}

export interface UpdateListItemCheckedAction extends BaseAction {
  type: typeof types.UPDATE_LIST_ITEM_CHECKED
  redo?: UndoableAction
  payload: {
    id: string
    newChecked: boolean
  }
}

export interface SyncWithServerAction extends BaseAction {
  type: typeof types.SYNC_WITH_SERVER
  payload: UndoableAction[]
}

export interface InitialFullDataAction extends BaseAction {
  type: typeof types.INITIAL_FULL_DATA
  payload: Item[]
  fromServer: true
}

export interface SetListAction extends BaseAction {
  type: typeof types.SET_LIST
  payload: Item[]
  redo?: UndoableAction
}

export interface UndoAction extends BaseAction {
  type: typeof types.UNDO
  payload: UndoableAction
}

export interface RedoAction extends BaseAction {
  type: typeof types.REDO
  payload: UndoableAction
}

export interface WebsocketConnectionStateChangedAction extends BaseAction {
  type: typeof types.WEBSOCKET_CONNECTIONSTATE_CHANGED
  payload: State['webSocketState']
  private: true
}

export interface BatchAction extends BaseAction {
  type: typeof types.BATCH
  redo?: UndoableAction
  payload: UndoableAction[]
}

export type MergeableUndoableAction =
  | RemoveListItemAction
  | AddListItemAction
  | UpdateListItemValueAction
  | UpdateListItemCheckedAction

export type UndoableAction =
  | MergeableUndoableAction
  | ClearListAction
  | SetListAction
  | BatchAction

type Action =
  | UndoableAction
  | InitialFullDataAction
  | UndoAction
  | RedoAction
  | WebsocketConnectionStateChangedAction
  | SyncWithServerAction

export default Action
