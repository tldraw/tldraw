import { defineShape } from '@tldraw/editor'
import { textShapeMigrations, textShapeProps } from '@tldraw/tlschema'
import { TextShapeTool } from './TextShapeTool'
import { TextShapeUtil } from './TextShapeUtil'

/** @public */
export const TextShape = defineShape('text', {
	util: TextShapeUtil,
	props: textShapeProps,
	migrations: textShapeMigrations,
	tool: TextShapeTool,
})
