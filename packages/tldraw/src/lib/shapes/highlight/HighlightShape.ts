import { defineShape, highlightShapeMigrations, highlightShapeProps } from '@tldraw/editor'
import { HighlightShapeTool } from './HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil'

/** @public */
export const HighlightShape = defineShape('highlight', {
	util: HighlightShapeUtil,
	props: highlightShapeProps,
	migrations: highlightShapeMigrations,
	tool: HighlightShapeTool,
})
