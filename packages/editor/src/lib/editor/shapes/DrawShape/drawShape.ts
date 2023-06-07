import { defineShape } from '../../../config/defineShape'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil/DrawShapeUtil'
import { drawShapeMigrations } from './drawShapeMigrations'
import { TLDrawShape } from './drawShapeTypes'
import { drawShapeValidator } from './drawShapeValidator'

/** @public */
export const drawShape = defineShape<TLDrawShape>({
	type: 'draw',
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
})
