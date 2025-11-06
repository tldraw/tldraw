import { ContextMenu as _ContextMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { TodoListMenuContent } from './TodoListMenuContent'

export function TodoListContextMenuContent({ agents }: { agents: FairyAgent[] }) {
	const container = useContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
			>
				<TodoListMenuContent agents={agents} menuType="context-menu" />
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
