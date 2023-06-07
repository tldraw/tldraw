import { createShape } from '../../../config/createShape'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { TLArrowShape } from './arrowShapeTypes'
import { arrowShapeValidator } from './arrowShapeValidator'

/** @public */
export const arrowShape = createShape<TLArrowShape>('arrow', {
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
})
