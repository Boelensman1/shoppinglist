'use client'

import clsx from 'clsx'
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
            <ShoppingList items={itemsToList(state.items)} />
          </div>
          <ActionButtons
            items={itemsToList(state.items)}
            undoListLength={state.undoList.length}
            redoListLength={state.redoList.length}
            useMobileLayout={useMobileLayout}
          />
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
