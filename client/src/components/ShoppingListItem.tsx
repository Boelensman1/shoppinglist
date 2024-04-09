import { FC, useEffect, useRef } from 'react'

import Stack from '@mui/joy/Stack'
import Radio from '@mui/joy/Radio'
import Input from '@mui/joy/Input'
import useStore from '../store/useStore'
import actions from '../store/actions'

import randomString from '../utils/randomString'

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
  return null
}

interface ShoppingListItemProps {
  id: string
  isLast: boolean
  value: string
  checked: boolean
}

const ShoppingListItem: FC<ShoppingListItemProps> = ({
  id,
  isLast,
  value,
  checked,
}) => {
  const [{ focusTargetId }, dispatch] = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const getInputEl = () => {
    if (inputRef.current) {
      const input = inputRef.current.querySelector('input')
      if (input) {
        return input
      }
    }
  }

  // grab focus when first created
  useEffect(() => {
    getInputEl()?.focus()
  }, [])

  // grab focus when requested
  useEffect(() => {
    if (focusTargetId === id) {
      getInputEl()?.focus()
    }
  }, [id, focusTargetId])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(actions.updateListItemValue(id, event.target.value))
  }

  const handleChecked = () => {
    dispatch(actions.updateListItemChecked(id, !checked))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      dispatch(actions.addListItem(id))
    }
    if (event.key === 'Tab') {
      if (isLast) {
        dispatch(actions.addListItem(id))
      }
    }
    if (event.key === 'Backspace' && event.currentTarget.value === '') {
      event.preventDefault()
      dispatch(actions.removeListItem(id))
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pastedLines = event.clipboardData.getData('text').trim().split('\n')

    if (pastedLines.length === 0) {
      return
    }

    const lines = pastedLines.map((line) => ({
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
      value.slice(0, selectionStart) +
      firstLine.value +
      value.slice(selectionEnd)

    dispatch(actions.updateListItemValue(id, newValue))

    if (firstLine.checked && firstLine.checked != checked) {
      dispatch(actions.updateListItemChecked(id, firstLine.checked))
    }

    let lastId = id
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
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      width="100%"
      id={`sli-${id}`}
    >
      <Radio
        checked={checked}
        // prevent this element from getting focus on clicks
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleChecked}
      />
      <Input
        fullWidth
        variant="soft"
        placeholder="Nieuw item..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={inputRef}
      />
    </Stack>
  )
}

export default ShoppingListItem
