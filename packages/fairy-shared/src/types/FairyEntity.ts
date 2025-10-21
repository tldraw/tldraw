import { VecModel } from '@tldraw/tlschema'
import { FairyPose } from './FairyPose'

/**
 * An object representing the fairy's game entity.
 * This should not contain anything to do with the agent.
 */
export interface FairyEntity {
	/** The current position of the fairy. */
	position: VecModel
	/** Whether the fairy is flipped horizontally. */
	flipX: boolean
	/** Whether the fairy is selected. */
	isSelected: boolean
	/** The fairy's current pose, eg. 'thinking'. */
	pose: FairyPose
	personality: string // WIP
}
