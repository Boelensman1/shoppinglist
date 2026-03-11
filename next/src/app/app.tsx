'use client'

import clsx from 'clsx'
import { useMemo } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'

import { useStore } from '../store/useStore'

import UndoRedoHandler from '../components/UndoRedoHandler'
import ShoppingList from '../components/ShoppingList'
import ActionButtons from '../components/ActionButtons'
import { isLoaded } from '@/store/utils'
import { itemsToList } from '@/utils/itemsToList'

export default function App() {
  const { state } = useStore()
  const useMobileLayout = useMediaQuery('(max-width:750px)')

  const activeList = isLoaded(state)
    ? state.lists[state.activeListId]
    : undefined

  const displayItems = useMemo(() => {
    if (!isLoaded(state)) return []
    // Filter items to only show those belonging to the active list
    const filteredItems = Object.fromEntries(
      Object.entries(state.items).filter(
        ([, item]) => item.listId === state.activeListId,
      ),
    ) as typeof state.items
    return itemsToList(filteredItems)
  }, [state])

  return (
    <div
      className={clsx(
        'w-screen h-dvh',
        !useMobileLayout && 'py-4',
        isLoaded(state) &&
          state.webSocketState === 'disconnected' &&
          'bg-red-500',
        isLoaded(state) &&
          state.webSocketState === 'disconnected' &&
          useMobileLayout &&
          'p-1',
      )}
      style={{
        overflowY: 'scroll',
        overflowX: 'hidden',
        paddingTop: useMobileLayout
          ? 'max(env(safe-area-inset-top), 0px)'
          : undefined,
        paddingBottom: useMobileLayout
          ? 'env(safe-area-inset-bottom)'
          : undefined,
      }}
    >
      {isLoaded(state) ? (
        <>
          <div
            className={clsx(
              'bg-white',
              useMobileLayout
                ? ' py-3 px-1'
                : ' max-w-xl mx-auto py-5 pr-6 pl-4 rounded-sm shadow-md border border-gray-200',
            )}
          >
            <ShoppingList
              items={displayItems}
              listColour={activeList?.colour ?? '#3b82f6'}
            />
          </div>
          <ActionButtons useMobileLayout={useMobileLayout} />
          <UndoRedoHandler />
        </>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="loader" />
        </div>
      )}
    </div>
  )
}
