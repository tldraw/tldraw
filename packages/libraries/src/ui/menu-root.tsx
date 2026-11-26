import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	type Ref,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useMenuIsOpen,
} from 'tldraw'
import { ContextMenuAnchor, forgetContextMenu } from './context-menu'

/**
 * A library or item menu, opened from a ⋯ button or, with `trigger` `'none'`, only by its id.
 *
 * The Radix menu is mounted only while it's open. A mounted Radix menu sets state after every
 * render, so one left mounted in a section re-rendered by each change of a burst passes React's
 * limit on nested updates.
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
	const [isMounted, setMounted] = useState(isOpen)
	if (isOpen && !isMounted) setMounted(true)
	const button = useRef<HTMLButtonElement>(null)
	const refocus = useRef(false)

	useEffect(() => () => forgetContextMenu(id), [id])

	// Unmounted a frame after closing, once Radix has handed focus back to its trigger.
	useEffect(() => {
		if (isOpen || !isMounted) return
		const frame = requestAnimationFrame(() => {
			refocus.current = !!button.current && button.current === document.activeElement
			setMounted(false)
		})
		return () => cancelAnimationFrame(frame)
	}, [isOpen, isMounted])

	useLayoutEffect(() => {
		if (isMounted || !refocus.current) return
		refocus.current = false
		if (button.current) button.current.focus()
	}, [isMounted])

	if (!isMounted) {
		if (trigger === 'none') return null
		return (
			<MenuButton
				ref={button}
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
					<MenuButton ref={button} label={label} />
				</TldrawUiDropdownMenuTrigger>
			)}
			{children}
		</TldrawUiDropdownMenuRoot>
	)
}

function MenuButton({
	ref,
	label,
	...handlers
}: {
	ref: Ref<HTMLButtonElement>
	label: string
	onPointerDown?(e: PointerEvent<HTMLButtonElement>): void
	onKeyDown?(e: KeyboardEvent<HTMLButtonElement>): void
}) {
	return (
		<TldrawUiButton
			ref={ref}
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
