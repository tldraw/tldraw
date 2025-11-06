import { AgentRequest, BasePromptPart, FairyTask } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export interface SharedTodoListPart extends BasePromptPart<'sharedTodoList'> {
	items: (FairyTask & { fairyName: string })[]
}

export class SharedTodoListPartUtil extends PromptPartUtil<SharedTodoListPart> {
	static override type = 'sharedTodoList' as const

	override getPart(_request: AgentRequest): SharedTodoListPart {
		// Todo
		return {
			type: 'sharedTodoList',
			items: [],
		}
	}
}
