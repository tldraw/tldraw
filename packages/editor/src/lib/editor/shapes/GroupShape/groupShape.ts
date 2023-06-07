import { createShape } from '../../../config/createShape'
import { GroupShapeUtil } from './GroupShapeUtil/GroupShapeUtil'
import { groupShapeMigrations } from './groupShapeMigrations'
import { TLGroupShape } from './groupShapeTypes'
import { groupShapeValidator } from './groupShapeValidator'

/** @public */
export const groupShape = createShape<TLGroupShape>('group', {
	util: GroupShapeUtil,
	migrations: groupShapeMigrations,
	validator: groupShapeValidator,
})
