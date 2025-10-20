import { VecModel } from '@tldraw/tlschema'
import { FairyPose } from './FairyPose'

/**
 * An object representing the fairy's game entity.
 * This should not contain anything to do with the agent.
 */
export interface FairyEntity {
	position: VecModel
	flipX: boolean
	isSelected: boolean
	pose: FairyPose
}
