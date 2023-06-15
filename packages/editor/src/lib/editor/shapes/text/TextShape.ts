import { textShapeMigrations, textShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { TextShapeTool } from './TextShapeTool'
import { TextShapeUtil } from './TextShapeUtil'

/** @public */
export const TextShape = defineShape('text', {
	util: TextShapeUtil,
	props: textShapeProps,
	migrations: textShapeMigrations,
	tool: TextShapeTool,
})
