import { createEditorShape } from '../../../config/createEditorShape'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil/DrawShapeUtil'
import { drawShapeMigrations } from './drawShapeMigrations'
import { drawShapeValidator } from './drawShapeValidator'

/** @public */
export const drawShape = createEditorShape({
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
})
