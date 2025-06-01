import { type Component, onMount, createSignal } from 'solid-js'

import useStore from '../store/useStore'
import actions from '../store/actions'

// Create a store for undo/redo functions
const [undoRedoStore, setUndoRedoStore] = createSignal<{
  undo: () => void
  redo: () => void
} | null>(null)

export const getUndoRedoStore = () => undoRedoStore()

const UndoRedoHandler: Component = () => {
  const [{ undoList, redoList }, dispatch] = useStore()

  const undo = () => {
    const actionToUndo = undoList[undoList.length - 1]
    if (actionToUndo) {
      dispatch(actions.undo(actionToUndo))
    }
  }

  const redo = () => {
    const actionToRedo = redoList[redoList.length - 1]
    if (actionToRedo) {
      dispatch(actions.redo(actionToRedo))
    }
  }

  onMount(() => {
    // Expose the functions through the store
    setUndoRedoStore({ undo, redo })

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
      setUndoRedoStore(null)
    }
  })

  return null
}

export default UndoRedoHandler
