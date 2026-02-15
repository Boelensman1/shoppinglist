'use client'

import { memo } from 'react'
import { AnimatePresence } from 'framer-motion'
import ShoppingListItem from './ShoppingListItem'
import type { ItemWithDisplayedInfo } from '@/utils/itemsToList'

interface ShoppingListProps {
  items: ItemWithDisplayedInfo[]
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items }) => (
  <div className="relative">
    <AnimatePresence mode="popLayout">
      {items.map((item) => (
        <ShoppingListItem
          key={item.id}
          isOnly={items.length === 1}
          isLast={!item.displayedNextItemId}
          {...item}
        />
      ))}
    </AnimatePresence>
  </div>
)

export default memo(ShoppingList)
