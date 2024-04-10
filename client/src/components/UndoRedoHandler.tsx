import { useEffect } from 'react'

import useStore from '../store/useStore'
import actions from '../store/actions'

const UndoRedoHandler = () => {
  const [{ undoList, redoList }, dispatch] = useStore()

  useEffect(() => {
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

    return () => {
      document.removeEventListener('keydown', handleUndoRedo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoList, redoList])

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
