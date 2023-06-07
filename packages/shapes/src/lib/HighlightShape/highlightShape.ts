import { HighlightShapeUtil, TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { HighlightShapeTool } from './HighlightShapeUtil/HighlightShapeTool'
import { highlightShapeMigrations } from './highlightShapeMigrations'
import { highlightShapeValidator } from './highlightShapeValidator'

/** @public */
export const highlightShape: TLShapeInfo & { tool: TLStateNodeConstructor } = {
	util: HighlightShapeUtil,
	tool: HighlightShapeTool,
	migrations: highlightShapeMigrations,
	validator: highlightShapeValidator,
}
