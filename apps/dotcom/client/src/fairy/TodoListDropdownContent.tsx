import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useContainer } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { TodoListMenuContent } from './TodoListMenuContent'

export function TodoListDropdownContent({
	agents,
	alignOffset,
	sideOffset,
	side = 'top',
}: {
	agents: FairyAgent[]
	alignOffset: number
	sideOffset: number
	side?: 'top' | 'bottom' | 'left' | 'right'
}) {
	const container = useContainer()

	return (
		<_DropdownMenu.Portal container={container}>
			<_DropdownMenu.Content
				side={side}
				align="start"
				className="tlui-menu fairy-sidebar-dropdown"
				collisionPadding={4}
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				onClick={(e) => e.stopPropagation()}
				style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
			>
				<TodoListMenuContent agents={agents} menuType="menu" />
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}
