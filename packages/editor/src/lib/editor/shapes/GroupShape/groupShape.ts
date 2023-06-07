import { defineShape } from '../../../config/defineShape'
import { GroupShapeUtil } from './GroupShapeUtil/GroupShapeUtil'
import { groupShapeMigrations } from './groupShapeMigrations'
import { TLGroupShape } from './groupShapeTypes'
import { groupShapeValidator } from './groupShapeValidator'

/** @public */
export const groupShape = defineShape<TLGroupShape>({
	type: 'group',
	util: GroupShapeUtil,
	migrations: groupShapeMigrations,
	validator: groupShapeValidator,
})
