import { createShape } from '../../../config/createShape'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil/DrawShapeUtil'
import { drawShapeMigrations } from './drawShapeMigrations'
import { drawShapeValidator } from './drawShapeValidator'

/** @public */
export const drawShape = createShape({
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
})
