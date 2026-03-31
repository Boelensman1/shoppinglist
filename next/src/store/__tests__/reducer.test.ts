import { describe, it, expect } from 'vitest'
import { produce } from 'immer'
import type { ItemId, ItemRecords, ListId, ListRecords } from 'server/shared'
import type { State } from '../../types/store/State'
import reducer from '../reducer'
import type { Action, InitialFullDataAction } from '../../types/store/Action'

// --- Helpers ---

const DEFAULT_LIST_ID = 'default' as ListId

const defaultList = {
  id: DEFAULT_LIST_ID,
  name: 'Boodschappen',
  colour: '#3b82f6',
}

function makeState(overrides: Partial<State> = {}): State {
  return {
    userId: 'test-user',
    items: {},
    lists: { [DEFAULT_LIST_ID]: defaultList } as ListRecords,
    activeListId: DEFAULT_LIST_ID,
    focusTargetId: null,
    idbmLoaded: true,
    serverLoaded: true,
    wsConnectTimedOut: false,
    undoList: [],
    redoList: [],
    webSocketState: 'connected',
    hasPushNotificationsSubscription: false,
    canEnablePushNotifications: false,
    ...overrides,
  }
}

function makeItem(
  id: string,
  overrides: Partial<{
    value: string
    checked: boolean
    deleted: boolean
    listId: string
    hlcTimestamp: string
  }> = {},
) {
  return {
    id: id as ItemId,
    value: overrides.value ?? '',
    checked: overrides.checked ?? false,
    deleted: overrides.deleted ?? false,
    prevItemId: 'HEAD' as const,
    listId: (overrides.listId ?? 'default') as ListId,
    hlcTimestamp: overrides.hlcTimestamp ?? '0000000000000-0000-test',
  }
}

function applyAction(state: State, action: Action): State {
  return produce(state, (draft) => {
    reducer(draft, action)
  })
}

// --- Tests ---

describe('Reducer: INITIAL_FULL_DATA wholesale overwrite bug', () => {
  it('server sync should not overwrite a newer local check', () => {
    // 1. Start with an item that is unchecked (as the server knows it)
    const item = makeItem('item1', { value: 'milk', checked: false })
    let state = makeState({
      items: { [item.id]: item } as ItemRecords,
    })

    // 2. User checks the item locally
    state = applyAction(state, {
      type: 'UPDATE_LIST_ITEM_CHECKED',
      payload: {
        id: 'item1' as ItemId,
        newChecked: true,
        hlcTimestamp: '0000000000001-0000-test',
      },
      from: 'user',
    })
    expect(state.items['item1' as ItemId].checked).toBe(true)

    // 3. Server sync response arrives with STALE state (item still unchecked)
    //    This is the data the server had BEFORE processing the user's check
    const staleServerItems: ItemRecords = {
      ['item1' as ItemId]: makeItem('item1', {
        value: 'milk',
        checked: false, // stale!
      }),
    }

    const syncAction: InitialFullDataAction = {
      type: 'INITIAL_FULL_DATA',
      payload: {
        items: staleServerItems,
        lists: { [DEFAULT_LIST_ID]: defaultList } as ListRecords,
      },
      from: 'server',
    }

    state = applyAction(state, syncAction)

    // 4. The item should STILL be checked — the local change is newer
    //    BUG: currently this fails because INITIAL_FULL_DATA does
    //    `draft.items = action.payload.items` (wholesale overwrite)
    expect(state.items['item1' as ItemId].checked).toBe(true)
  })

  it('server sync should not overwrite a newer local value edit', () => {
    const item = makeItem('item1', { value: 'milk' })
    let state = makeState({
      items: { [item.id]: item } as ItemRecords,
    })

    // User edits the value locally
    state = applyAction(state, {
      type: 'UPDATE_LIST_ITEM_VALUE',
      payload: {
        id: 'item1' as ItemId,
        newValue: 'oat milk',
        hlcTimestamp: '0000000000001-0000-test',
      },
      from: 'user',
    })
    expect(state.items['item1' as ItemId].value).toBe('oat milk')

    // Stale server state arrives (still has 'milk')
    const syncAction: InitialFullDataAction = {
      type: 'INITIAL_FULL_DATA',
      payload: {
        items: {
          ['item1' as ItemId]: makeItem('item1', { value: 'milk' }),
        },
        lists: { [DEFAULT_LIST_ID]: defaultList } as ListRecords,
      },
      from: 'server',
    }

    state = applyAction(state, syncAction)

    // Should keep the user's edit
    expect(state.items['item1' as ItemId].value).toBe('oat milk')
  })

  it('server sync should not lose a locally added item', () => {
    let state = makeState()

    // User adds an item locally
    const newItem = makeItem('new-item', { value: 'eggs' })
    state = applyAction(state, {
      type: 'ADD_LIST_ITEM',
      payload: newItem,
      from: 'user',
    })
    expect(state.items['new-item' as ItemId]).toBeDefined()

    // Server sync arrives without the new item (hasn't seen it yet)
    const syncAction: InitialFullDataAction = {
      type: 'INITIAL_FULL_DATA',
      payload: {
        items: {
          ['old-item' as ItemId]: makeItem('old-item', { value: 'bread' }),
        },
        lists: { [DEFAULT_LIST_ID]: defaultList } as ListRecords,
      },
      from: 'server',
    }

    state = applyAction(state, syncAction)

    // The locally added item should still exist
    expect(state.items['new-item' as ItemId]).toBeDefined()
    expect(state.items['new-item' as ItemId].value).toBe('eggs')
    // And the server item should also be present
    expect(state.items['old-item' as ItemId]).toBeDefined()
  })

  it('server sync should not resurrect a locally deleted item', () => {
    const item = makeItem('item1', { value: 'milk' })
    let state = makeState({
      items: { [item.id]: item } as ItemRecords,
    })

    // User deletes the item locally
    state = applyAction(state, {
      type: 'REMOVE_LIST_ITEM',
      payload: {
        id: 'item1' as ItemId,
        hlcTimestamp: '0000000000001-0000-test',
      },
      from: 'user',
    })
    expect(state.items['item1' as ItemId].deleted).toBe(true)

    // Server sync arrives with the item still alive (hasn't seen the delete yet)
    const syncAction: InitialFullDataAction = {
      type: 'INITIAL_FULL_DATA',
      payload: {
        items: {
          ['item1' as ItemId]: makeItem('item1', {
            value: 'milk',
            checked: false,
          }),
        },
        lists: { [DEFAULT_LIST_ID]: defaultList } as ListRecords,
      },
      from: 'server',
    }

    state = applyAction(state, syncAction)

    // The item should still be marked as deleted
    expect(state.items['item1' as ItemId].deleted).toBe(true)
  })
})
