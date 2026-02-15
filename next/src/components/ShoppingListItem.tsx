'use client'

import {
  useEffect,
  useRef,
  memo,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import actions from '@/store/actions'
import genItemId from '@/utils/genItemId'
import { Item } from '@/types/store/Item'
import type { ItemWithDisplayedInfo } from '@/utils/itemsToList'

const parsePasteLineValue = (line: string) => {
  let parsedLine = line.trim()
  parsedLine = parsedLine.replace(/^- \[[ x ]\]/, '')
  parsedLine = parsedLine.replace('^-', '')
  parsedLine = parsedLine.replace('^▢', '')
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

interface ShoppingListItemProps extends ItemWithDisplayedInfo {
  isLast: boolean
  isOnly: boolean
}

type Line = Omit<Item, 'prevItemId'>

const ShoppingListItem: React.FC<ShoppingListItemProps> = (props) => {
  const { state, dispatch } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // grab focus when requested
  useEffect(() => {
    if (state.focusTargetId === props.id) {
      inputRef.current?.focus()
      dispatch(actions.focusProcessed())
    }
  }, [state.focusTargetId, props.id, dispatch])

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(actions.updateListItemValue(props.id, event.currentTarget.value))
  }

  const handleChecked = () => {
    dispatch(actions.updateListItemChecked(props.id, !props.checked))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
        dispatch(
          actions.removeListItem({
            id: props.id,
            displayedPrevItemId: props.displayedPrevItemId,
            displayedNextItemId: props.displayedNextItemId,
          }),
        )
      }
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    if (!event.clipboardData) {
      return
    }

    const pastedLines = event.clipboardData.getData('text').trim().split('\n')

    if (pastedLines.length === 0) {
      return
    }

    const lines: Line[] = pastedLines.map((line) => ({
      id: genItemId(),
      value: parsePasteLineValue(line),
      checked: parsePasteLineChecked(line),
      deleted: false,
    }))

    const firstLine = lines.shift()
    if (!firstLine) {
      return
    }

    // Determine the current selection in the input
    const input = event.target as HTMLInputElement
    const selectionStart = input.selectionStart ?? 0
    const selectionEnd = input.selectionEnd ?? 0

    // Replace the selected text or insert the pasted content at the cursor position
    const newValue =
      props.value.slice(0, selectionStart) +
      firstLine.value +
      props.value.slice(selectionEnd)

    const batch = []
    batch.push(actions.updateListItemValue(props.id, newValue))

    if (firstLine.checked && firstLine.checked != props.checked) {
      batch.push(actions.updateListItemChecked(props.id, firstLine.checked))
    }

    let lastId = props.id
    lines.forEach((line) => {
      batch.push(actions.addListItem(lastId, line))
      lastId = line.id
    })

    dispatch(actions.executeBatch(batch))

    setTimeout(() => {
      // Fix the cursor position
      const newCursorPosition = selectionStart + firstLine.value.length
      input.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 1) // wait 1, so the value update can propegate
  }

  return (
    <motion.div
      className={clsx(
        'shoppinglist-item', // for animation
        'flex flex-row items-center space-x-5 ml-2 pr-2 w-full ',
        !props.isLast && 'mb-2',
      )}
      id={`sli-${props.id}`}
      layout
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { duration: 0.3, ease: 'easeInOut' },
        opacity: { duration: 0.3 },
        y: { duration: 0.3 },
      }}
    >
      <input
        type="checkbox"
        checked={props.checked}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleChecked}
        style={{ transform: 'scale(1.6)' }}
        readOnly
      />
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nieuw item..."
          value={props.value}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {props.checked && (
          <div className="absolute top-1/2 left-2 right-2 h-px bg-blue-500 transform -translate-y-1/2 pointer-events-none" />
        )}
      </div>
    </motion.div>
  )
}

export default memo(ShoppingListItem)
