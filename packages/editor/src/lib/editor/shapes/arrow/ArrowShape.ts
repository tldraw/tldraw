import { arrowShapeMigrations, arrowShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { ArrowShapeTool } from './ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil'

/** @public */
export const ArrowShape = defineShape('arrow', {
	util: ArrowShapeUtil,
	props: arrowShapeProps,
	migrations: arrowShapeMigrations,
	tool: ArrowShapeTool,
})
