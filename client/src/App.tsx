import { useEffect, FC } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'

import useMediaQuery from '@mui/material/useMediaQuery'
import Sheet from '@mui/joy/Sheet'
import List from '@mui/joy/List'
import ListItem from '@mui/joy/ListItem'

import type Item from './types/Item'

import useStore from './store/useStore'
import ShoppingListItem from './components/ShoppingListItem'
import WebSocketManager from './WebSocketManager'
import UndoRedoHandler from './components/UndoRedoHandler'
import { Box, CircularProgress } from '@mui/joy'
import actions from './store/actions'

const MotionList = motion(List)
const MotionListItem = motion(ListItem)

interface AppProps {
  items: Item[]
}

const App: FC<AppProps> = ({ items }) => (
  <MotionConfig transition={{ duration: 0.15 }}>
    <AnimatePresence>
      <MotionList layout>
        {items.map((item, i) => (
          <MotionListItem key={item.id} layout>
            <ShoppingListItem
              isOnly={items.length === 1}
              isLast={i === items.length - 1}
              {...item}
            />
          </MotionListItem>
        ))}
      </MotionList>
    </AnimatePresence>
  </MotionConfig>
)

const AppContainer = () => {
  const [{ items, loaded, webSocketState }, dispatch] = useStore()
  const useMobileLayout = useMediaQuery('(max-width:624px)')

  useEffect(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = window.location.host.startsWith('localhost')
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath}/ws`

    const webSocketManager = new WebSocketManager()

    // Connect to WebSocket and pass the dispatch function
    webSocketManager.connect(wsUrl, dispatch)

    dispatch(actions.connectWebSocketManager(webSocketManager))

    return () => {
      webSocketManager.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded || webSocketState !== 'connected') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (useMobileLayout) {
    return (
      <Box sx={{ py: 3, px: 1 }}>
        <App items={items} />
      </Box>
    )
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
      <UndoRedoHandler />
      <App items={items} />
    </Sheet>
  )
}

export default AppContainer
