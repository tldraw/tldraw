import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useContainer,
} from 'tldraw'
import { clearSharedTodoList } from './SharedTodoList'

export function TodoListDropdownContent({
	onRequestHelpFromEveryone,
	alignOffset,
	sideOffset,
	side = 'top',
}: {
	onRequestHelpFromEveryone(): void
	alignOffset: number
	sideOffset: number
	side?: 'top' | 'bottom' | 'left' | 'right'
}) {
	const container = useContainer()

	const requestHelpFromEveryone = useCallback(() => {
		onRequestHelpFromEveryone()
	}, [onRequestHelpFromEveryone])

	const clearList = useCallback(() => {
		clearSharedTodoList()
	}, [])

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
				style={{ zIndex: 100000000 }}
			>
				<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
					<TldrawUiMenuGroup id="todo-menu">
						<TldrawUiMenuItem
							id="ask-for-help-from-everyone"
							onSelect={requestHelpFromEveryone}
							label="Request help from everyone"
						/>
					</TldrawUiMenuGroup>
					<TldrawUiMenuItem id="clear-todo-list" onSelect={clearList} label="Clear list" />
				</TldrawUiMenuContextProvider>
			</_DropdownMenu.Content>
		</_DropdownMenu.Portal>
	)
}
