import { UndoableAction } from './Action'
import type Item from './Item'

interface State {
  items: Item[]
  focusTargetId: string | null
  loaded: boolean
  undoList: UndoableAction[]
  redoList: UndoableAction[]
}

export default State
