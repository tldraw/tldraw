import { AgentRequest, BasePromptPart, SharedTodoItem } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { $sharedTodoList } from '../SharedTodoList'
import { PromptPartUtil } from './PromptPartUtil'

export interface SharedTodoListPart extends BasePromptPart<'sharedTodoList'> {
	items: (SharedTodoItem & { fairyName: string })[]
}

export class SharedTodoListPartUtil extends PromptPartUtil<SharedTodoListPart> {
	static override type = 'sharedTodoList' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): SharedTodoListPart {
		const project = this.agent.getCurrentProject()
		const fairyPageId = this.agent.$fairyEntity.get()?.currentPageId

		// Filter todos: by project (if in one), and by current page (or no pageId for backwards compatibility)
		let todoItems = $sharedTodoList.get()

		if (project) {
			todoItems = todoItems.filter((item) => item.projectId === project.id)
		}

		if (fairyPageId) {
			todoItems = todoItems.filter((item) => !item.pageId || item.pageId === fairyPageId)
		}

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

		const namedItems = offsetTodoItems.map((todoItem) => {
			const assignedFairy = $fairyAgentsAtom
				.get(this.editor)
				.find((agent) => agent.id === todoItem.assignedById)

			let fairyName = assignedFairy?.$fairyConfig.get().name ?? 'Unknown fairy'
			if (todoItem.assignedById === this.agent.id) {
				fairyName += ' (you)'
			}
			return {
				...todoItem,
				fairyName,
			}
		})

		return {
			type: 'sharedTodoList',
			items: namedItems,
		}
	}
}
