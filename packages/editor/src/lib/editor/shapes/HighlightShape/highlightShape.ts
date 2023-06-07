import { createEditorShape } from '../../../config/createEditorShape'
import { HighlightShapeTool } from './HighlightShapeTool/HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil/HighlightShapeUtil'
import { highlightShapeMigrations } from './highlightShapeMigrations'
import { highlightShapeValidator } from './highlightShapeValidator'

/** @public */
export const highlightShape = createEditorShape({
	util: HighlightShapeUtil,
	tool: HighlightShapeTool,
	migrations: highlightShapeMigrations,
	validator: highlightShapeValidator,
})
