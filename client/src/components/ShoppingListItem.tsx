import { type Component, JSX, createEffect, Show } from 'solid-js'

import useStore from '../store/useStore'
import actions from '../store/actions'

import randomString from '../utils/randomString'
import clsx from 'clsx'

const parsePasteLineValue = (line: string) => {
  let parsedLine = line.trim()
  parsedLine = parsedLine.replace(/^- \[[ x ]\]/, '')
  parsedLine = parsedLine.replace('^-', '')
  return parsedLine.trim()
}
const parsePasteLineChecked = (line: string) => {
  if (line.trim().startsWith('- [x]')) {
    return true
  }
  if (line.trim().startsWith('- [ ]')) {
    return false
  }
  return false
}

interface ShoppingListItemProps {
  id: string
  isLast: boolean
  isOnly: boolean
  value: string
  checked: boolean
}

interface Line {
  id: string
  value: string
  checked: boolean
}

const ShoppingListItem: Component<ShoppingListItemProps> = (props) => {
  const [state, dispatch] = useStore()
  let inputRef!: HTMLInputElement

  // grab focus when requested
  createEffect(() => {
    if (state.focusTargetId === props.id) {
      inputRef?.focus()
    }
  })

  const handleInput: JSX.ChangeEventHandler<HTMLInputElement, Event> = (
    event,
  ) => {
    dispatch(actions.updateListItemValue(props.id, event.currentTarget.value))
  }

  const handleChecked = () => {
    dispatch(actions.updateListItemChecked(props.id, !props.checked))
  }

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (
    event,
  ) => {
    if (event.key === 'Enter') {
      dispatch(actions.addListItem(props.id))
    }
    if (event.key === 'Tab') {
      if (props.isLast) {
        event.preventDefault()
        dispatch(actions.addListItem(props.id))
      }
    }

    if (event.key === 'Backspace' && event.currentTarget.value === '') {
      event.preventDefault()
      if (!props.isOnly) {
        dispatch(actions.removeListItem(props.id))
      }
    }
  }

  const handlePaste: JSX.EventHandler<HTMLInputElement, ClipboardEvent> = (
    event,
  ) => {
    event.preventDefault()
    if (!event.clipboardData) {
      return
    }

    const pastedLines = event.clipboardData.getData('text').trim().split('\n')

    if (pastedLines.length === 0) {
      return
    }

    const lines: Line[] = pastedLines.map((line) => ({
      id: randomString(),
      value: parsePasteLineValue(line),
      checked: parsePasteLineChecked(line),
    }))

    const firstLine = lines.shift()!

    // Determine the current selection in the input
    const input = event.target as HTMLInputElement
    const selectionStart = input.selectionStart ?? 0
    const selectionEnd = input.selectionEnd ?? 0

    // Replace the selected text or insert the pasted content at the cursor position
    const newValue =
      props.value.slice(0, selectionStart) +
      firstLine.value +
      props.value.slice(selectionEnd)

    dispatch(actions.updateListItemValue(props.id, newValue))

    if (firstLine.checked && firstLine.checked != props.checked) {
      dispatch(actions.updateListItemChecked(props.id, firstLine.checked))
    }

    let lastId = props.id
    lines.forEach((line) => {
      dispatch(actions.addListItem(lastId, line))
      lastId = line.id
    })

    setTimeout(() => {
      // Fix the cursor position
      const newCursorPosition = selectionStart + firstLine.value.length
      input.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 1) // wait 1, so the value update can propegate
  }

  return (
    <div
      class={clsx(
        'shoppinglist-item', // for animation
        'flex flex-row items-center space-x-2 w-full ',
        !props.isLast && 'mb-2',
      )}
      id={`sli-${props.id}`}
    >
      <input
        type="radio"
        checked={props.checked}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleChecked}
        style={{ transform: 'scale(1.5)' }}
        class="mx-1"
      />
      <div class="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nieuw item..."
          value={props.value}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Show when={props.checked}>
          <div class="absolute top-1/2 left-2 right-2 h-px bg-blue-500 transform -translate-y-1/2 pointer-events-none" />
        </Show>
      </div>
    </div>
  )
}

export default ShoppingListItem
