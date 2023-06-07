import { createShape } from '../../../config/createShape'
import { TextShapeTool } from './TextShapeTool/TextShapeTool'
import { TextShapeUtil } from './TextShapeUtil/TextShapeUtil'
import { textShapeMigrations } from './textShapeMigrations'
import { TLTextShape } from './textShapeTypes'
import { textShapeValidator } from './textShapeValidator'

/** @public */
export const textShape = createShape<TLTextShape>({
	util: TextShapeUtil,
	tool: TextShapeTool,
	migrations: textShapeMigrations,
	validator: textShapeValidator,
})
