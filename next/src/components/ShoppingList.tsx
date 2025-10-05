'use client'

import { AnimatePresence } from 'framer-motion'
import ShoppingListItem from './ShoppingListItem'
import type { Item } from '../types/store/Item'

interface ShoppingListProps {
  items: Item[]
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items }) => (
  <div className="relative">
    <AnimatePresence mode="popLayout">
      {items.map((item, i) => (
        <ShoppingListItem
          key={i} // use index as key so that focus works correctly
          isOnly={items.length === 1}
          isLast={i === items.length - 1}
          {...item}
        />
      ))}
    </AnimatePresence>
  </div>
)

export default ShoppingList
