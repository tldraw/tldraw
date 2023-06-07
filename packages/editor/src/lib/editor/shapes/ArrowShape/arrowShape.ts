import { createEditorShape } from '../../../config/createEditorShape'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { arrowShapeValidator } from './arrowShapeValidator'

/** @public */
export const arrowShape = createEditorShape({
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
})
