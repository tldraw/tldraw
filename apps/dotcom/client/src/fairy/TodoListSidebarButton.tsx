import { ContextMenu as _ContextMenu } from 'radix-ui'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { TodoListContextMenuContent } from './TodoListContextMenuContent'

export function TodoListSidebarButton({
	onClick,
	hasUnreadTodos,
	agents,
	onDeleteFairyConfig,
}: {
	onClick(): void
	hasUnreadTodos: boolean
	agents: FairyAgent[]
	onDeleteFairyConfig(id: string): void
}) {
	return (
		<div style={{ position: 'relative' }}>
			<_ContextMenu.Root dir="ltr">
				<_ContextMenu.Trigger asChild>
					<TldrawUiButton type="icon" className="fairy-toolbar-sidebar-button" onClick={onClick}>
						<TldrawUiIcon icon="clipboard-copied" label="Todo list" />
					</TldrawUiButton>
				</_ContextMenu.Trigger>
				<TodoListContextMenuContent agents={agents} onDeleteFairyConfig={onDeleteFairyConfig} />
			</_ContextMenu.Root>
			{hasUnreadTodos && <div className="fairy-todo-unread-indicator" />}
		</div>
	)
}
