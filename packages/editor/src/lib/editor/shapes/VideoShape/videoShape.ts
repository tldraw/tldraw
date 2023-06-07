import { defineShape } from '../../../config/defineShape'
import { VideoShapeUtil } from './VideoShapeUtil/VideoShapeUtil'
import { videoShapeMigrations } from './videoShapeMigrations'
import { TLVideoShape } from './videoShapeTypes'
import { videoShapeValidator } from './videoShapeValidator'

/** @public */
export const videoShape = defineShape<TLVideoShape>({
	type: 'video',
	util: VideoShapeUtil,
	migrations: videoShapeMigrations,
	validator: videoShapeValidator,
})
