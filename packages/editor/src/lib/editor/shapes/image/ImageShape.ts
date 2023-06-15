import { imageShapeMigrations, imageShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { ImageShapeUtil } from './ImageShapeUtil'

/** @public */
export const ImageShape = defineShape('image', {
	util: ImageShapeUtil,
	props: imageShapeProps,
	migrations: imageShapeMigrations,
})
