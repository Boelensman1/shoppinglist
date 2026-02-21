import { type Item, messageTypes } from '@shoppinglist/shared'
import type { PushSubscription } from 'web-push'
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
import { ItemId } from '../../../packages/shared/build/types'

export const types = {
  ...messageTypes,

  // Client-only types
  UNDO: 'UNDO' as const,
  REDO: 'REDO' as const,
  WEBSOCKET_CONNECTIONSTATE_CHANGED:
    'WEBSOCKET_CONNECTIONSTATE_CHANGED' as const,
  WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED:
    'WEBSOCKET_CONNECTION_TIMEOUT_EXCEEDED' as const,
  UPDATE_HAS_PUSH_SUBSCRIPTION: 'UPDATE_HAS_PUSH_SUBSCRIPTION' as const,
  UPDATE_CAN_SUBSCRIBE: 'UPDATE_CAN_SUBSCRIBE' as const,
  FOCUS_PROCESSED: 'FOCUS_PROCESSED' as const,
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
    id: ItemId
    displayedPrevItemId?: ItemId
    displayedNextItemId?: ItemId
  }): RemoveListItemAction => ({
    type: types.REMOVE_LIST_ITEM,
    payload,
    from: 'user',
  }),
  clear: (): ClearListAction => ({
    type: types.CLEAR_LIST,
    from: 'user',
  }),
  executeBatch: (batchActions: UndoableAction[]): BatchAction => ({
    type: types.BATCH,
    payload: batchActions,
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
        (id): RemoveListItemAction => ({
          type: types.REMOVE_LIST_ITEM,
          payload: { id },
          from: 'user',
        }),
      ),
    )

    return actions.executeBatch(batchActions)
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
    id: ItemId,
    newValue: string,
  ): UpdateListItemValueAction => ({
    type: types.UPDATE_LIST_ITEM_VALUE,
    payload: { id, newValue },
    from: 'user',
  }),
  updateListItemChecked: (
    id: ItemId,
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
