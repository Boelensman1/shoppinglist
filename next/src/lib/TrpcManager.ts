import type { Action, UndoableAction } from '../types/store/Action'
import type { Dispatch } from '../types/store/Dispatch'
import type { ItemRecords, ListRecords } from 'server/shared'
import actions, { isUndoableAction } from '../store/actions'
import { createTrpcClient, type TrpcClient } from './trpc'
import { clientHlcReceive } from './hlcClient'

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
  private unconfirmedActions: Action[] = []
  private syncInProgress = false
  private pendingResync = false

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
        this.offlineMessageQueue.push(...this.unconfirmedActions)
        this.unconfirmedActions = []
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
        const payload = action.payload as Record<string, unknown> | undefined
        if (payload?.hlcTimestamp && typeof payload.hlcTimestamp === 'string') {
          clientHlcReceive(payload.hlcTimestamp)
        }
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

    const trackMutation = (promise: Promise<unknown>) => {
      this.unconfirmedActions.push(action)
      promise
        .then(() => {
          const idx = this.unconfirmedActions.indexOf(action)
          if (idx !== -1) this.unconfirmedActions.splice(idx, 1)
        })
        .catch((err) => {
          console.error(err)
        })
    }

    // Fire-and-forget: call the appropriate tRPC mutation
    switch (action.type) {
      case 'ADD_LIST_ITEM':
        trackMutation(client.addListItem.mutate(stripped.payload as never))
        break
      case 'REMOVE_LIST_ITEM':
        trackMutation(client.removeListItem.mutate(stripped.payload as never))
        break
      case 'UPDATE_LIST_ITEM_VALUE':
        trackMutation(
          client.updateListItemValue.mutate(stripped.payload as never),
        )
        break
      case 'UPDATE_LIST_ITEM_CHECKED':
        trackMutation(
          client.updateListItemChecked.mutate(stripped.payload as never),
        )
        break
      case 'CLEAR_LIST':
        trackMutation(client.clearList.mutate(stripped.payload as never))
        break
      case 'ADD_LIST':
        trackMutation(client.addList.mutate(stripped.payload as never))
        break
      case 'UPDATE_LIST':
        trackMutation(client.updateList.mutate(stripped.payload as never))
        break
      case 'REMOVE_LIST':
        trackMutation(client.removeList.mutate(stripped.payload as never))
        break
      case 'SET_LIST':
        trackMutation(client.setList.mutate(stripped.payload as never))
        break
      case 'BATCH':
        trackMutation(
          client.batch.mutate(
            (stripped.payload as UndoableAction[]).map(
              (a) =>
                stripClientFields(
                  a as unknown as Record<string, unknown>,
                ) as never,
            ),
          ),
        )
        break
      case 'SIGNAL_FINISHED_SHOPPINGLIST':
        trackMutation(
          client.signalFinishedShoppingList.mutate(stripped.payload as never),
        )
        break
      case 'SUBSCRIBE_USER_PUSH_NOTIFICATIONS':
        trackMutation(
          client.subscribePushNotifications.mutate(stripped.payload as never),
        )
        break
      case 'UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS':
        trackMutation(
          client.unsubscribePushNotifications.mutate(stripped.payload as never),
        )
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

    if (this.syncInProgress) {
      this.pendingResync = true
      return
    }

    this.syncInProgress = true

    // Snapshot the current queues
    this.offlineMessageQueue.push(...this.unconfirmedActions)
    this.unconfirmedActions = []
    const syncingQueue = [...this.offlineMessageQueue]
    this.offlineMessageQueue = []

    const strippedActions = syncingQueue
      .filter((action) => isUndoableAction(action))
      .map(
        (a) =>
          stripClientFields(a as unknown as Record<string, unknown>) as never,
      )

    const dispatch = this.dispatch
    this.trpc.client.syncWithServer
      .mutate(strippedActions)
      .then((fullData: { items: ItemRecords; lists: ListRecords }) => {
        // Advance client HLC from server state
        for (const item of Object.values(fullData.items)) {
          if (item.hlcTimestamp) {
            clientHlcReceive(item.hlcTimestamp)
          }
        }
        dispatch({
          type: 'INITIAL_FULL_DATA' as const,
          payload: fullData,
          from: 'server',
        })
      })
      .catch((err) => {
        console.error(err)
        // Restore actions to front of queue on failure
        this.offlineMessageQueue.unshift(...syncingQueue)
      })
      .finally(() => {
        this.syncInProgress = false
        if (this.pendingResync) {
          this.pendingResync = false
          this.syncWithServer()
        }
      })
  }
}

export default TrpcManager
