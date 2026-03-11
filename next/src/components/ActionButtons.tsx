'use client'

import clsx from 'clsx'
import { useState } from 'react'
import type { Item, ListId } from '@shoppinglist/shared'
import { getUndoRedoStore } from './UndoRedoHandler'
import actions from '../store/actions'
import { useStore } from '../store/useStore'
import genItemId from '@/utils/genItemId'

const COLOUR_PRESETS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f97316', // orange
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
]

interface ActionButtonsProps {
  items: Item[]
  undoListLength: number
  redoListLength: number
  useMobileLayout: boolean
}

export default function ActionButtons({
  items,
  undoListLength,
  redoListLength,
  useMobileLayout,
}: ActionButtonsProps) {
  const { dispatch, state, pushSub } = useStore()
  const [showButtons, setShowButtons] = useState(false)
  const [signalSent, setSignalSent] = useState(false)
  const [showAddList, setShowAddList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColour, setNewListColour] = useState(COLOUR_PRESETS[0])

  const lists = Object.values(state.lists)

  const handleAddList = () => {
    if (!newListName.trim()) return
    const id = genItemId() as unknown as ListId
    dispatch(
      actions.addList({
        id,
        name: newListName.trim(),
        colour: newListColour,
      }),
    )
    setNewListName('')
    setNewListColour(COLOUR_PRESETS[0])
    setShowAddList(false)
    dispatch(actions.switchActiveList(id))
  }

  const handleRemoveList = (id: ListId) => {
    if (id === ('default' as ListId)) return
    if (!confirm('Remove this list and all its items?')) return
    dispatch(actions.removeList(id))
  }

  return (
    <>
      {useMobileLayout && !showButtons && (
        <button
          className="fixed bottom-4 right-4 bg-gray-500 text-white p-2 rounded-full shadow-lg w-12 h-12 flex items-center justify-center"
          onClick={() => setShowButtons(!showButtons)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
      {(showButtons || !useMobileLayout) && (
        <div
          className={clsx(
            'fixed bottom-4 right-4 flex gap-2',
            useMobileLayout && 'flex-col items-end',
          )}
        >
          {useMobileLayout && (
            <button
              className="bg-gray-500 text-white p-2 rounded-full shadow-lg w-12 h-12 flex items-center justify-center mb-2"
              onClick={() => setShowButtons(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {/* List switcher */}
          <div className="flex gap-1 flex-wrap items-center">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-0.5">
                <button
                  className={clsx(
                    'p-2 rounded-full shadow-lg px-3 text-white text-sm',
                    state.activeListId === list.id &&
                      'ring-2 ring-white ring-offset-2',
                  )}
                  style={{ backgroundColor: list.colour }}
                  onClick={() => dispatch(actions.switchActiveList(list.id))}
                >
                  {list.name}
                </button>
                {list.id !== ('default' as ListId) && (
                  <button
                    className="text-red-400 hover:text-red-600 text-xs w-5 h-5 flex items-center justify-center"
                    onClick={() => handleRemoveList(list.id)}
                    title="Remove list"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
            <button
              className="bg-gray-300 text-gray-700 p-2 rounded-full shadow-lg px-3 text-sm"
              onClick={() => setShowAddList(!showAddList)}
            >
              + List
            </button>
          </div>

          {/* Add list form */}
          {showAddList && (
            <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2 min-w-[200px]">
              <input
                type="text"
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                className="border border-gray-300 rounded p-1.5 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {COLOUR_PRESETS.map((colour) => (
                  <button
                    key={colour}
                    className={clsx(
                      'w-7 h-7 rounded-full',
                      newListColour === colour &&
                        'ring-2 ring-gray-800 ring-offset-1',
                    )}
                    style={{ backgroundColor: colour }}
                    onClick={() => setNewListColour(colour)}
                  />
                ))}
              </div>
              <button
                className="bg-blue-500 text-white rounded p-1.5 text-sm disabled:opacity-50"
                onClick={handleAddList}
                disabled={!newListName.trim()}
              >
                Add list
              </button>
            </div>
          )}

          {useMobileLayout && (
            <>
              <button
                className="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.undo()}
                disabled={undoListLength === 0}
              >
                Undo
              </button>
              <button
                className="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.redo()}
                disabled={redoListLength === 0}
              >
                Redo
              </button>
            </>
          )}
          {state.canEnablePushNotifications && (
            <button
              className="bg-purple-500 text-white p-2 rounded-full shadow-lg px-4"
              onClick={() => {
                if (state.hasPushNotificationsSubscription) {
                  pushSub.unsubscribe()
                } else {
                  pushSub.subscribe()
                }
              }}
            >
              {state.hasPushNotificationsSubscription
                ? 'Unsubscribe from notifications'
                : 'Subscribe to notifications'}
            </button>
          )}
          <button
            className={clsx(
              'text-white p-2 rounded-full shadow-lg px-4 transition-colors',
              signalSent
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600',
            )}
            onClick={() => {
              if (!signalSent) {
                dispatch(actions.signalFinishedShoppingList(state.userId))
                setSignalSent(true)
                setTimeout(() => setSignalSent(false), 3000)
              }
            }}
            disabled={signalSent}
          >
            {signalSent ? '✓ Signal sent!' : 'Signal shopping list finished'}
          </button>
          <button
            className="bg-blue-500 text-white p-2 rounded-full shadow-lg px-4"
            onClick={() => {
              dispatch(actions.clearCheckedItems(items, state.activeListId))
              window.scrollTo({ top: 0 })
              setShowButtons(false)
            }}
          >
            Clear checked
          </button>
          <button
            className="bg-red-500 text-white p-2 rounded-full shadow-lg px-4"
            onClick={() => {
              dispatch(actions.clear(state.activeListId))
              window.scrollTo({ top: 0 })
              setShowButtons(false)
            }}
          >
            Clear list
          </button>
        </div>
      )}
    </>
  )
}
