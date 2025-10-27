import { VecModel, vecModelValidator } from '@tldraw/tlschema'
import { T } from 'tldraw'
import { FAIRY_POSE, FairyPose } from './FairyPose'

/**
 * An object representing the fairy's game object, such as its position in the world.
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
	/** A one-off gesture that the fairy is doing. This overrides the current pose until the gesture is complete. */
	gesture: FairyPose | null
}

export const fairyEntityValidator: T.ObjectValidator<FairyEntity> = T.object({
	position: vecModelValidator,
	flipX: T.boolean,
	isSelected: T.boolean,
	pose: T.setEnum(new Set(FAIRY_POSE)),
	gesture: T.setEnum(new Set(FAIRY_POSE)).nullable(),
})
