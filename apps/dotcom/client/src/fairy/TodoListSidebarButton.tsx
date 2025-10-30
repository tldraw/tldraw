import { ContextMenu as _ContextMenu } from 'radix-ui'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import { TodoListContextMenuContent } from './TodoListContextMenuContent'

export function TodoListSidebarButton({
	onClick,
	hasUnreadTodos,
	onRequestHelpFromEveryone,
}: {
	onClick(): void
	hasUnreadTodos: boolean
	onRequestHelpFromEveryone(): void
}) {
	return (
		<div style={{ position: 'relative' }}>
			<_ContextMenu.Root dir="ltr">
				<_ContextMenu.Trigger asChild>
					<TldrawUiButton type="icon" className="fairy-toolbar-sidebar-button" onClick={onClick}>
						<TldrawUiIcon icon="clipboard-copied" label="Todo list" />
					</TldrawUiButton>
				</_ContextMenu.Trigger>
				<TodoListContextMenuContent onRequestHelpFromEveryone={onRequestHelpFromEveryone} />
			</_ContextMenu.Root>
			{hasUnreadTodos && <div className="fairy-todo-unread-indicator" />}
		</div>
	)
}
