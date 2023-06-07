import { defineShape } from '../../../config/defineShape'
import { LineShapeTool } from './LineShapeTool/LineShapeTool'
import { LineShapeUtil } from './LineShapeUtil/LineShapeUtil'
import { lineShapeMigrations } from './lineShapeMigrations'
import { TLLineShape } from './lineShapeTypes'
import { lineShapeValidator } from './lineShapeValidator'

/** @public */
export const lineShape = defineShape<TLLineShape>({
	type: 'line',
	util: LineShapeUtil,
	tool: LineShapeTool,
	migrations: lineShapeMigrations,
	validator: lineShapeValidator,
})
