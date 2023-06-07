import { defineShape } from '../../../config/defineShape'
import { TextShapeTool } from './TextShapeTool/TextShapeTool'
import { TextShapeUtil } from './TextShapeUtil/TextShapeUtil'
import { textShapeMigrations } from './textShapeMigrations'
import { TLTextShape } from './textShapeTypes'
import { textShapeValidator } from './textShapeValidator'

/** @public */
export const textShape = defineShape<TLTextShape>({
	type: 'text',
	util: TextShapeUtil,
	tool: TextShapeTool,
	migrations: textShapeMigrations,
	validator: textShapeValidator,
})
