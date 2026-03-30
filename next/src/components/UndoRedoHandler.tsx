'use client'

import { useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import actions from '../store/actions'
import { clientHlcNow } from '../lib/hlcClient'

// Create a store for undo/redo functions
let undoRedoStore: {
  undo: () => void
  redo: () => void
} | null = null

export const getUndoRedoStore = () => undoRedoStore

const UndoRedoHandler: React.FC = () => {
  const { state, dispatch } = useStore()

  const undo = useCallback(() => {
    const actionToUndo = state.undoList[state.undoList.length - 1]
    if (actionToUndo) {
      dispatch(actions.undo(actionToUndo, clientHlcNow()))
    }
  }, [state.undoList, dispatch])

  const redo = useCallback(() => {
    const actionToRedo = state.redoList[state.redoList.length - 1]
    if (actionToRedo) {
      dispatch(actions.redo(actionToRedo, clientHlcNow()))
    }
  }, [state.redoList, dispatch])

  useEffect(() => {
    // Expose the functions through the store
    undoRedoStore = { undo, redo }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      if (e.key === 'z' && e.shiftKey && e.metaKey) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault()
        redo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      undoRedoStore = null
    }
  }, [undo, redo])

  return null
}

export default UndoRedoHandler
