import { Editor } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface UserSelectedModelNamePart extends BasePromptPart<'modelName'> {
	name: AgentModelName
}

export class UserSelectedModelNamePartUtil extends PromptPartUtil<UserSelectedModelNamePart> {
	static override type = 'modelName' as const

	override getPart(_editor: Editor, request: AgentRequest): UserSelectedModelNamePart {
		return {
			type: 'modelName',
			name: request.modelName,
		}
	}

	override getModelName(part: UserSelectedModelNamePart) {
		return part.name
	}
}
