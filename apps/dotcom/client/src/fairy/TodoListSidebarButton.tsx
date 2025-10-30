import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { MouseEventHandler, useCallback, useState } from 'react'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import { TodoListDropdownContent } from './TodoListDropdownContent'

export function TodoListSidebarButton({
	onClick,
	hasUnreadTodos,
	onRequestHelpFromEveryone,
}: {
	onClick(): void
	hasUnreadTodos: boolean
	onRequestHelpFromEveryone(): void
}) {
	const [dropdownMenuOpen, setDropdownMenuOpen] = useState(false)

	const handleContextMenu: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
		e.preventDefault()
		e.stopPropagation()
		setDropdownMenuOpen(true)
	}, [])

	return (
		<div style={{ position: 'relative' }}>
			<TldrawUiButton
				type="icon"
				className="fairy-toolbar-sidebar-button"
				onClick={onClick}
				onContextMenu={handleContextMenu}
			>
				<TldrawUiIcon icon="clipboard-copied" label="Todo list" />
			</TldrawUiButton>
			{hasUnreadTodos && <div className="fairy-todo-unread-indicator" />}
			<_DropdownMenu.Root dir="ltr" open={dropdownMenuOpen} onOpenChange={setDropdownMenuOpen}>
				<_DropdownMenu.Trigger asChild>
					<div></div>
				</_DropdownMenu.Trigger>
				<TodoListDropdownContent
					onRequestHelpFromEveryone={onRequestHelpFromEveryone}
					alignOffset={20}
					sideOffset={30}
					side="top"
				/>
			</_DropdownMenu.Root>
		</div>
	)
}
