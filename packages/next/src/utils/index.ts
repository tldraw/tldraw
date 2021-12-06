import { nanoid } from 'nanoid'
export * from 'is-plain-object'
export * from './BoundsUtils'
export * from './PointUtils'
export * from './KeyUtils'
export * from './GeomUtils'
export * from './PolygonUtils'

export function uniqueId() {
  return nanoid()
}
