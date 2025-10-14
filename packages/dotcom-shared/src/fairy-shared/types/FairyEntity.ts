import { VecModel } from '@tldraw/tlschema'
import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'
import { PromptPartUtilConstructor } from '../parts/PromptPartUtil'
import { FairyPose } from './FairyPose'

export interface FairyEntity {
	position: VecModel
	flipX: boolean
	isSelected: boolean
	pose: FairyPose
	actions: AgentActionUtilConstructor['type'][]
	parts: PromptPartUtilConstructor['type'][]
}
