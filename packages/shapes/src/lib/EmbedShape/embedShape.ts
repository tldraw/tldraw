import { EmbedShapeUtil, TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { embedShapeMigrations } from './embedShapeMigrations'
import { embedShapeValidator } from './embedShapeValidator'

/** @public */
export const embedShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: EmbedShapeUtil,
	migrations: embedShapeMigrations,
	validator: embedShapeValidator,
}
