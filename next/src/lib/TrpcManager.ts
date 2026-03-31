import type { Action } from '../types/store/Action'
import type { Dispatch } from '../types/store/Dispatch'
import type { ItemRecords, ListRecords } from 'server/shared'
import actions, { isUndoableAction } from '../store/actions'
import { createTrpcClient, type TrpcClient } from './trpc'
import { clientHlcReceive } from './hlcClient'
import {
  type QueuedAction,
  hasRoute,
  getRoute,
  stripClientFields,
  createQueuedAction,
  MAX_SEND_ATTEMPTS,
} from './actionRoutes'

class TrpcManager {
  private trpc: TrpcClient | null = null
  private dispatch: Dispatch<Action> | null = null
  private connected = false
  private subscriptionCleanup: (() => void) | null = null

  // Unified action queue - replaces offlineMessageQueue and unconfirmedActions
  private actionQueue: Map<string, QueuedAction> = new Map()

  // Sync coordination
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
        this.handleDisconnect()
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
        dispatch({ ...action, from: 'server' } as Action)
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
    this.subscriptionCleanup?.()
    this.subscriptionCleanup = null
    this.trpc?.wsClient.close()
    this.trpc = null
    this.connected = false
    this.dispatch = null
  }

  /**
   * Handle disconnect - reset all sending actions back to pending.
   */
  private handleDisconnect() {
    this.connected = false
    for (const q of this.actionQueue.values()) {
      if (q.state === 'sending') q.state = 'pending'
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queue helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mark an action as failed. Removes from queue if max attempts exceeded.
   */
  private markFailed(queued: QueuedAction, error: unknown) {
    queued.attempts++
    if (queued.attempts >= MAX_SEND_ATTEMPTS) {
      console.error(
        `Action ${queued.action.type} exceeded max attempts (${MAX_SEND_ATTEMPTS}), removing`,
      )
      this.actionQueue.delete(queued.id)
    } else {
      queued.state = 'failed'
      queued.lastError = error instanceof Error ? error.message : String(error)
    }
  }

  /**
   * Prepare an action's payload for sending to the server.
   * Strips client-only fields (from, redo).
   */
  private preparePayload(action: Action): unknown {
    const stripped = stripClientFields(
      action as unknown as Record<string, unknown>,
    )
    return stripped.payload
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Queue an action for sending to the server.
   * If online, attempts to send immediately.
   */
  sendAction(action: Action, queueIfOffline = true) {
    // Check if this action type has a route (is sendable to server)
    if (!hasRoute(action.type)) return

    // If offline and shouldn't queue, just return
    if (!this.connected && !queueIfOffline) return

    const queued = createQueuedAction(action)
    this.actionQueue.set(queued.id, queued)

    // If online, try to send immediately
    if (this.connected && this.trpc) {
      this.sendQueuedAction(queued)
    }
  }

  /**
   * Send a single queued action to the server via its configured mutation.
   */
  private sendQueuedAction(queued: QueuedAction) {
    if (!this.trpc) return

    const route = getRoute(queued.action.type)
    if (!route) return

    queued.state = 'sending'

    // Get the mutation function dynamically
    const mutationObj = this.trpc.client[route.mutation] as {
      mutate?: (p: unknown) => Promise<unknown>
    }
    if (!mutationObj?.mutate) {
      console.error(`No mutation found for ${String(route.mutation)}`)
      return
    }

    mutationObj
      .mutate(this.preparePayload(queued.action) as never)
      .then(() => this.actionQueue.delete(queued.id))
      .catch((err) => {
        console.error(`Mutation failed for ${queued.action.type}:`, err)
        this.markFailed(queued, err)
      })
  }

  /**
   * Synchronize with server - send all pending syncable actions.
   */
  syncWithServer() {
    if (!this.trpc || !this.dispatch) return

    if (this.syncInProgress) {
      this.pendingResync = true
      return
    }
    this.syncInProgress = true

    // Collect syncable actions: undoable actions where syncable !== false
    const syncable = Array.from(this.actionQueue.values())
      .filter((q) => {
        const route = getRoute(q.action.type)
        return route?.syncable !== false && isUndoableAction(q.action)
      })
      .sort((a, b) => a.queuedAt - b.queuedAt) // Maintain order

    const strippedActions = syncable.map(
      (q) =>
        stripClientFields(
          q.action as unknown as Record<string, unknown>,
        ) as never,
    )

    const dispatch = this.dispatch
    this.trpc.client.syncWithServer
      .mutate(strippedActions)
      .then((fullData: { items: ItemRecords; lists: ListRecords }) => {
        // Success - remove synced actions from queue
        for (const q of syncable) this.actionQueue.delete(q.id)

        // Advance client HLC from server state
        for (const item of Object.values(fullData.items)) {
          if (item.hlcTimestamp) clientHlcReceive(item.hlcTimestamp)
        }
        dispatch({
          type: 'INITIAL_FULL_DATA',
          payload: fullData,
          from: 'server',
        })
      })
      .catch((err) => {
        console.error('Sync failed:', err)
        for (const q of syncable) this.markFailed(q, err)
      })
      .finally(() => {
        this.syncInProgress = false
        if (this.pendingResync) {
          this.pendingResync = false
          this.syncWithServer()
        }
      })
  }

  /**
   * Get the current queue state for debugging.
   */
  getQueueState() {
    let pending = 0,
      sending = 0,
      failed = 0
    for (const q of this.actionQueue.values()) {
      if (q.state === 'pending') pending++
      else if (q.state === 'sending') sending++
      else if (q.state === 'failed') failed++
    }
    return { pending, sending, failed, total: this.actionQueue.size }
  }

  // Expose queue for testing
  _getActionQueue() {
    return this.actionQueue
  }
}

export default TrpcManager
