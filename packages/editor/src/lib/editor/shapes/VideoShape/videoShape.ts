import { createShape } from '../../../config/createShape'
import { VideoShapeUtil } from './VideoShapeUtil/VideoShapeUtil'
import { videoShapeMigrations } from './videoShapeMigrations'
import { TLVideoShape } from './videoShapeTypes'
import { videoShapeValidator } from './videoShapeValidator'

/** @public */
export const videoShape = createShape<TLVideoShape>('video', {
	util: VideoShapeUtil,
	migrations: videoShapeMigrations,
	validator: videoShapeValidator,
})
