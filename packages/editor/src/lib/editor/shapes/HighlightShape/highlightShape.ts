import { createShape } from '../../../config/createShape'
import { HighlightShapeTool } from './HighlightShapeTool/HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil/HighlightShapeUtil'
import { highlightShapeMigrations } from './highlightShapeMigrations'
import { highlightShapeValidator } from './highlightShapeValidator'

/** @public */
export const highlightShape = createShape('highlight', {
	util: HighlightShapeUtil,
	tool: HighlightShapeTool,
	migrations: highlightShapeMigrations,
	validator: highlightShapeValidator,
})
