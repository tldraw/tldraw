import { textShapeMigrations, textShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { TextShapeUtil } from './TextShapeUtil'

/** @public */
export const TextShape = defineShape('text', {
	util: TextShapeUtil,
	props: textShapeProps,
	migrations: textShapeMigrations,
})
