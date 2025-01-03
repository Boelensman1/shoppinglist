import { type Component, For } from 'solid-js'
import { TransitionGroup } from 'solid-transition-group'

import ShoppingListItem from './ShoppingListItem'

import type Item from '../store/types/Item'

import './ShoppingList.css' // for animations

interface ShoppingListProps {
  items: Item[]
}

const ShoppingList: Component<ShoppingListProps> = (props) => (
  <div class="relative">
    <TransitionGroup name="shoppinglist-item">
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
  </div>
)

export default ShoppingList
