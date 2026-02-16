import type {
  ParsedMessage_addItem,
  ParsedMessage_batch,
  ParsedMessage_clearList,
  ParsedMessage_initialFullData,
  ParsedMessage_removeItem,
  ParsedMessage_setList,
  ParsedMessage_signalFinishedShoppingList,
  ParsedMessage_subscribeUserPushNotifications,
  ParsedMessage_syncWithServer,
  ParsedMessage_unSubscribeUserPushNotifications,
  ParsedMessage_updateChecked,
  ParsedMessage_updateValue,
} from '@shoppinglist/shared'
import type { types } from '../../store/actions'
import type { State } from './State'

interface BaseAction {
  // from: 'user' -> user initiated, sent to server
  // from: 'server' -> received from server
  // from: 'idbm' -> loaded from IndexedDB
  // from: 'internal' -> internal state management, not sent to server
  from: 'user' | 'server' | 'idbm' | 'internal'
}

interface RedoableBaseAction extends BaseAction {
  redo?: UndoableAction
}

export type RemoveListItemAction = RedoableBaseAction & ParsedMessage_removeItem

export type ClearListAction = RedoableBaseAction & ParsedMessage_clearList

export type AddListItemAction = RedoableBaseAction & ParsedMessage_addItem

export type UpdateListItemValueAction = RedoableBaseAction &
  ParsedMessage_updateValue

export type UpdateListItemCheckedAction = RedoableBaseAction &
  ParsedMessage_updateChecked

export type SyncWithServerAction = BaseAction & ParsedMessage_syncWithServer

export type InitialFullDataAction = BaseAction &
  ParsedMessage_initialFullData & {
    from: 'server' | 'idbm'
  }

export type SetListAction = RedoableBaseAction & ParsedMessage_setList

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
}

export interface WebsocketConnectionTimeoutExceeded extends BaseAction {
  type: typeof types.WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED
}

export type BatchAction = RedoableBaseAction &
  Omit<ParsedMessage_batch, 'payload'> & {
    payload: UndoableAction[]
  }

export type SignalFinishedShoppingList = BaseAction &
  ParsedMessage_signalFinishedShoppingList

export type SubscribeUserPushNotifications = BaseAction &
  ParsedMessage_subscribeUserPushNotifications

export type UnSubscribeUserPushNotifications = BaseAction &
  ParsedMessage_unSubscribeUserPushNotifications

export interface UpdateUserIdAction extends BaseAction {
  type: typeof types.UPDATE_USER_ID
  payload: { userId: string }
  from: 'idbm'
}

export interface UpdateHasPushSubscriptionAction extends BaseAction {
  type: typeof types.UPDATE_HAS_PUSH_SUBSCRIPTION
  payload: { hasSubscription: boolean }
}

export interface UpdateCanSubscribeAction extends BaseAction {
  type: typeof types.UPDATE_CAN_SUBSCRIBE
  payload: { canSubscribe: boolean }
}

export interface FocusProcessedAction extends BaseAction {
  type: typeof types.FOCUS_PROCESSED
}

export type UndoableAction =
  | RemoveListItemAction
  | AddListItemAction
  | UpdateListItemValueAction
  | UpdateListItemCheckedAction
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
  | FocusProcessedAction
