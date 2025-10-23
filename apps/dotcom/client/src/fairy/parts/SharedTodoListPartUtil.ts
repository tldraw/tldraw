import { BasePromptPart, SharedTodoItem } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { PromptPartUtil } from './PromptPartUtil'

export interface SharedTodoListPart extends BasePromptPart<'sharedTodoList'> {
	items: SharedTodoItem[]
}

export class SharedTodoListPartUtil extends PromptPartUtil<SharedTodoListPart> {
	static override type = 'sharedTodoList' as const

	override getPart(): SharedTodoListPart {
		return {
			type: 'sharedTodoList',
			items: $sharedTodoList.get(),
		}
	}
}
