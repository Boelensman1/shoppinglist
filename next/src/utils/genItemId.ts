import { v7 as genUuidv7Id } from 'uuid'
import type { ItemId } from '../types/store/Item'

const genItemId = () => genUuidv7Id() as ItemId

export default genItemId
