import { createShape } from '../../../config/createShape'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { arrowShapeValidator } from './arrowShapeValidator'

/** @public */
export const arrowShape = createShape({
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
})
