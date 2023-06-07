import { defineShape } from '../../../config/defineShape'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { TLArrowShape } from './arrowShapeTypes'
import { arrowShapeValidator } from './arrowShapeValidator'

/** @public */
export const arrowShape = defineShape<TLArrowShape>({
	type: 'arrow',
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
})
