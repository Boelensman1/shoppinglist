'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { List, ListId } from 'server/shared'
import actions from '../store/actions'
import { useStore } from '../store/useStore'
import AddListForm from './AddListForm'
import { COLOUR_PRESETS } from '@/constants'

interface ListTitleProps {
  useMobileLayout: boolean
}

function EditListForm({ list, onClose }: { list: List; onClose: () => void }) {
  const { dispatch } = useStore()
  const [name, setName] = useState(list.name)
  const [colour, setColour] = useState(list.colour)

  const handleSave = () => {
    if (!name.trim()) return
    dispatch(actions.updateList({ id: list.id, name: name.trim(), colour }))
    onClose()
  }

  const handleRemove = () => {
    if (!confirm('Remove this list and all its items?')) return
    dispatch(actions.removeList(list.id))
    onClose()
  }

  return (
    <div className="px-3 py-2 flex flex-col gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="border border-gray-300 rounded p-1.5 text-sm"
        autoFocus
      />
      <div className="flex gap-1.5 flex-wrap">
        {COLOUR_PRESETS.map((c) => (
          <button
            key={c}
            className={clsx(
              'w-7 h-7 rounded-full',
              colour === c && 'ring-2 ring-gray-800 ring-offset-1',
            )}
            style={{ backgroundColor: c }}
            onClick={() => setColour(c)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-gray-200 text-gray-700 rounded p-1.5 text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="flex-1 bg-blue-500 text-white rounded p-1.5 text-sm disabled:opacity-50"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          Save
        </button>
      </div>
      {list.id !== ('default' as ListId) && (
        <button
          className="text-red-500 hover:text-red-700 text-sm"
          onClick={handleRemove}
        >
          Remove list
        </button>
      )}
    </div>
  )
}

export default function ListTitle({ useMobileLayout }: ListTitleProps) {
  const { dispatch, state } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [editingListId, setEditingListId] = useState<ListId | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const lists = Object.values(state.lists)
  const activeList = state.lists[state.activeListId]

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setEditingListId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleSwitchList = (id: ListId) => {
    dispatch(actions.switchActiveList(id))
    setIsOpen(false)
    setEditingListId(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        className={clsx(
          'font-semibold flex items-center gap-1 cursor-pointer',
          useMobileLayout ? 'text-xl px-2 pb-3' : 'text-2xl px-1 pb-4',
        )}
        style={{ color: activeList?.colour ?? '#3b82f6' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeList?.name ?? ''}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[220px] py-2">
          {lists.map((list) => (
            <div key={list.id}>
              {editingListId === list.id ? (
                <EditListForm
                  list={list}
                  onClose={() => setEditingListId(null)}
                />
              ) : (
                <div className="flex items-center px-3 py-1.5 hover:bg-gray-50">
                  <button
                    className="flex items-center gap-2 flex-1 text-left text-sm"
                    onClick={() => handleSwitchList(list.id)}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: list.colour }}
                    />
                    <span
                      className={clsx(
                        state.activeListId === list.id && 'font-semibold',
                      )}
                    >
                      {list.name}
                    </span>
                  </button>
                  <button
                    className="text-gray-400 hover:text-gray-600 text-xs shrink-0 px-1"
                    onClick={() => setEditingListId(list.id)}
                    title="Edit list"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-gray-100 my-1" />
          <div className="px-3 py-1">
            <AddListForm onListAdded={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
