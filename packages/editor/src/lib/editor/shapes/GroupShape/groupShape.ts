import { TLShapeInfo } from '../../../config/createTLStore'
import { TLStateNodeConstructor } from '../../tools/StateNode'
import { GroupShapeUtil } from './GroupShapeUtil/GroupShapeUtil'
import { groupShapeMigrations } from './groupShapeMigrations'
import { groupShapeValidator } from './groupShapeValidator'

/** @public */
export const groupShape: TLShapeInfo & { tool?: TLStateNodeConstructor } = {
	util: GroupShapeUtil,
	migrations: groupShapeMigrations,
	validator: groupShapeValidator,
}
