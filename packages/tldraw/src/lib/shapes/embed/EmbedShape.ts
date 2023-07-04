import { defineShape, embedShapeMigrations, embedShapeProps } from '@tldraw/editor'
import { EmbedShapeUtil } from './EmbedShapeUtil'

/** @public */
export const EmbedShape = defineShape('embed', {
	util: EmbedShapeUtil,
	props: embedShapeProps,
	migrations: embedShapeMigrations,
})
