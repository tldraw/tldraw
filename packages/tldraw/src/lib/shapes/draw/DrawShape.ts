import { defineShape, drawShapeMigrations, drawShapeProps } from '@tldraw/editor'
import { DrawShapeTool } from './DrawShapeTool'
import { DrawShapeUtil } from './DrawShapeUtil'

/** @public */
export const DrawShape = defineShape('draw', {
	util: DrawShapeUtil,
	props: drawShapeProps,
	migrations: drawShapeMigrations,
	tool: DrawShapeTool,
})
