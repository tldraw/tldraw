import { defineShape } from '../../../config/defineShape'
import { HighlightShapeTool } from './HighlightShapeTool/HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil/HighlightShapeUtil'
import { highlightShapeMigrations } from './highlightShapeMigrations'
import { highlightShapeValidator } from './highlightShapeValidator'

/** @public */
export const highlightShape = defineShape({
	type: 'highlight',
	util: HighlightShapeUtil,
	tool: HighlightShapeTool,
	migrations: highlightShapeMigrations,
	validator: highlightShapeValidator,
})
