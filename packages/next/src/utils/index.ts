import { nanoid } from 'nanoid'
export * from 'is-plain-object'
export * from './BoundsUtils'
export * from './PointUtils'
export * from './KeyUtils'
export * from './GeomUtils'
export * from './PolygonUtils'
export * from './SvgPathUtils'

export function uniqueId() {
  return nanoid()
}

export function assignOwnProps(obj: { [key: string]: any }, props: { [key: string]: any }) {
  Object.assign(obj, Object.fromEntries(Object.entries(props).filter(([key]) => key in obj)))
}
