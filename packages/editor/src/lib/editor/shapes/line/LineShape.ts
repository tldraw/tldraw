import { lineShapeMigrations, lineShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { LineShapeTool } from './LineShapeTool'
import { LineShapeUtil } from './LineShapeUtil'

/** @public */
export const LineShape = defineShape('line', {
	util: LineShapeUtil,
	props: lineShapeProps,
	migrations: lineShapeMigrations,
	tool: LineShapeTool,
})
