import type { NuPolygonShape } from 'stores'
import type { NuBoxShape } from './NuBoxShape'
import type { NuEllipseShape } from './NuEllipseShape'

export type Shape = NuBoxShape | NuEllipseShape | NuPolygonShape

export * from './NuBoxShape'
export * from './NuEllipseShape'
export * from './NuPolygonShape'
