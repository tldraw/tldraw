import { highlightShapeMigrations, highlightShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { HighlightShapeTool } from './HighlightShapeTool'
import { HighlightShapeUtil } from './HighlightShapeUtil'

/** @public */
export const HighlightShape = defineShape('highlight', {
	util: HighlightShapeUtil,
	props: highlightShapeProps,
	migrations: highlightShapeMigrations,
	tool: HighlightShapeTool,
})
