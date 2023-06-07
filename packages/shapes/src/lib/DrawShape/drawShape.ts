import { DrawShapeUtil, TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { drawShapeMigrations } from './drawShapeMigrations'
import { drawShapeValidator } from './drawShapeValidator'

/** @public */
export const drawShape: TLShapeInfo & { tool: TLStateNodeConstructor } = {
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
}
