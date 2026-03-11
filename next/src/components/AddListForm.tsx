'use client'

import clsx from 'clsx'
import { useState } from 'react'
import type { ListId } from 'server/shared'
import actions from '../store/actions'
import { useStore } from '../store/useStore'
import genItemId from '@/utils/genItemId'

const COLOUR_PRESETS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f97316', // orange
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
]

export default function AddListForm() {
  const { dispatch } = useStore()
  const [showAddList, setShowAddList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColour, setNewListColour] = useState(COLOUR_PRESETS[0])

  const handleAddList = () => {
    if (!newListName.trim()) return
    const id = genItemId() as unknown as ListId
    dispatch(
      actions.addList({
        id,
        name: newListName.trim(),
        colour: newListColour,
      }),
    )
    setNewListName('')
    setNewListColour(COLOUR_PRESETS[0])
    setShowAddList(false)
    dispatch(actions.switchActiveList(id))
  }

  return (
    <>
      <button
        className="bg-gray-300 text-gray-700 p-2 rounded-full shadow-lg px-3 text-sm"
        onClick={() => setShowAddList(!showAddList)}
      >
        + List
      </button>
      {showAddList && (
        <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col gap-2 min-w-[200px]">
          <input
            type="text"
            placeholder="List name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
            className="border border-gray-300 rounded p-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-1.5 flex-wrap">
            {COLOUR_PRESETS.map((colour) => (
              <button
                key={colour}
                className={clsx(
                  'w-7 h-7 rounded-full',
                  newListColour === colour &&
                    'ring-2 ring-gray-800 ring-offset-1',
                )}
                style={{ backgroundColor: colour }}
                onClick={() => setNewListColour(colour)}
              />
            ))}
          </div>
          <button
            className="bg-blue-500 text-white rounded p-1.5 text-sm disabled:opacity-50"
            onClick={handleAddList}
            disabled={!newListName.trim()}
          >
            Add list
          </button>
        </div>
      )}
    </>
  )
}
