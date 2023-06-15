import { embedShapeMigrations, embedShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { EmbedShapeUtil } from './EmbedShapeUtil'

/** @public */
export const EmbedShape = defineShape('embed', {
	util: EmbedShapeUtil,
	props: embedShapeProps,
	migrations: embedShapeMigrations,
})
