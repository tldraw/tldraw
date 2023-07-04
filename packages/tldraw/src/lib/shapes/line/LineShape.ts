import { defineShape, lineShapeMigrations, lineShapeProps } from '@tldraw/editor'
import { LineShapeTool } from './LineShapeTool'
import { LineShapeUtil } from './LineShapeUtil'

/** @public */
export const LineShape = defineShape('line', {
	util: LineShapeUtil,
	props: lineShapeProps,
	migrations: lineShapeMigrations,
	tool: LineShapeTool,
})
