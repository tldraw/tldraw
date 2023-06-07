import { defineShape } from '../../../config/defineShape'
import { FrameShapeTool } from './FrameShapeTool/FrameShapeTool'
import { FrameShapeUtil } from './FrameShapeUtil/FrameShapeUtil'
import { frameShapeMigrations } from './frameShapeMigrations'
import { TLFrameShape } from './frameShapeTypes'
import { frameShapeValidator } from './frameShapeValidator'

/** @public */
export const frameShape = defineShape<TLFrameShape>({
	type: 'frame',
	util: FrameShapeUtil,
	tool: FrameShapeTool,
	migrations: frameShapeMigrations,
	validator: frameShapeValidator,
})
