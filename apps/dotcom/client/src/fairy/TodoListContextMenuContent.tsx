import { ContextMenu as _ContextMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { TodoListMenuContent } from './TodoListMenuContent'

export function TodoListContextMenuContent({
	onRequestHelpFromEveryone,
}: {
	onRequestHelpFromEveryone(): void
}) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 100000000 }}
			>
				<TodoListMenuContent
					onRequestHelpFromEveryone={onRequestHelpFromEveryone}
					menuType="context-menu"
				/>
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
