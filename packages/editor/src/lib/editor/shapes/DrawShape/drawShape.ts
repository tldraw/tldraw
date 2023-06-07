import { TLShapeInfo } from '../../../config/createTLStore'
import { TLStateNodeConstructor } from '../../tools/StateNode'
import { DrawShapeTool } from './DrawShapeTool/DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil/DrawShapeUtil'
import { drawShapeMigrations } from './drawShapeMigrations'
import { drawShapeValidator } from './drawShapeValidator'

export const drawShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: DrawShapeUtil,
	tool: DrawShapeTool,
	migrations: drawShapeMigrations,
	validator: drawShapeValidator,
}
