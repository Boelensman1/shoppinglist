import type { ItemId } from '@shoppinglist/shared'
import { v7 as genUuidv7Id } from 'uuid'

const genItemId = () => genUuidv7Id() as ItemId

export default genItemId
