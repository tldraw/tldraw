import { defineShape } from '../../../config/defineShape'
import { ImageShapeUtil } from './ImageShapeUtil/ImageShapeUtil'
import { imageShapeMigrations } from './imageShapeMigrations'
import { imageShapeValidator } from './imageShapeValidator'

/** @public */
export const imageShape = defineShape({
	type: 'image',
	util: ImageShapeUtil,
	migrations: imageShapeMigrations,
	validator: imageShapeValidator,
})
