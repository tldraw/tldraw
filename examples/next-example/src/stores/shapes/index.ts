import type { NuPolygonShape } from 'stores'
import type { NuBoxShape } from './NuBoxShape'
import type { NuDrawShape } from './NuDrawShape'
import type { NuEllipseShape } from './NuEllipseShape'

export type Shape = NuBoxShape | NuEllipseShape | NuPolygonShape | NuDrawShape

export * from './NuBoxShape'
export * from './NuDrawShape'
export * from './NuEllipseShape'
export * from './NuPolygonShape'
