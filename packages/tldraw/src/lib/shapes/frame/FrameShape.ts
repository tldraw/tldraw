import { defineShape, frameShapeMigrations, frameShapeProps } from '@tldraw/editor'
import { FrameShapeTool } from './FrameShapeTool'
import { FrameShapeUtil } from './FrameShapeUtil'

/** @public */
export const FrameShape = defineShape('frame', {
	util: FrameShapeUtil,
	props: frameShapeProps,
	migrations: frameShapeMigrations,
	tool: FrameShapeTool,
})
