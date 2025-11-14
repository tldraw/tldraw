import { AgentRequest, TodoListPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class TodoListPartUtil extends PromptPartUtil<TodoListPart> {
	static override type = 'todoList' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): TodoListPart {
		return {
			type: 'todoList',
			items: this.agent.$todoList.get(),
		}
	}
}
