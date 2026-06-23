import { useEffect } from 'react'
import { tlmenus } from 'tldraw'

// A press that lands on the canvas is left alone: the SDK's own `MenuClickCapture` covers the canvas
// while a menu is open and handles dismiss + drag-forward (so click-to-draw keeps working). A press
// inside an open dismissable must keep working too. Everything else is chrome.
const CANVAS_SELECTOR = '.tl-canvas, .tlui-menu-click-capture'
const DISMISSABLE_SELECTOR =
	'[data-radix-popper-content-wrapper], [role="menu"], [role="dialog"], [role="listbox"]'

function isDismissOnlyTarget(target: EventTarget | null) {
	const el = target as Element | null
	if (!el || typeof el.closest !== 'function') return false
	// Let canvas presses through to the SDK capture, and presses inside an open menu through to it.
	if (el.closest(CANVAS_SELECTOR)) return false
	if (el.closest(DISMISSABLE_SELECTOR)) return false
	return true
}

/**
 * Makes "a press outside an open menu only dismisses it" consistent across the whole dotcom app,
 * without an overlay. While any menu is open, a single set of capture-phase document listeners
 * inspects the element under each press:
 *
 * - on the **canvas** → do nothing; the SDK's `MenuClickCapture` already dismisses and forwards drags
 * - inside an **open menu / dialog / popover / select** → do nothing; let it work
 * - anywhere else (**chrome** — sidebar, editor top panels, buttons) → swallow the press and dismiss
 *
 * This replaces per-region overlays: it needs no z-index placement (a listener isn't in the stacking
 * order), so it can't accidentally cover a menu, and it works for touch as well as mouse. The press is
 * resolved by the browser's own hit-testing (`event.target`), so it respects whatever is actually on
 * top. The listeners stay attached regardless of menu state — gated internally by `hasAnyOpenMenus()`
 * — so the `click` born from a swallowed chrome press is still suppressed after the menu has closed
 * (dismissing unmounts the menu, which would otherwise tear down a menu-scoped listener too early).
 */
export function TlaMenuClickCapture() {
	useEffect(() => {
		// Set on a swallowed chrome pointerdown, consumed by the click it generates. A physical overlay
		// gets this for free (pointerdown + pointerup land on different elements, so no click forms);
		// here the press lands on the chrome element itself, so we must cancel its click explicitly.
		let suppressClick = false

		function onPointerDown(e: PointerEvent) {
			suppressClick = false
			if (!tlmenus.hasAnyOpenMenus()) return
			if (!isDismissOnlyTarget(e.target)) return
			e.preventDefault()
			e.stopPropagation()
			suppressClick = true
			tlmenus.clearOpenMenus()
		}

		function onClick(e: MouseEvent) {
			if (!suppressClick) return
			suppressClick = false
			e.preventDefault()
			e.stopPropagation()
		}

		function onContextMenu(e: MouseEvent) {
			if (!tlmenus.hasAnyOpenMenus()) return
			if (isDismissOnlyTarget(e.target)) e.preventDefault()
		}

		document.addEventListener('pointerdown', onPointerDown, true)
		document.addEventListener('click', onClick, true)
		document.addEventListener('contextmenu', onContextMenu, true)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true)
			document.removeEventListener('click', onClick, true)
			document.removeEventListener('contextmenu', onContextMenu, true)
		}
	}, [])

	return null
}
