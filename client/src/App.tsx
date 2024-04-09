import { useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'

import Sheet from '@mui/joy/Sheet'
import List from '@mui/joy/List'
import ListItem from '@mui/joy/ListItem'

import type Item from './types/Item'

import useStore from './store/useStore'
import ShoppingListItem from './components/ShoppingListItem'
import { webSocketManager } from './WebSocketManager'

const sortItems = (items: Item[]) => {
  // Js sort is stable!
  return [...items].sort((a, b) => {
    if (a.checked && !b.checked) return 1
    if (b.checked && !a.checked) return -1
    // If both have the same checked, maintain original order
    return 0
  })
}

const MotionList = motion(List)
const MotionListItem = motion(ListItem)

const App = () => {
  const [{ items, loaded }, dispatch] = useStore()

  useEffect(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = window.location.host.startsWith('localhost')
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath}/ws`

    // Connect to WebSocket and pass the dispatch function
    webSocketManager.connect(wsUrl, dispatch)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) {
    return null
  }

  return (
    <Sheet
      sx={{
        maxWidth: 600,
        mx: 'auto',
        my: 4,
        py: 3,
        px: 2,
        borderRadius: 'sm',
        boxShadow: 'md',
      }}
      variant="outlined"
    >
      <MotionConfig transition={{ duration: 0.15 }}>
        <AnimatePresence>
          <MotionList layout>
            {sortItems(items).map((item, i) => (
              <MotionListItem key={item.id} layout>
                <ShoppingListItem isLast={i === items.length - 1} {...item} />
              </MotionListItem>
            ))}
          </MotionList>
        </AnimatePresence>
      </MotionConfig>
    </Sheet>
  )
}

export default App
