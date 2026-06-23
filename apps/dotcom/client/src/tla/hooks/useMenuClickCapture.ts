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
 * without an overlay. Call once at the app root (it installs global, capture-phase document
 * listeners). While any menu is open it inspects the element under each press:
 *
 * - on the **canvas** → does nothing; the SDK's `MenuClickCapture` already dismisses and forwards drags
 * - inside an **open menu / dialog / popover / select** → does nothing; lets it work
 * - anywhere else (**chrome** — sidebar, editor top panels, buttons) → swallows the press and dismisses
 *
 * It's a listener rather than an overlay because no single app-level z-index sits above all chrome yet
 * below all menus (the editor nests its panels and menus in one stacking context), and because the
 * press is resolved by the browser's own hit-testing (`event.target`) it works for touch as well as
 * mouse with no cursor tracking. Mounting at the app root (not a per-page layout) means it also covers
 * editor pages without a sidebar — published files, snapshots, embeds.
 *
 * The listeners stay attached regardless of menu state — gated internally by `hasAnyOpenMenus()` — so
 * the `click` born from a swallowed chrome press is still suppressed after the menu has closed
 * (dismissing unmounts the menu, which would otherwise tear down a menu-scoped listener too early).
 */
export function useMenuClickCapture() {
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
}
