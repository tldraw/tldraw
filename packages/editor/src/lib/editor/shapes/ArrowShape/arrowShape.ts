import { TLShapeInfo } from '../../../config/createTLStore'
import { TLStateNodeConstructor } from '../../tools/StateNode'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { arrowShapeValidator } from './arrowShapeValidator'

export const arrowShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
}
