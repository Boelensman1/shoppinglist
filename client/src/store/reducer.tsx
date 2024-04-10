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
      // @ts-expect-error have yet to type this correctly
      draft.focusTargetId = action.payload.item.id
      break
    }
    case types.REMOVE_LIST_ITEM: {
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

      // Find the last unchecked item
      let lastUncheckedIndex = draft.items.length - 1
      while (
        lastUncheckedIndex >= 0 &&
        draft.items[lastUncheckedIndex].checked
      ) {
        lastUncheckedIndex--
      }

      // update item
      draft.items[index] = {
        ...draft.items[index],
        // @ts-expect-error have yet to type this correctly
        checked: action.payload.newChecked,
      }

      if (lastUncheckedIndex === index) {
        return
      }

      // Move it to the end of the unchecked array
      const [item] = draft.items.splice(index, 1)
      if (lastUncheckedIndex === -1) {
        // Put it at the start if all other items are checked
        draft.items.unshift(item)
      } else {
        // Insert before/after the last unchecked item, depending on checked
        draft.items.splice(
          // @ts-expect-error have yet to type this correctly
          lastUncheckedIndex + Number(!action.payload.newChecked),
          0,
          item,
        )
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
