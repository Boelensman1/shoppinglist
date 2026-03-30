import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { ItemId, ListId } from 'server/shared'
import type { Action, UndoableAction } from '../../types/store/Action'

const TEST_HLC = 'test-hlc-ts'

// --- Helpers ---

function deferred<T = void>() {
  let resolve!: (v: T) => void
  let reject!: (e?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flushPromises = () => new Promise((r) => setTimeout(r, 0))

function makeCheckAction(
  id: string,
  newChecked: boolean,
): Action & { type: 'UPDATE_LIST_ITEM_CHECKED' } {
  return {
    type: 'UPDATE_LIST_ITEM_CHECKED' as const,
    payload: { id: id as ItemId, newChecked, hlcTimestamp: TEST_HLC },
    from: 'user',
  }
}

function makeAddAction(item: {
  id: string
  value: string
  listId: string
}): Action & { type: 'ADD_LIST_ITEM' } {
  return {
    type: 'ADD_LIST_ITEM' as const,
    payload: {
      id: item.id as ItemId,
      value: item.value,
      checked: false,
      deleted: false,
      prevItemId: 'HEAD' as const,
      listId: item.listId as ListId,
      hlcTimestamp: TEST_HLC,
    },
    from: 'user',
  }
}

function makeUpdateValueAction(
  id: string,
  newValue: string,
): Action & { type: 'UPDATE_LIST_ITEM_VALUE' } {
  return {
    type: 'UPDATE_LIST_ITEM_VALUE' as const,
    payload: { id: id as ItemId, newValue, hlcTimestamp: TEST_HLC },
    from: 'user',
  }
}

function makeClearListAction(listId: string): Action & { type: 'CLEAR_LIST' } {
  return {
    type: 'CLEAR_LIST' as const,
    payload: { listId: listId as ListId, hlcTimestamp: TEST_HLC },
    from: 'user',
  }
}

// --- Mock setup ---

let mockCallbacks: { onOpen?: () => void; onClose?: () => void }
let mockSubCallbacks: {
  onStarted?: () => void
  onData?: (data: unknown) => void
  onError?: (err: unknown) => void
  onComplete?: () => void
}
let mockMutations: Record<string, ReturnType<typeof vi.fn>>
let mockWsClient: { close: ReturnType<typeof vi.fn> }
let mockUnsubscribe: ReturnType<typeof vi.fn>

function resetMockState() {
  mockCallbacks = {}
  mockSubCallbacks = {}
  mockWsClient = { close: vi.fn() }
  mockUnsubscribe = vi.fn()

  // Default: never-resolving promises (simulates in-flight mutation)
  mockMutations = {
    addListItem: vi.fn(() => new Promise(() => {})),
    removeListItem: vi.fn(() => new Promise(() => {})),
    updateListItemValue: vi.fn(() => new Promise(() => {})),
    updateListItemChecked: vi.fn(() => new Promise(() => {})),
    clearList: vi.fn(() => new Promise(() => {})),
    setList: vi.fn(() => new Promise(() => {})),
    addList: vi.fn(() => new Promise(() => {})),
    updateList: vi.fn(() => new Promise(() => {})),
    removeList: vi.fn(() => new Promise(() => {})),
    batch: vi.fn(() => new Promise(() => {})),
    signalFinishedShoppingList: vi.fn(() => new Promise(() => {})),
    subscribePushNotifications: vi.fn(() => new Promise(() => {})),
    unsubscribePushNotifications: vi.fn(() => new Promise(() => {})),
    syncWithServer: vi.fn(() => new Promise(() => {})),
  }
}

vi.mock('../../lib/trpc', () => ({
  createTrpcClient: vi.fn(
    (_url: string, opts?: { onOpen?: () => void; onClose?: () => void }) => {
      mockCallbacks = { onOpen: opts?.onOpen, onClose: opts?.onClose }

      const client = Object.fromEntries(
        Object.entries(mockMutations).map(([key, mutateFn]) => [
          key,
          { mutate: mutateFn },
        ]),
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).onBroadcast = {
        subscribe: vi.fn(
          (_input: unknown, callbacks: typeof mockSubCallbacks) => {
            mockSubCallbacks = callbacks
            return { unsubscribe: mockUnsubscribe }
          },
        ),
      }

      return { client, wsClient: mockWsClient }
    },
  ),
}))

// Suppress console.log/error noise from TrpcManager
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// --- Tests ---

import TrpcManager from '../TrpcManager'

describe('TrpcManager', () => {
  let manager: TrpcManager
  let dispatch: Mock<(action: Action) => void>

  beforeEach(() => {
    resetMockState()
    manager = new TrpcManager()
    dispatch = vi.fn()
  })

  /** Connect and trigger onOpen so the manager is in "connected" state */
  function connectAndOpen() {
    manager.connect('ws://test', dispatch)
    mockCallbacks.onOpen!()
  }

  /** Simulate a full reconnect cycle: onOpen + subscription onStarted */
  function simulateReconnect() {
    // Re-create the mock client for the new connect call is not needed -
    // onOpen just sets connected=true. But we need subscription onStarted
    // to trigger syncWithServer. Since setupSubscription was already called
    // during connect(), we just fire onOpen and onStarted on existing callbacks.
    mockCallbacks.onOpen!()
    mockSubCallbacks.onStarted!()
  }

  // =====================
  // stripClientFields
  // =====================
  describe('stripClientFields', () => {
    it('strips `from` and `redo` fields from actions sent to server', () => {
      connectAndOpen()

      const redoAction: UndoableAction = makeCheckAction('item1', false)
      const action: Action = {
        ...makeCheckAction('item1', true),
        redo: redoAction,
      }

      const d = deferred()
      mockMutations.updateListItemChecked.mockReturnValueOnce(d.promise)
      manager.sendAction(action)

      expect(mockMutations.updateListItemChecked).toHaveBeenCalledWith({
        id: 'item1',
        newChecked: true,
        hlcTimestamp: TEST_HLC,
      })
    })

    it('recursively strips client fields from BATCH payload arrays', () => {
      connectAndOpen()

      const batchAction: Action = {
        type: 'BATCH' as const,
        payload: [
          { ...makeCheckAction('a', true), redo: makeCheckAction('a', false) },
          makeUpdateValueAction('b', 'hello'),
        ],
        from: 'user',
      }

      const d = deferred()
      mockMutations.batch.mockReturnValueOnce(d.promise)
      manager.sendAction(batchAction)

      expect(mockMutations.batch).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'a', newChecked: true, hlcTimestamp: TEST_HLC },
        },
        {
          type: 'UPDATE_LIST_ITEM_VALUE',
          payload: { id: 'b', newValue: 'hello', hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })

  // =====================
  // Basic connectivity
  // =====================
  describe('Basic connectivity', () => {
    it('sends mutation when connected', () => {
      connectAndOpen()
      const action = makeCheckAction('item1', true)

      const d = deferred()
      mockMutations.updateListItemChecked.mockReturnValueOnce(d.promise)
      manager.sendAction(action)

      expect(mockMutations.updateListItemChecked).toHaveBeenCalledOnce()
    })

    it('queues action when disconnected and sends via syncWithServer on reconnect', () => {
      manager.connect('ws://test', dispatch)
      // Do NOT trigger onOpen — still disconnected

      const action = makeCheckAction('item1', true)
      manager.sendAction(action)

      // Mutation should not have been called
      expect(mockMutations.updateListItemChecked).not.toHaveBeenCalled()

      // Now connect and trigger sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)

      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      // syncWithServer should have been called with the queued action
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })

    it('does not queue action when queueIfOffline=false and disconnected', () => {
      manager.connect('ws://test', dispatch)
      // Still disconnected

      const action = makeCheckAction('item1', true)
      manager.sendAction(action, false)

      // Connect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      // Should sync with empty array
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([])
    })

    it('routes each action type to the correct tRPC mutation', () => {
      connectAndOpen()

      const actionMap: [Action, string][] = [
        [
          makeAddAction({ id: 'i1', value: 'test', listId: 'default' }),
          'addListItem',
        ],
        [
          {
            type: 'REMOVE_LIST_ITEM' as const,
            payload: { id: 'i1' as ItemId, hlcTimestamp: TEST_HLC },
            from: 'user' as const,
          },
          'removeListItem',
        ],
        [makeUpdateValueAction('i1', 'new'), 'updateListItemValue'],
        [makeCheckAction('i1', true), 'updateListItemChecked'],
        [makeClearListAction('default'), 'clearList'],
        [
          {
            type: 'ADD_LIST' as const,
            payload: {
              id: 'l1' as ListId,
              name: 'Test',
              colour: '#000',
              hlcTimestamp: TEST_HLC,
            },
            from: 'user' as const,
          },
          'addList',
        ],
        [
          {
            type: 'UPDATE_LIST' as const,
            payload: { id: 'l1' as ListId, name: 'Test2', colour: '#fff' },
            from: 'user' as const,
          },
          'updateList',
        ],
        [
          {
            type: 'REMOVE_LIST' as const,
            payload: { id: 'l1' as ListId },
            from: 'user' as const,
          },
          'removeList',
        ],
        [
          { type: 'SET_LIST' as const, payload: {}, from: 'user' as const },
          'setList',
        ],
        [
          {
            type: 'SIGNAL_FINISHED_SHOPPINGLIST' as const,
            payload: { userId: 'u1' },
            from: 'user' as const,
          },
          'signalFinishedShoppingList',
        ],
      ]

      for (const [action, mutationName] of actionMap) {
        manager.sendAction(action)
        expect(mockMutations[mutationName]).toHaveBeenCalled()
      }
    })

    it('dispatches connection state changes', () => {
      manager.connect('ws://test', dispatch)

      mockCallbacks.onOpen!()
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WEBSOCKET_CONNECTIONSTATE_CHANGED',
          payload: 'connected',
        }),
      )

      mockCallbacks.onClose!()
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WEBSOCKET_CONNECTIONSTATE_CHANGED',
          payload: 'disconnected',
        }),
      )
    })
  })

  // =====================
  // Unconfirmed action tracking
  // =====================
  describe('Unconfirmed action tracking', () => {
    it('successful mutation removes action from unconfirmedActions', async () => {
      connectAndOpen()

      const d = deferred()
      mockMutations.updateListItemChecked.mockReturnValueOnce(d.promise)
      manager.sendAction(makeCheckAction('item1', true))

      // Resolve the mutation
      d.resolve()
      await flushPromises()

      // Now disconnect — action should NOT be in the offline queue
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      // syncWithServer should have no actions (the confirmed one was removed)
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([])
    })

    it('failed mutation keeps action in unconfirmedActions for recovery', async () => {
      connectAndOpen()

      const d = deferred()
      mockMutations.updateListItemChecked.mockReturnValueOnce(d.promise)
      manager.sendAction(makeCheckAction('item1', true))

      // Reject the mutation
      d.reject(new Error('network error'))
      await flushPromises()

      // Disconnect — failed action should move to offline queue
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })

    it('pending (never-resolving) mutation moves to offline queue on close', () => {
      connectAndOpen()

      // Default mock returns never-resolving promise
      manager.sendAction(makeCheckAction('item1', true))

      // Disconnect before mutation resolves
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })

    it('on WebSocket close, all unconfirmedActions move to offlineMessageQueue', () => {
      connectAndOpen()

      // Send 3 actions, all with never-resolving mutations
      manager.sendAction(makeCheckAction('a', true))
      manager.sendAction(makeCheckAction('b', false))
      manager.sendAction(makeUpdateValueAction('c', 'hello'))

      // Close
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'a', newChecked: true, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'b', newChecked: false, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_VALUE',
            payload: { id: 'c', newValue: 'hello', hlcTimestamp: TEST_HLC },
          },
        ]),
      )
    })
  })

  // =====================
  // syncWithServer behavior
  // =====================
  describe('syncWithServer behavior', () => {
    it('sends queued offline actions to server', () => {
      manager.connect('ws://test', dispatch)
      // Disconnected — queue actions
      manager.sendAction(makeCheckAction('item1', true))
      manager.sendAction(makeUpdateValueAction('item2', 'milk'))

      // Connect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
        {
          type: 'UPDATE_LIST_ITEM_VALUE',
          payload: { id: 'item2', newValue: 'milk', hlcTimestamp: TEST_HLC },
        },
      ])
    })

    it('includes unconfirmed actions in the sync', () => {
      connectAndOpen()

      // Send action while connected (in-flight, never resolves)
      manager.sendAction(makeCheckAction('item1', true))

      // Also queue an action while offline
      mockCallbacks.onClose!()
      manager.sendAction(makeUpdateValueAction('item2', 'bread'))

      // Reconnect
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      // Both should be sent
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_VALUE',
            payload: { id: 'item2', newValue: 'bread', hlcTimestamp: TEST_HLC },
          },
        ]),
      )
    })

    it('dispatches INITIAL_FULL_DATA with server response', async () => {
      connectAndOpen()

      const serverData = {
        items: {
          item1: {
            id: 'item1',
            value: 'milk',
            checked: true,
            deleted: false,
            prevItemId: 'HEAD',
            listId: 'default',
          },
        },
        lists: {
          default: { id: 'default', name: 'Boodschappen', colour: '#3b82f6' },
        },
      }

      const syncDeferred = deferred<typeof serverData>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      mockSubCallbacks.onStarted!()

      syncDeferred.resolve(serverData)
      await flushPromises()

      expect(dispatch).toHaveBeenCalledWith({
        type: 'INITIAL_FULL_DATA',
        payload: serverData,
        from: 'server',
      })
    })

    it('clears queues after sync', async () => {
      manager.connect('ws://test', dispatch)

      // Queue an action
      manager.sendAction(makeCheckAction('item1', true))

      // First sync
      const syncDeferred1 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred1.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])

      // Resolve the first sync so syncInProgress clears
      syncDeferred1.resolve({ items: {}, lists: {} })
      await flushPromises()

      // Disconnect and reconnect again — second sync should have empty queue
      mockCallbacks.onClose!()
      const syncDeferred2 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred2.promise)
      simulateReconnect()

      // Second call should be with empty array
      expect(mockMutations.syncWithServer).toHaveBeenLastCalledWith([])
    })

    it('only sends undoable actions (filters non-undoable)', () => {
      manager.connect('ws://test', dispatch)
      // Disconnected — queue a mix of actions
      // Undoable action
      manager.sendAction(makeCheckAction('item1', true))
      // Non-undoable action (falls through to default case, gets queued)
      manager.sendAction({
        type: 'SIGNAL_FINISHED_SHOPPINGLIST' as const,
        payload: { userId: 'u1' },
        from: 'user',
      })

      // Connect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      // Only the undoable action should be sent
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })

  // =====================
  // Flaky reconnect bug
  // =====================
  describe('Flaky reconnect bug', () => {
    it('unconfirmed check action is re-sent via syncWithServer after flaky reconnect', async () => {
      // 1. Connect
      connectAndOpen()

      // 2. Check an item — mutation fires but will never resolve (simulating silent network failure)
      manager.sendAction(makeCheckAction('item1', true))
      expect(mockMutations.updateListItemChecked).toHaveBeenCalledOnce()

      // 3. WebSocket dies
      mockCallbacks.onClose!()
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WEBSOCKET_CONNECTIONSTATE_CHANGED',
          payload: 'disconnected',
        }),
      )

      // 4. Reconnect
      const serverData = {
        items: {
          item1: {
            id: 'item1',
            value: 'milk',
            checked: true,
            deleted: false,
            prevItemId: 'HEAD',
            listId: 'default',
          },
        },
        lists: {
          default: { id: 'default', name: 'Boodschappen', colour: '#3b82f6' },
        },
      }
      const syncDeferred = deferred<typeof serverData>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      // 5. Assert the unconfirmed check action was re-sent to syncWithServer
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])

      // 6. Server processes the action and returns updated state
      syncDeferred.resolve(serverData)
      await flushPromises()

      // 7. Client dispatches INITIAL_FULL_DATA with the correct (checked) state
      expect(dispatch).toHaveBeenCalledWith({
        type: 'INITIAL_FULL_DATA',
        payload: serverData,
        from: 'server',
      })
    })

    it('mutation that rejects after close does not double-queue the action', async () => {
      connectAndOpen()

      const d = deferred()
      mockMutations.updateListItemChecked.mockReturnValueOnce(d.promise)
      manager.sendAction(makeCheckAction('item1', true))

      // onClose fires first — moves unconfirmed → offline queue
      mockCallbacks.onClose!()

      // THEN the mutation rejects (the promise settles after disconnect)
      d.reject(new Error('connection lost'))
      await flushPromises()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      // Action should appear exactly once, not twice
      const syncCall = mockMutations.syncWithServer.mock.calls[0][0] as Action[]
      const checkActions = syncCall.filter(
        (a: Action) => a.type === 'UPDATE_LIST_ITEM_CHECKED',
      )
      expect(checkActions).toHaveLength(1)
    })
  })

  // =====================
  // Rapid disconnect/reconnect cycles
  // =====================
  describe('Rapid disconnect/reconnect cycles', () => {
    it('actions accumulate correctly across multiple disconnects', () => {
      connectAndOpen()

      // Action A while connected (never resolves)
      manager.sendAction(makeCheckAction('a', true))

      // Disconnect — A moves to offline queue
      mockCallbacks.onClose!()

      // Reconnect, send B while connected (never resolves)
      mockCallbacks.onOpen!()
      manager.sendAction(makeCheckAction('b', true))

      // Disconnect again — B moves to offline queue (A already there)
      mockCallbacks.onClose!()

      // Send C while offline — goes directly to offline queue
      manager.sendAction(makeUpdateValueAction('c', 'eggs'))

      // Final reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      const syncArgs = mockMutations.syncWithServer.mock.calls.at(
        -1,
      )![0] as Action[]
      expect(syncArgs).toHaveLength(3)
      expect(syncArgs).toEqual(
        expect.arrayContaining([
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'a', newChecked: true, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'b', newChecked: true, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_VALUE',
            payload: { id: 'c', newValue: 'eggs', hlcTimestamp: TEST_HLC },
          },
        ]),
      )
    })

    it('multiple connect/disconnect cycles do not lose queued actions', () => {
      connectAndOpen()

      // 5 cycles, 1 action each
      for (let i = 0; i < 5; i++) {
        if (i > 0) mockCallbacks.onOpen!()
        manager.sendAction(makeCheckAction(`item${i}`, true))
        mockCallbacks.onClose!()
      }

      // Final reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      const syncArgs = mockMutations.syncWithServer.mock.calls.at(
        -1,
      )![0] as Action[]
      expect(syncArgs).toHaveLength(5)
      for (let i = 0; i < 5; i++) {
        expect(syncArgs).toEqual(
          expect.arrayContaining([
            {
              type: 'UPDATE_LIST_ITEM_CHECKED',
              payload: {
                id: `item${i}`,
                newChecked: true,
                hlcTimestamp: TEST_HLC,
              },
            },
          ]),
        )
      }
    })
  })

  // =====================
  // Actions during reconnection window
  // =====================
  describe('Actions during reconnection window', () => {
    it('actions sent between onClose and next onOpen are properly queued', () => {
      connectAndOpen()
      mockCallbacks.onClose!()

      // Send 3 actions while disconnected
      manager.sendAction(makeCheckAction('a', true))
      manager.sendAction(makeUpdateValueAction('b', 'milk'))
      manager.sendAction(makeClearListAction('default'))

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      const syncArgs = mockMutations.syncWithServer.mock.calls.at(
        -1,
      )![0] as Action[]
      expect(syncArgs).toHaveLength(3)
    })

    it('actions sent right before disconnect are tracked as unconfirmed and recovered', () => {
      connectAndOpen()

      // Send action while connected — mutation fires but never resolves
      manager.sendAction(makeCheckAction('item1', true))

      // Immediately disconnect (before mutation resolves)
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })

  // =====================
  // Subscription behavior
  // =====================
  describe('Subscription behavior', () => {
    it('onStarted triggers syncWithServer', () => {
      connectAndOpen()

      // syncWithServer should NOT have been called yet (only onOpen fired)
      expect(mockMutations.syncWithServer).not.toHaveBeenCalled()

      // Trigger subscription started
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      mockSubCallbacks.onStarted!()

      expect(mockMutations.syncWithServer).toHaveBeenCalledOnce()
    })

    it('onData dispatches actions with from: server', () => {
      connectAndOpen()

      mockSubCallbacks.onData!({
        type: 'UPDATE_LIST_ITEM_CHECKED',
        payload: { id: 'item1', newChecked: true },
      })

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_LIST_ITEM_CHECKED',
        payload: { id: 'item1', newChecked: true },
        from: 'server',
      })
    })

    it('subscription is cleaned up on disconnect', () => {
      connectAndOpen()
      manager.disconnect()

      expect(mockUnsubscribe).toHaveBeenCalledOnce()
      expect(mockWsClient.close).toHaveBeenCalledOnce()
    })
  })

  // =====================
  // Concurrent mutations
  // =====================
  describe('Concurrent mutations', () => {
    it('multiple in-flight mutations are tracked independently', async () => {
      connectAndOpen()

      const dA = deferred()
      const dB = deferred()
      mockMutations.updateListItemChecked
        .mockReturnValueOnce(dA.promise)
        .mockReturnValueOnce(dB.promise)

      manager.sendAction(makeCheckAction('a', true))
      manager.sendAction(makeCheckAction('b', true))

      // Resolve A only
      dA.resolve()
      await flushPromises()

      // Disconnect — only B should be unconfirmed
      mockCallbacks.onClose!()

      // Reconnect and sync
      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'b', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })

    it('resolving mutations out of order works correctly', async () => {
      connectAndOpen()

      const dA = deferred()
      const dB = deferred()
      const dC = deferred()
      mockMutations.updateListItemChecked
        .mockReturnValueOnce(dA.promise)
        .mockReturnValueOnce(dB.promise)
        .mockReturnValueOnce(dC.promise)

      manager.sendAction(makeCheckAction('a', true))
      manager.sendAction(makeCheckAction('b', true))
      manager.sendAction(makeCheckAction('c', true))

      // Resolve C first, then A, leaving B pending
      dC.resolve()
      dA.resolve()
      await flushPromises()

      // Disconnect — only B should remain
      mockCallbacks.onClose!()

      const syncDeferred = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(syncDeferred.promise)
      simulateReconnect()

      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'b', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })

  // =====================
  // Bug: Queue cleared before sync resolves
  // =====================
  describe('Queue-clearing bug', () => {
    it('actions survive a failed syncWithServer call', async () => {
      manager.connect('ws://test', dispatch)
      // Queue actions while disconnected
      manager.sendAction(makeCheckAction('item1', true))
      manager.sendAction(makeUpdateValueAction('item2', 'milk'))

      // Connect and trigger sync — but the sync will FAIL
      const failedSync = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(failedSync.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()

      // syncWithServer was called with our actions
      expect(mockMutations.syncWithServer).toHaveBeenCalledWith([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
        {
          type: 'UPDATE_LIST_ITEM_VALUE',
          payload: { id: 'item2', newValue: 'milk', hlcTimestamp: TEST_HLC },
        },
      ])

      // Sync fails — .catch restores actions, .finally clears syncInProgress
      failedSync.reject(new Error('sync failed'))
      await flushPromises()

      // Disconnect and reconnect to trigger a new sync attempt
      mockCallbacks.onClose!()
      const retrySync = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(retrySync.promise)
      simulateReconnect()

      // The retry sync should still contain the original actions
      const lastCall = mockMutations.syncWithServer.mock.calls.at(
        -1,
      )![0] as Action[]
      expect(lastCall).toEqual(
        expect.arrayContaining([
          {
            type: 'UPDATE_LIST_ITEM_CHECKED',
            payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
          },
          {
            type: 'UPDATE_LIST_ITEM_VALUE',
            payload: { id: 'item2', newValue: 'milk', hlcTimestamp: TEST_HLC },
          },
        ]),
      )
    })

    it('actions survive multiple consecutive failed syncs', async () => {
      manager.connect('ws://test', dispatch)
      manager.sendAction(makeCheckAction('item1', true))

      // First sync attempt — fails
      const sync1 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(sync1.promise)
      mockCallbacks.onOpen!()
      mockSubCallbacks.onStarted!()
      sync1.reject(new Error('fail 1'))
      await flushPromises()

      // Disconnect and reconnect — second sync attempt — also fails
      mockCallbacks.onClose!()
      const sync2 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(sync2.promise)
      simulateReconnect()
      sync2.reject(new Error('fail 2'))
      await flushPromises()

      // Third attempt — should still have the action
      mockCallbacks.onClose!()
      const sync3 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(sync3.promise)
      simulateReconnect()

      const lastCall = mockMutations.syncWithServer.mock.calls.at(
        -1,
      )![0] as Action[]
      expect(lastCall).toEqual([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })

  // =====================
  // syncInProgress serialization
  // =====================
  describe('syncInProgress serialization', () => {
    it('concurrent sync calls are serialized via pendingResync', async () => {
      connectAndOpen()

      // First sync (from subscription onStarted)
      const sync1 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(sync1.promise)
      mockSubCallbacks.onStarted!()
      expect(mockMutations.syncWithServer).toHaveBeenCalledTimes(1)

      // Queue an action while sync1 is in-flight
      manager.sendAction(makeCheckAction('item1', true))

      // Trigger another sync (e.g. visibility change) — should be deferred
      const sync2 = deferred<{ items: object; lists: object }>()
      mockMutations.syncWithServer.mockReturnValueOnce(sync2.promise)
      mockSubCallbacks.onStarted!()
      // Still only 1 call — the second was queued as pendingResync
      expect(mockMutations.syncWithServer).toHaveBeenCalledTimes(1)

      // First sync completes — pendingResync triggers second sync automatically
      sync1.resolve({ items: {}, lists: {} })
      await flushPromises()

      // Now the second sync should have fired, including the action queued while sync1 was in-flight
      expect(mockMutations.syncWithServer).toHaveBeenCalledTimes(2)
      const secondCall = mockMutations.syncWithServer.mock
        .calls[1][0] as Action[]
      expect(secondCall).toEqual([
        {
          type: 'UPDATE_LIST_ITEM_CHECKED',
          payload: { id: 'item1', newChecked: true, hlcTimestamp: TEST_HLC },
        },
      ])
    })
  })
})
