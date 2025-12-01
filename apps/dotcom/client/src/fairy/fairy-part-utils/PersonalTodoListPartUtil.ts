import { AgentRequest, PersonalTodoListPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class PersonalTodoListPartUtil extends PromptPartUtil<PersonalTodoListPart> {
	static override type = 'personalTodoList' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): PersonalTodoListPart {
		return {
			type: 'personalTodoList',
			items: this.agent.todos.getTodos(),
		}
	}
}
