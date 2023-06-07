import { createShape } from '../../../config/createShape'
import { EmbedShapeUtil } from './EmbedShapeUtil/EmbedShapeUtil'
import { embedShapeMigrations } from './embedShapeMigrations'
import { TLEmbedShape } from './embedShapeTypes'
import { embedShapeValidator } from './embedShapeValidator'

/** @public */
export const embedShape = createShape<TLEmbedShape>('embed', {
	util: EmbedShapeUtil,
	migrations: embedShapeMigrations,
	validator: embedShapeValidator,
})
