import { frameShapeMigrations, frameShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { FrameShapeUtil } from './FrameShapeUtil'

/** @public */
export const FrameShape = defineShape('frame', {
	util: FrameShapeUtil,
	props: frameShapeProps,
	migrations: frameShapeMigrations,
})
