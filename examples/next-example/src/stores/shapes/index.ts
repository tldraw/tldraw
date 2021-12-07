import type { NuPolygonShape } from 'stores'
import type { NuBoxShape } from './NuBoxShape'
import type { NuPenShape } from './NuPenShape'
import type { NuEllipseShape } from './NuEllipseShape'
import type { NuHighlighterShape } from './NuHighlighterShape'

export type Shape = NuBoxShape | NuEllipseShape | NuPolygonShape | NuPenShape | NuHighlighterShape

export * from './NuBoxShape'
export * from './NuPenShape'
export * from './NuEllipseShape'
export * from './NuPolygonShape'
export * from './NuHighlighterShape'
