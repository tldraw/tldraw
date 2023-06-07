import { TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { ArrowShapeUtil } from './ArrowShapeUtil/ArrowShapeUtil'
import { arrowShapeMigrations } from './arrowShapeMigrations'
import { arrowShapeValidator } from './arrowShapeValidator'

/** @public */
export const arrowShape: TLShapeInfo & { tool: TLStateNodeConstructor } = {
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
}
