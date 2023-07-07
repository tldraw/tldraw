import { arrowShapeMigrations, arrowShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { ArrowShapeUtil } from './ArrowShapeUtil'

/** @public */
export const ArrowShape = defineShape('arrow', {
	util: ArrowShapeUtil,
	props: arrowShapeProps,
	migrations: arrowShapeMigrations,
})
