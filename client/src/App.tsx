import { useEffect } from 'react'

import Sheet from '@mui/joy/Sheet'
import List from '@mui/joy/List'
import ListItem from '@mui/joy/ListItem'

import useStore from './store/useStore'
import ShoppingListItem from './components/ShoppingListItem'
import { webSocketManager } from './WebSocketManager'

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
      <List>
        {items.map((item, i) => (
          <ListItem key={item.id}>
            <ShoppingListItem isLast={i == items.length - 1} {...item} />
          </ListItem>
        ))}
      </List>
    </Sheet>
  )
}

export default App
