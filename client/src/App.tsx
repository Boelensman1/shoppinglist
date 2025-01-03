import clsx from 'clsx'
import { type Component, For, Show, onMount } from 'solid-js'
import { createMediaQuery } from '@solid-primitives/media'

import type Item from './store/types/Item'

import useStore from './store/useStore'
import ShoppingListItem from './components/ShoppingListItem'
import WebSocketManager from './WebSocketManager'
import UndoRedoHandler from './components/UndoRedoHandler'
import IndexedDbManager from './IndexedDbManager'

interface ShoppingListProps {
  items: Item[]
}

const ShoppingList: Component<ShoppingListProps> = (props) => (
  <For each={props.items}>
    {(item, i) => (
      <ShoppingListItem
        isOnly={props.items.length === 1}
        isLast={i() === props.items.length - 1}
        {...item}
      />
    )}
  </For>
)

interface AppProps {
  wsm: WebSocketManager
  idbm: IndexedDbManager
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

  onMount(() => {
    // eslint-disable-next-line solid/reactivity
    props.idbm.init().then(async () => {
      const items = await props.idbm.getItems()
      dispatch({
        type: 'INITIAL_FULL_DATA',
        payload: items,
        fromServer: true,
      })
    })
  })

  return (
    <div
      class={clsx(
        'w-screen h-screen',
        !useMobileLayout() && 'py-4',
        state.loaded && state.webSocketState === 'disconnected' && 'bg-red-500',
        state.loaded &&
          state.webSocketState === 'disconnected' &&
          useMobileLayout() &&
          'p-1',
      )}
      style={{ overflow: 'scroll' }}
    >
      <Show
        when={state.loaded}
        fallback={
          <div class="flex items-center justify-center h-screen">
            <div class="loader" />
          </div>
        }
      >
        <div
          class={clsx(
            'bg-white',
            useMobileLayout()
              ? ' py-3 px-1'
              : ' max-w-xl mx-auto py-5 pr-6 pl-4 rounded-sm shadow-md border',
          )}
        >
          <ShoppingList items={state.items} />
        </div>
        <UndoRedoHandler />
      </Show>
    </div>
  )
}

export default App
