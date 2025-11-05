import { ContextMenu as _ContextMenu } from 'radix-ui'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { TodoListContextMenuContent } from './TodoListContextMenuContent'

export function TodoListSidebarButton({
	onClick,
	hasUnreadTodos,
	agents,
}: {
	onClick(): void
	hasUnreadTodos: boolean
	agents: FairyAgent[]
}) {
	const todoListLabel = useMsg(fairyMessages.todoList)

	return (
		<div style={{ position: 'relative' }}>
			<_ContextMenu.Root dir="ltr">
				<_ContextMenu.Trigger asChild>
					<TldrawUiButton type="icon" className="fairy-toolbar-sidebar-button" onClick={onClick}>
						<TldrawUiIcon icon="clipboard-copied" label={todoListLabel} />
					</TldrawUiButton>
				</_ContextMenu.Trigger>
				<TodoListContextMenuContent agents={agents} />
			</_ContextMenu.Root>
			{hasUnreadTodos && <div className="fairy-todo-unread-indicator" />}
		</div>
	)
}
