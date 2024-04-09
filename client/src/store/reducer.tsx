import { produce } from 'immer'

import type State from '../types/State'
import type Action from '../types/Action'

import { types } from './actions'
import initialState from './initial'

const wsTypes = {
  INITIAL_FULL_DATA: 'INITIAL_FULL_DATA',
}

const reducer = produce((draft: State, action: Action) => {
  switch (action.type) {
    case types.ADD_LIST_ITEM: {
      const afterIndex = draft.items.findIndex(
        // @ts-expect-error have yet to type this correctly
        (item) => item.id === action.payload.afterId,
      )

      // @ts-expect-error have yet to type this correctly
      draft.items.splice(afterIndex + 1, 0, action.payload.item)
      break
    }
    case types.REMOVE_LIST_ITEM: {
      if (draft.items.length === 1) {
        // don't remove last item
        break
      }

      const index = draft.items.findIndex(
        // @ts-expect-error have yet to type this correctly
        (item) => item.id === action.payload.id,
      )
      draft.items.splice(index, 1)

      if (draft.items.length > index) {
        // Focus the item below
        draft.focusTargetId = draft.items[index].id
      } else {
        // Focus the item above if it was the last item
        draft.focusTargetId = draft.items[index - 1].id
      }
      break
    }
    case types.UPDATE_LIST_ITEM_VALUE: {
      const index = draft.items.findIndex(
        // @ts-expect-error have yet to type this correctly
        (item) => item.id === action.payload.id,
      )

      draft.items[index] = {
        ...draft.items[index],
        // @ts-expect-error have yet to type this correctly
        value: action.payload.newValue,
      }
      break
    }
    case types.UPDATE_LIST_ITEM_CHECKED: {
      const index = draft.items.findIndex(
        // @ts-expect-error have yet to type this correctly
        (item) => item.id === action.payload.id,
      )

      draft.items[index] = {
        ...draft.items[index],
        // @ts-expect-error have yet to type this correctly
        checked: action.payload.newChecked,
      }
      break
    }
    case wsTypes.INITIAL_FULL_DATA: {
      // @ts-expect-error have yet to type this correctly
      draft.items = action.payload
      draft.loaded = true
      break
    }
    default:
      // Optionally, handle other actions
      break
  }
}, initialState)

export default reducer
