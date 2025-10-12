import type { PushSubscription } from 'web-push'
import { Item, ItemId } from '../types/store/Item'
import genItemId from '../utils/genItemId'
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
  BatchAction,
  WebsocketConnectionTimeoutExceeded,
  SignalFinishedShoppingList,
  SubscribeUserPushNotifications,
  UnSubscribeUserPushNotifications,
  UpdateUserIdAction,
  UpdateHasPushSubscriptionAction,
  UpdateCanSubscribeAction,
  FocusProcessedAction,
} from '../types/store/Action'
import { Action } from '../types/store/Action'

export const types = {
  ADD_LIST_ITEM: 'ADD_LIST_ITEM' as const,
  REMOVE_LIST_ITEM: 'REMOVE_LIST_ITEM' as const,
  UPDATE_LIST_ITEM_VALUE: 'UPDATE_LIST_ITEM_VALUE' as const,
  UPDATE_LIST_ITEM_CHECKED: 'UPDATE_LIST_ITEM_CHECKED' as const,
  CLEAR_LIST: 'CLEAR_LIST' as const,
  SET_LIST: 'SET_LIST' as const,
  BATCH: 'BATCH' as const,

  UNDO: 'UNDO' as const,
  REDO: 'REDO' as const,

  // User actions sent to server (from: 'user')
  SYNC_WITH_SERVER: 'SYNC_WITH_SERVER' as const,
  SIGNAL_FINISHED_SHOPPINGLIST: 'SIGNAL_FINISHED_SHOPPINGLIST' as const,
  SUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'SUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,
  UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,

  // Server actions (from: 'server')
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA' as const,

  // Internal actions not sent to server (from: 'internal')
  WEBSOCKET_CONNECTIONSTATE_CHANGED:
    'WEBSOCKET_CONNECTIONSTATE_CHANGED' as const,
  WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED:
    'WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED' as const,
  UPDATE_HAS_PUSH_SUBSCRIPTION: 'UPDATE_HAS_PUSH_SUBSCRIPTION' as const,
  UPDATE_CAN_SUBSCRIBE: 'UPDATE_CAN_SUBSCRIBE' as const,
  FOCUS_PROCESSED: 'FOCUS_PROCESSED' as const,

  // IndexedDB actions (from: 'idbm')
  UPDATE_USER_ID: 'UPDATE_USER_ID' as const,
}

const actions = {
  webSocketConnectionStateChanged: (
    newState: WebsocketConnectionStateChangedAction['payload'],
  ): WebsocketConnectionStateChangedAction => ({
    type: types.WEBSOCKET_CONNECTIONSTATE_CHANGED,
    payload: newState,
    from: 'internal',
  }),
  // stop loading the websocket (connection attempts will continue)
  websocketConnectionTimeoutExceeded:
    (): WebsocketConnectionTimeoutExceeded => ({
      type: types.WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED,
      from: 'internal',
    }),

  removeListItem: (payload: {
    id: string
    displayedPrevItemId?: string
    displayedNextItemId?: string
  }): RemoveListItemAction => ({
    type: types.REMOVE_LIST_ITEM,
    payload,
    from: 'user',
  }),
  clear: (): ClearListAction => ({
    type: types.CLEAR_LIST,
    from: 'user',
  }),
  clearCheckedItems: (items: Item[]): BatchAction | ClearListAction => {
    const nonDeletedItems = items.filter((item: Item) => !item.deleted)

    const checkedItemIds = nonDeletedItems
      .filter((item: Item) => item.checked)
      .map((item: Item) => item.id)

    // If all items are checked, fire the clear action
    if (checkedItemIds.length === nonDeletedItems.length) {
      return {
        type: types.CLEAR_LIST,
        from: 'user',
      }
    }

    const batchActions: UndoableAction[] = []

    // Remove all checked items
    batchActions.push(
      ...checkedItemIds.map(
        (id: string): RemoveListItemAction => ({
          type: types.REMOVE_LIST_ITEM,
          payload: { id },
          from: 'user',
        }),
      ),
    )

    return {
      type: types.BATCH,
      payload: batchActions,
      from: 'user',
    }
  },
  addListItem: (
    prevItemId: ItemId,
    item?: Omit<Item, 'prevItemId'>,
  ): AddListItemAction => {
    return {
      type: types.ADD_LIST_ITEM,
      payload: {
        ...(item ?? {
          id: genItemId(),
          value: '',
          checked: false,
          deleted: false,
        }),
        prevItemId,
      },
      from: 'user',
    }
  },
  updateListItemValue: (
    id: string,
    newValue: string,
  ): UpdateListItemValueAction => ({
    type: types.UPDATE_LIST_ITEM_VALUE,
    payload: { id, newValue },
    from: 'user',
  }),
  updateListItemChecked: (
    id: string,
    newChecked: boolean,
  ): UpdateListItemCheckedAction => ({
    type: types.UPDATE_LIST_ITEM_CHECKED,
    payload: { id, newChecked },
    from: 'user',
  }),
  undo: (action: UndoableAction): UndoAction => ({
    type: types.UNDO,
    payload: action,
    from: 'user',
  }),
  redo: (action: UndoableAction): RedoAction => ({
    type: types.REDO,
    payload: action,
    from: 'user',
  }),

  syncWithServer: (offlineActions: UndoableAction[]): SyncWithServerAction => ({
    type: types.SYNC_WITH_SERVER,
    payload: offlineActions,
    from: 'user',
  }),

  signalFinishedShoppingList: (userId: string): SignalFinishedShoppingList => ({
    type: types.SIGNAL_FINISHED_SHOPPINGLIST,
    payload: { userId },
    from: 'user',
  }),

  subscribeUserPushNotifications: (
    userId: string,
    subscription: PushSubscription,
  ): SubscribeUserPushNotifications => ({
    type: types.SUBSCRIBE_USER_PUSH_NOTIFICATIONS,
    payload: { userId, subscription },
    from: 'user',
  }),

  unSubscribeUserPushNotifications: (
    userId: string,
  ): UnSubscribeUserPushNotifications => ({
    type: types.UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS,
    payload: { userId },
    from: 'user',
  }),

  updateUserId: (userId: string): UpdateUserIdAction => ({
    type: types.UPDATE_USER_ID,
    payload: { userId },
    from: 'idbm',
  }),

  updateHasPushSubscription: (
    hasSubscription: boolean,
  ): UpdateHasPushSubscriptionAction => ({
    type: types.UPDATE_HAS_PUSH_SUBSCRIPTION,
    payload: { hasSubscription },
    from: 'internal',
  }),

  updateCanSubscribe: (canSubscribe: boolean): UpdateCanSubscribeAction => ({
    type: types.UPDATE_CAN_SUBSCRIBE,
    payload: { canSubscribe },
    from: 'internal',
  }),

  focusProcessed: (): FocusProcessedAction => ({
    type: types.FOCUS_PROCESSED,
    from: 'internal',
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
    types.BATCH,
  ].includes((action as UndoableAction).type)
}

export default actions
