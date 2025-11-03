import { AgentRequest, BasePromptPart, SharedTodoItem } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $sharedTodoList } from '../SharedTodoList'
import { PromptPartUtil } from './PromptPartUtil'

export interface SharedTodoListPart extends BasePromptPart<'sharedTodoList'> {
	items: SharedTodoItem[]
}

export class SharedTodoListPartUtil extends PromptPartUtil<SharedTodoListPart> {
	static override type = 'sharedTodoList' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): SharedTodoListPart {
		const projectId = this.agent.$currentProjectId.get()
		const todoItems = projectId
			? $sharedTodoList.get().filter((item) => item.projectId === projectId)
			: $sharedTodoList.get()

		const offsetTodoItems = todoItems.map((todoItem) => {
			// offset the coords, and only send x and y if they are defined
			const coords =
				todoItem.x !== undefined && todoItem.y !== undefined
					? helpers.applyOffsetToVec({ x: todoItem.x, y: todoItem.y })
					: undefined
			const { x: _x, y: _y, ...rest } = todoItem
			return {
				...rest,
				...(coords ? { x: coords.x, y: coords.y } : {}),
			}
		})

		return {
			type: 'sharedTodoList',
			items: offsetTodoItems,
		}
	}
}
