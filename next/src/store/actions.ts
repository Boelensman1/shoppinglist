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

  // actions only send from server, never received
  SYNC_WITH_SERVER: 'SYNC_WITH_SERVER' as const,
  SIGNAL_FINISHED_SHOPPINGLIST: 'SIGNAL_FINISHED_SHOPPINGLIST' as const,
  SUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'SUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,
  UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS:
    'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS' as const,

  // actions only received from server, never send
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA' as const,

  // actions that should not be forwarded
  WEBSOCKET_CONNECTIONSTATE_CHANGED:
    'WEBSOCKET_CONNECTIONSTATE_CHANGED' as const,
  WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED:
    'WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED' as const,
  UPDATE_USER_ID: 'UPDATE_USER_ID' as const,
  UPDATE_HAS_PUSH_SUBSCRIPTION: 'UPDATE_HAS_PUSH_SUBSCRIPTION' as const,
  UPDATE_CAN_SUBSCRIBE: 'UPDATE_CAN_SUBSCRIBE' as const,
}

const actions = {
  webSocketConnectionStateChanged: (
    newState: WebsocketConnectionStateChangedAction['payload'],
  ): WebsocketConnectionStateChangedAction => ({
    type: types.WEBSOCKET_CONNECTIONSTATE_CHANGED,
    payload: newState,
    private: true,
  }),
  // stop loading the websocket (connection attempts will continue)
  websocketConnectionTimeoutExceeded:
    (): WebsocketConnectionTimeoutExceeded => ({
      type: types.WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED,
      private: true,
    }),

  removeListItem: (id: string): RemoveListItemAction => ({
    type: types.REMOVE_LIST_ITEM,
    payload: { id },
  }),
  clear: (): ClearListAction => ({
    type: types.CLEAR_LIST,
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
      }
    }

    const batchActions: UndoableAction[] = []

    // Remove all checked items
    batchActions.push(
      ...checkedItemIds.map((id: string) => ({
        type: types.REMOVE_LIST_ITEM,
        payload: { id },
      })),
    )

    return {
      type: types.BATCH,
      payload: batchActions,
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

  signalFinishedShoppingList: (userId: string): SignalFinishedShoppingList => ({
    type: types.SIGNAL_FINISHED_SHOPPINGLIST,
    payload: { userId },
  }),

  subscribeUserPushNotifications: (
    userId: string,
    subscription: PushSubscription,
  ): SubscribeUserPushNotifications => ({
    type: types.SUBSCRIBE_USER_PUSH_NOTIFICATIONS,
    payload: { userId, subscription },
  }),

  unSubscribeUserPushNotifications: (
    userId: string,
  ): UnSubscribeUserPushNotifications => ({
    type: types.UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS,
    payload: { userId },
  }),

  updateUserId: (userId: string): UpdateUserIdAction => ({
    type: types.UPDATE_USER_ID,
    payload: { userId },
    fromUser: false,
  }),

  updateHasPushSubscription: (
    hasSubscription: boolean,
  ): UpdateHasPushSubscriptionAction => ({
    type: types.UPDATE_HAS_PUSH_SUBSCRIPTION,
    payload: { hasSubscription },
    fromUser: false,
    private: true,
  }),

  updateCanSubscribe: (canSubscribe: boolean): UpdateCanSubscribeAction => ({
    type: types.UPDATE_CAN_SUBSCRIBE,
    payload: { canSubscribe },
    fromUser: false,
    private: true,
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
