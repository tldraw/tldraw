import { videoShapeMigrations, videoShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { VideoShapeUtil } from './VideoShapeUtil'

/** @public */
export const VideoShape = defineShape('video', {
	util: VideoShapeUtil,
	props: videoShapeProps,
	migrations: videoShapeMigrations,
})
