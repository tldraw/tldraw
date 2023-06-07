import { createShape } from '../../../config/createShape'
import { ImageShapeUtil } from './ImageShapeUtil/ImageShapeUtil'
import { imageShapeMigrations } from './imageShapeMigrations'
import { imageShapeValidator } from './imageShapeValidator'

/** @public */
export const imageShape = createShape('image', {
	util: ImageShapeUtil,
	migrations: imageShapeMigrations,
	validator: imageShapeValidator,
})
