import { type KeyboardEvent, type PointerEvent, type ReactNode, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useMenuIsOpen,
} from 'tldraw'
import { ContextMenuAnchor } from './context-menu'

/**
 * A library or item menu, opened from a ⋯ button or, with `trigger` `'none'`, only by its id.
 *
 * Radix mounts the menu the first time it opens and keeps it after. A mounted Radix menu sets state
 * after every render, and a burst of new libraries mounts a menu per section, enough to pass
 * React's limit on nested updates.
 */
export function MenuRoot({
	id,
	trigger,
	label,
	children,
}: {
	id: string
	trigger: 'button' | 'none'
	label: string
	children: ReactNode
}) {
	const [isOpen, setOpen] = useMenuIsOpen(id)
	const [hasOpened, setHasOpened] = useState(isOpen)
	if (isOpen && !hasOpened) setHasOpened(true)

	if (!hasOpened) {
		if (trigger === 'none') return null
		return (
			<MenuButton
				label={label}
				onPointerDown={(e) => {
					if (e.button !== 0 || e.ctrlKey) return
					e.preventDefault()
					setOpen(true)
				}}
				onKeyDown={(e) => {
					if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowDown') return
					e.preventDefault()
					setOpen(true)
				}}
			/>
		)
	}

	return (
		<TldrawUiDropdownMenuRoot id={id}>
			{trigger === 'none' ? (
				<ContextMenuAnchor menuId={id} />
			) : (
				<TldrawUiDropdownMenuTrigger>
					<MenuButton label={label} />
				</TldrawUiDropdownMenuTrigger>
			)}
			{children}
		</TldrawUiDropdownMenuRoot>
	)
}

function MenuButton({
	label,
	...handlers
}: {
	label: string
	onPointerDown?(e: PointerEvent<HTMLButtonElement>): void
	onKeyDown?(e: KeyboardEvent<HTMLButtonElement>): void
}) {
	return (
		<TldrawUiButton
			type="icon"
			tooltip={label}
			title={label}
			aria-haspopup="menu"
			aria-expanded={false}
			{...handlers}
		>
			<TldrawUiButtonIcon icon="dots-vertical" small />
		</TldrawUiButton>
	)
}
