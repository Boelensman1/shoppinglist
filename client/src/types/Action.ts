import type { types } from '../store/actions'
import type Item from './Item'

export interface RemoveListItemAction {
  type: typeof types.REMOVE_LIST_ITEM
  redo?: UndoableAction
  fromServer?: true
  payload: {
    id: string
  }
}

export interface AddListItemAction {
  type: typeof types.ADD_LIST_ITEM
  redo?: UndoableAction
  fromServer?: true
  payload: {
    afterId: string
    item: Item
  }
}

export interface UpdateListItemValueAction {
  type: typeof types.UPDATE_LIST_ITEM_VALUE
  redo?: UndoableAction
  fromServer?: true
  payload: {
    id: string
    newValue: string
  }
}

export interface UpdateListItemCheckedAction {
  type: typeof types.UPDATE_LIST_ITEM_CHECKED
  redo?: UndoableAction
  fromServer?: true
  payload: {
    id: string
    newChecked: boolean
  }
}

export interface InitialFullDataAction {
  type: typeof types.INITIAL_FULL_DATA
  fromServer?: true
  payload: Item[]
}

export interface UndoAction {
  type: typeof types.UNDO
  payload: Action
}

export interface RedoAction {
  type: typeof types.REDO
  payload: Action
}

export type UndoableAction =
  | RemoveListItemAction
  | AddListItemAction
  | UpdateListItemValueAction
  | UpdateListItemCheckedAction

type Action = UndoableAction | InitialFullDataAction | UndoAction | RedoAction

export default Action
