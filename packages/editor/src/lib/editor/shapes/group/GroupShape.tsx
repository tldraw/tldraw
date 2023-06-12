import { groupShapeMigrations, groupShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { GroupShapeUtil } from './GroupShapeUtil'

/** @public */
export const GroupShape = defineShape('group', {
	util: GroupShapeUtil,
	props: groupShapeProps,
	migrations: groupShapeMigrations,
})
