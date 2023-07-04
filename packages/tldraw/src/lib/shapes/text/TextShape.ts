import { defineShape, textShapeMigrations, textShapeProps } from '@tldraw/editor'
import { TextShapeTool } from './TextShapeTool'
import { TextShapeUtil } from './TextShapeUtil'

/** @public */
export const TextShape = defineShape('text', {
	util: TextShapeUtil,
	props: textShapeProps,
	migrations: textShapeMigrations,
	tool: TextShapeTool,
})
