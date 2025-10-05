import type { PushSubscription } from 'web-push'
import type { types } from '../../store/actions'
import type { Item } from './Item'
import type { State } from './State'

interface BaseAction {
  fromUser?: false
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
  payload: Item
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
  fromUser: false
  fromIdbm?: true
}

export interface SetListAction extends BaseAction {
  type: typeof types.SET_LIST
  payload: State['items']
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

export interface WebsocketConnectionTimeoutExceeded extends BaseAction {
  type: typeof types.WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED
  private: true
}

export interface BatchAction extends BaseAction {
  type: typeof types.BATCH
  redo?: UndoableAction
  payload: UndoableAction[]
}

export interface SignalFinishedShoppingList extends BaseAction {
  type: typeof types.SIGNAL_FINISHED_SHOPPINGLIST
  payload: { userId: string }
}

export interface SubscribeUserPushNotifications extends BaseAction {
  type: typeof types.SUBSCRIBE_USER_PUSH_NOTIFICATIONS
  payload: { userId: string; subscription: PushSubscription }
}

export interface UnSubscribeUserPushNotifications extends BaseAction {
  type: typeof types.UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS
  payload: { userId: string }
}

export interface UpdateUserIdAction extends BaseAction {
  type: typeof types.UPDATE_USER_ID
  payload: { userId: string }
  fromUser: false
  fromIdbm?: true
}

export interface UpdateHasPushSubscriptionAction extends BaseAction {
  type: typeof types.UPDATE_HAS_PUSH_SUBSCRIPTION
  payload: { hasSubscription: boolean }
  fromUser: false
  private: true
}

export interface UpdateCanSubscribeAction extends BaseAction {
  type: typeof types.UPDATE_CAN_SUBSCRIBE
  payload: { canSubscribe: boolean }
  fromUser: false
  private: true
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

export type Action =
  | UndoableAction
  | InitialFullDataAction
  | UndoAction
  | RedoAction
  | WebsocketConnectionStateChangedAction
  | WebsocketConnectionTimeoutExceeded
  | SyncWithServerAction
  | SignalFinishedShoppingList
  | SubscribeUserPushNotifications
  | UnSubscribeUserPushNotifications
  | UpdateUserIdAction
  | UpdateHasPushSubscriptionAction
  | UpdateCanSubscribeAction
