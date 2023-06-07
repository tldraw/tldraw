import { createShape } from '../../../config/createShape'
import { LineShapeTool } from './LineShapeTool/LineShapeTool'
import { LineShapeUtil } from './LineShapeUtil/LineShapeUtil'
import { lineShapeMigrations } from './lineShapeMigrations'
import { TLLineShape } from './lineShapeTypes'
import { lineShapeValidator } from './lineShapeValidator'

/** @public */
export const lineShape = createShape<TLLineShape>({
	util: LineShapeUtil,
	tool: LineShapeTool,
	migrations: lineShapeMigrations,
	validator: lineShapeValidator,
})
