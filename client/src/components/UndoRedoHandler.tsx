import { type Component, onMount } from 'solid-js'

import useStore from '../store/useStore'
import actions from '../store/actions'

const UndoRedoHandler: Component = () => {
  const [{ undoList, redoList }, dispatch] = useStore()
  let touchStartX = 0

  onMount(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
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

    document.addEventListener('keydown', handleUndoRedo)

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const swipeDistance = touchEndX - touchStartX
      const minSwipeDistance = 50 // minimum pixels to trigger swipe

      if (Math.abs(swipeDistance) >= minSwipeDistance) {
        if (swipeDistance < 0) {
          // Left swipe
          undo()
        } else {
          // Right swipe
          redo()
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('keydown', handleUndoRedo)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  })

  const undo = () => {
    const actionToUndo = undoList[undoList.length - 1]
    if (actionToUndo) {
      dispatch(actions.undo(actionToUndo))
      dispatch(actionToUndo)
    }
  }
  const redo = () => {
    const actionToRedo = redoList[redoList.length - 1]
    if (actionToRedo) {
      dispatch(actions.redo(actionToRedo))
      dispatch(actionToRedo)
    }
  }

  return null
}

export default UndoRedoHandler
