import { type Component, For, Show, onMount } from 'solid-js'
import { TransitionGroup } from 'solid-transition-group'
import { createMediaQuery } from '@solid-primitives/media'

import type Item from './store/types/Item'

import useStore from './store/useStore'
import ShoppingListItem from './components/ShoppingListItem'
import WebSocketManager from './WebSocketManager'
import UndoRedoHandler from './components/UndoRedoHandler'

interface ShoppingListProps {
  items: Item[]
}

const ShoppingList: Component<ShoppingListProps> = (props) => (
  <TransitionGroup name="group-item">
    <For each={props.items}>
      {(item, i) => (
        <ShoppingListItem
          isOnly={props.items.length === 1}
          isLast={i() === props.items.length - 1}
          {...item}
        />
      )}
    </For>
  </TransitionGroup>
)

interface AppProps {
  wsm: WebSocketManager
}

const App: Component<AppProps> = (props) => {
  const [state, dispatch] = useStore()
  const useMobileLayout = createMediaQuery('(max-width:624px)')

  onMount(() => {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const basePath = window.location.pathname.replace(/\/$/, '')
    const wsUrl = window.location.host.startsWith('localhost')
      ? 'ws://127.0.0.1:1222'
      : `${wsScheme}://${window.location.host}/${basePath}/ws`

    // Connect to WebSocket and pass the dispatch function
    props.wsm.connect(wsUrl, dispatch)
  })

  return (
    <Show
      when={state.loaded && state.webSocketState === 'connected'}
      fallback={
        <div class="flex items-center justify-center h-screen">
          <div class="loader" />
        </div>
      }
    >
      <div
        class={
          useMobileLayout()
            ? 'py-3 px-1'
            : 'max-w-lg mx-auto my-4 py-3 px-2 rounded-sm shadow-md border'
        }
      >
        <ShoppingList items={state.items} />
      </div>
      <UndoRedoHandler />
    </Show>
  )
}

export default App
