import { ArrowShapeUtil, TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { ArrowShapeTool } from './ArrowShapeTool/ArrowShapeTool'
import { arrowShapeMigrations } from './arrow-migrations'
import { arrowShapeValidator } from './arrow-validator'

/** @public */
export const ArrowShape: TLShapeInfo & { tool: TLStateNodeConstructor } = {
	util: ArrowShapeUtil,
	tool: ArrowShapeTool,
	migrations: arrowShapeMigrations,
	validator: arrowShapeValidator,
}
