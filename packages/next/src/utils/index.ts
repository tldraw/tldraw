import { nanoid } from 'nanoid'
export * from './BoundsUtils'
export * from './PointUtils'
export * from './KeyUtils'

export function uniqueId() {
  return nanoid()
}
