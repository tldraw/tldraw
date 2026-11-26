import {
	type KeyboardEvent,
	type MouseEvent,
	type SyntheticEvent,
	useLayoutEffect,
	useRef,
} from 'react'
import { type Editor, TldrawUiDropdownMenuTrigger, type VecModel } from 'tldraw'

interface Anchor {
	/** Left out until the menu first opens and mounts its anchor; `opener` and `point` wait for it. */
	element?: HTMLElement
	opener?: HTMLElement
	point?: VecModel
}

const anchors = new Map<string, Anchor>()

/**
 * The trigger of a menu that has no button of its own: an invisible box over its positioned parent,
 * which the menu opens against. Open the menu with {@link openContextMenu}. When the menu closes and
 * hands focus back to its trigger, the focus goes on to the element that opened it.
 */
export function ContextMenuAnchor({ menuId }: { menuId: string }) {
	const ref = useRef<HTMLSpanElement>(null)
	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return
		const anchor = anchors.get(menuId) ?? {}
		anchor.element = element
		placeAnchor(element, anchor.point)
		anchors.set(menuId, anchor)
		return () => {
			const anchor = anchors.get(menuId)
			if (anchor && anchor.element === element) anchors.delete(menuId)
		}
	}, [menuId])
	return (
		<TldrawUiDropdownMenuTrigger>
			<span
				ref={ref}
				className="tlui-libraries-menu-anchor"
				tabIndex={-1}
				aria-hidden
				onFocus={() => {
					const anchor = anchors.get(menuId)
					if (anchor && anchor.opener && anchor.opener.isConnected) anchor.opener.focus()
				}}
			/>
		</TldrawUiDropdownMenuTrigger>
	)
}

/**
 * Opens a menu by id. One with a {@link ContextMenuAnchor} opens at `point`, in client coordinates,
 * or else against the anchor's whole parent, and hands focus back to `opener` when it closes.
 */
export function openContextMenu(
	editor: Editor,
	menuId: string,
	{ opener, point }: { opener?: HTMLElement; point?: VecModel } = {}
) {
	const anchor = anchors.get(menuId) ?? {}
	anchor.opener = opener
	anchor.point = point
	anchors.set(menuId, anchor)
	if (anchor.element) placeAnchor(anchor.element, point)
	editor.menus.addOpenMenu(menuId)
}

/** Forgets what {@link openContextMenu} kept for a menu, such as the element that opened it. */
export function forgetContextMenu(menuId: string) {
	anchors.delete(menuId)
}

function placeAnchor(element: HTMLElement, point: VecModel | undefined) {
	const { style } = element
	const parent = element.offsetParent
	if (point && parent) {
		const rect = parent.getBoundingClientRect()
		style.inset = 'auto'
		style.left = `${point.x - rect.left}px`
		style.top = `${point.y - rect.top}px`
		style.width = '0'
		style.height = '0'
	} else {
		style.removeProperty('inset')
		style.removeProperty('left')
		style.removeProperty('top')
		style.removeProperty('width')
		style.removeProperty('height')
	}
}

/** The control the event came from, to hand focus back to, or else the element handling it. */
function getOpener(e: SyntheticEvent<HTMLElement>) {
	const control = (e.target as Element).closest<HTMLElement>('button, input, [tabindex]')
	return control && e.currentTarget.contains(control) ? control : e.currentTarget
}

/**
 * Handlers that open a menu on right-click, at the pointer, and from the keyboard with the context
 * menu key or Shift+F10.
 */
export function getContextMenuHandlers(open: (opener: HTMLElement, point?: VecModel) => void) {
	return {
		onContextMenu(e: MouseEvent<HTMLElement>) {
			e.preventDefault()
			const opener = getOpener(e)
			const fromPointer = e.button === 2 || e.buttons !== 0
			const point = fromPointer ? { x: e.clientX, y: e.clientY } : undefined
			// macOS fires contextmenu on press. Opening then puts the menu under the pointer, and
			// releasing the button selects whichever item it lands on.
			if (e.buttons === 0) open(opener, point)
			else window.addEventListener('pointerup', () => open(opener, point), { once: true })
		},
		onKeyDown(e: KeyboardEvent<HTMLElement>) {
			if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return
			e.preventDefault()
			e.stopPropagation()
			open(getOpener(e))
		},
	}
}
