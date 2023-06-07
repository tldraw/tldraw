import { defineShape } from '../../../config/defineShape'
import { EmbedShapeUtil } from './EmbedShapeUtil/EmbedShapeUtil'
import { embedShapeMigrations } from './embedShapeMigrations'
import { TLEmbedShape } from './embedShapeTypes'
import { embedShapeValidator } from './embedShapeValidator'

/** @public */
export const embedShape = defineShape<TLEmbedShape>({
	type: 'embed',
	util: EmbedShapeUtil,
	migrations: embedShapeMigrations,
	validator: embedShapeValidator,
})
