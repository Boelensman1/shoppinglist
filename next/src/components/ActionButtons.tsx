'use client'

import clsx from 'clsx'
import { useState } from 'react'
import { getUndoRedoStore } from './UndoRedoHandler'
import actions from '../store/actions'
import { useStore } from '../store/useStore'
import { clientHlcNow } from '@/lib/hlcClient'

interface ActionButtonsProps {
  useMobileLayout: boolean
}

export default function ActionButtons({ useMobileLayout }: ActionButtonsProps) {
  const { dispatch, state, pushSub } = useStore()
  const [showButtons, setShowButtons] = useState(false)
  const [signalSent, setSignalSent] = useState(false)

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
          {useMobileLayout && (
            <>
              <button
                className="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.undo()}
                disabled={state.undoList.length === 0}
              >
                Undo
              </button>
              <button
                className="bg-gray-500 text-white p-2 rounded-full shadow-lg px-4 disabled:opacity-50"
                onClick={() => getUndoRedoStore()?.redo()}
                disabled={state.redoList.length === 0}
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
              const activeItems = Object.values(state.items).filter(
                (item) => item.listId === state.activeListId,
              )
              dispatch(
                actions.clearCheckedItems(
                  activeItems,
                  state.activeListId,
                  clientHlcNow(),
                ),
              )
              window.scrollTo({ top: 0 })
              setShowButtons(false)
            }}
          >
            Clear checked
          </button>
          <button
            className="bg-red-500 text-white p-2 rounded-full shadow-lg px-4"
            onClick={() => {
              dispatch(actions.clear(state.activeListId, clientHlcNow()))
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
