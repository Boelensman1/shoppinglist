import type { Action } from '../types/store/Action'
import { types } from '../store/actions'
import type { TrpcClient } from './trpc'

/** Maximum number of send attempts before an action is dropped from the queue */
export const MAX_SEND_ATTEMPTS = 10

/**
 * Represents the lifecycle state of a queued action.
 */
export type ActionState =
  | 'pending' // Queued, not yet sent
  | 'sending' // Mutation in flight
  | 'failed' // Mutation failed (will retry on next sync)

/**
 * A queued action with its metadata.
 */
export interface QueuedAction {
  /** Unique ID for tracking */
  id: string

  /** The actual action */
  action: Action

  /** Current state in the lifecycle */
  state: ActionState

  /** Number of send attempts (for debugging) */
  attempts: number

  /** Timestamp when first queued (for ordering) */
  queuedAt: number

  /** Last error message if state is 'failed' */
  lastError?: string
}

/**
 * Configuration for routing an action type to its tRPC mutation.
 */
export interface ActionRoute {
  /** The tRPC mutation method name */
  mutation: keyof TrpcClient['client']

  /**
   * Whether this action should be included in syncWithServer.
   * Default: true (included in sync)
   * Set to false for fire-and-forget actions like notifications.
   */
  syncable?: boolean
}

/**
 * Strip client-only fields (`from`, `redo`) from actions before sending to tRPC.
 * These fields exist on client Action types but are not part of the Zod input schemas.
 */
export function stripClientFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
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

/**
 * Table mapping action types to their tRPC mutations.
 *
 * Adding a new action:
 * 1. Add the type to this table
 * 2. Implement the server mutation
 * 3. Done - no switch statement changes needed
 */
export const ACTION_ROUTES: Partial<Record<Action['type'], ActionRoute>> = {
  [types.ADD_LIST_ITEM]: {
    mutation: 'addListItem',
  },
  [types.REMOVE_LIST_ITEM]: {
    mutation: 'removeListItem',
  },
  [types.UPDATE_LIST_ITEM_VALUE]: {
    mutation: 'updateListItemValue',
  },
  [types.UPDATE_LIST_ITEM_CHECKED]: {
    mutation: 'updateListItemChecked',
  },
  [types.CLEAR_LIST]: {
    mutation: 'clearList',
  },
  [types.ADD_LIST]: {
    mutation: 'addList',
  },
  [types.UPDATE_LIST]: {
    mutation: 'updateList',
  },
  [types.REMOVE_LIST]: {
    mutation: 'removeList',
  },
  [types.SET_LIST]: {
    mutation: 'setList',
  },
  [types.BATCH]: {
    mutation: 'batch',
  },
  [types.SIGNAL_FINISHED_SHOPPINGLIST]: {
    mutation: 'signalFinishedShoppingList',
    syncable: false, // Fire-and-forget, not included in sync
  },
  [types.SUBSCRIBE_USER_PUSH_NOTIFICATIONS]: {
    mutation: 'subscribePushNotifications',
    syncable: false,
  },
  [types.UNSUBSCRIBE_USER_PUSH_NOTIFICATIONS]: {
    mutation: 'unsubscribePushNotifications',
    syncable: false,
  },
}

/**
 * Check if an action type has a route defined.
 */
export function hasRoute(actionType: Action['type']): boolean {
  return actionType in ACTION_ROUTES
}

/**
 * Get the route for an action type.
 */
export function getRoute(actionType: Action['type']): ActionRoute | undefined {
  return ACTION_ROUTES[actionType]
}

// Counter for generating unique action IDs
let actionIdCounter = 0

/**
 * Generate a unique ID for a queued action.
 */
export function generateActionId(): string {
  return `action-${Date.now()}-${++actionIdCounter}`
}

/**
 * Create a new QueuedAction from an Action.
 */
export function createQueuedAction(action: Action): QueuedAction {
  return {
    id: generateActionId(),
    action,
    state: 'pending',
    attempts: 0,
    queuedAt: Date.now(),
  }
}
