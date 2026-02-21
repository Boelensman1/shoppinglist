import type { Action, UndoableAction } from '../types/store/Action'
import type { Dispatch } from '../types/store/Dispatch'
import type { ItemRecords } from '@shoppinglist/shared'
import actions, { isUndoableAction } from '../store/actions'
import { createTrpcClient, type TrpcClient } from './trpc'

/**
 * Strip client-only fields (`from`, `redo`) from actions before sending to tRPC.
 * These fields exist on client Action types but are not part of the Zod input schemas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripClientFields(action: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { from, redo, ...rest } = action
  if ('payload' in rest && Array.isArray(rest.payload)) {
    return {
      ...rest,
      payload: rest.payload.map(stripClientFields),
    }
  }
  return rest
}

class TrpcManager {
  private trpc: TrpcClient | null = null
  private dispatch: Dispatch<Action> | null = null
  private connected = false
  private subscriptionCleanup: (() => void) | null = null

  private offlineMessageQueue: Action[] = []

  get isConnected() {
    return this.connected
  }

  connect(url: string, dispatch: Dispatch<Action>) {
    console.log('tRPC connecting...')
    this.dispatch = dispatch

    this.trpc = createTrpcClient(url, {
      onOpen: () => {
        console.log('WebSocket open')
        this.connected = true
        dispatch(actions.webSocketConnectionStateChanged('connected'))
      },
      onClose: () => {
        console.log('WebSocket closed')
        this.connected = false
        dispatch(actions.webSocketConnectionStateChanged('disconnected'))
      },
    })

    this.setupSubscription(dispatch)
  }

  private setupSubscription(dispatch: Dispatch<Action>) {
    if (!this.trpc) return

    const subscription = this.trpc.client.onBroadcast.subscribe(undefined, {
      onStarted: () => {
        console.log('tRPC subscription started.')
        this.syncWithServer()
      },
      onData: (data) => {
        const action = data as Record<string, unknown>
        dispatch({
          ...action,
          from: 'server',
        } as Action)
      },
      onError: (err: unknown) => {
        console.error('tRPC subscription error:', err)
      },
      onComplete: () => {
        console.log('tRPC subscription completed.')
      },
    })

    this.subscriptionCleanup = () => subscription.unsubscribe()
  }

  disconnect() {
    if (this.subscriptionCleanup) {
      this.subscriptionCleanup()
      this.subscriptionCleanup = null
    }
    if (this.trpc) {
      this.trpc.wsClient.close()
      this.trpc = null
    }
    this.connected = false
    this.dispatch = null
  }

  sendAction(action: Action, queueIfOffline = true) {
    if (!this.connected || !this.trpc) {
      if (queueIfOffline) {
        this.offlineMessageQueue.push(action)
      }
      return
    }

    const client = this.trpc.client
    const stripped = stripClientFields(
      action as unknown as Record<string, unknown>,
    )

    // Fire-and-forget: call the appropriate tRPC mutation
    switch (action.type) {
      case 'ADD_LIST_ITEM':
        client.addListItem
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'REMOVE_LIST_ITEM':
        client.removeListItem
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'UPDATE_LIST_ITEM_VALUE':
        client.updateListItemValue
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'UPDATE_LIST_ITEM_CHECKED':
        client.updateListItemChecked
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'CLEAR_LIST':
        client.clearList.mutate().catch(console.error)
        break
      case 'SET_LIST':
        client.setList.mutate(stripped.payload as never).catch(console.error)
        break
      case 'BATCH':
        client.batch
          .mutate(
            (stripped.payload as UndoableAction[]).map(
              (a) =>
                stripClientFields(
                  a as unknown as Record<string, unknown>,
                ) as never,
            ),
          )
          .catch(console.error)
        break
      case 'SIGNAL_FINISHED_SHOPPINGLIST':
        client.signalFinishedShoppingList
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'SUBSCRIBE_USER_PUSH_NOTIFICATIONS':
        client.subscribePushNotifications
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      case 'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS':
        client.unsubscribePushNotifications
          .mutate(stripped.payload as never)
          .catch(console.error)
        break
      default:
        // SYNC_WITH_SERVER, INITIAL_FULL_DATA, and client-only actions are not sent as individual mutations
        if (queueIfOffline) {
          this.offlineMessageQueue.push(action)
        }
        break
    }
  }

  syncWithServer() {
    if (!this.trpc || !this.dispatch) return

    const offlineActions = this.offlineMessageQueue.filter((action) =>
      isUndoableAction(action),
    )
    this.offlineMessageQueue = []

    const strippedActions = offlineActions.map(
      (a) =>
        stripClientFields(a as unknown as Record<string, unknown>) as never,
    )

    const dispatch = this.dispatch
    this.trpc.client.syncWithServer
      .mutate(strippedActions)
      .then((fullData: ItemRecords) => {
        dispatch({
          type: 'INITIAL_FULL_DATA' as const,
          payload: fullData,
          from: 'server',
        })
      })
      .catch(console.error)
  }
}

export default TrpcManager
