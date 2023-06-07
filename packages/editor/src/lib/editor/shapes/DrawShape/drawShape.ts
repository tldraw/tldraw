import { createShape } from '../../../config/createShape'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil/DrawShapeUtil'
import { drawShapeMigrations } from './drawShapeMigrations'
import { TLDrawShape } from './drawShapeTypes'
import { drawShapeValidator } from './drawShapeValidator'

/** @public */
export const drawShape = createShape<TLDrawShape>('draw', {
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
})
