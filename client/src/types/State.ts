import type Item from './Item'

interface State {
  items: Item[]
  focusTargetId: string | null
  loaded: boolean
}

export default State
