import { arrowShapeMigrations, arrowShapeProps, defineShape } from '@tldraw/editor'
import { ArrowShapeTool } from './ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil'

/** @public */
export const ArrowShape = defineShape('arrow', {
	util: ArrowShapeUtil,
	props: arrowShapeProps,
	migrations: arrowShapeMigrations,
	tool: ArrowShapeTool,
})
