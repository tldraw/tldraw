import { useValue } from '@tldraw/state-react'
import { useEffect } from 'react'
import { useEditor } from '../../hooks/useEditor'

export const DefaultInFrontOfTheCanvas = () => {
	return (
		<>
			<MenuClickCapture />
		</>
	)
}

// When a menu is open, we prevent the user from interacting with the canvas.
function MenuClickCapture() {
	const editor = useEditor()
	const isMenuOpen = useValue('is menu open', () => editor.menus.hasAnyOpenMenus(), [editor])
	const handlePointerDown = () => editor.menus.clearOpenMenus()
	const handleKeyEvent = (e: KeyboardEvent) => {
		const target = e.target as Element | null
		// Menus, popovers, and the body should be allowed to receive keyboard events.
		if (target?.closest('.tlui-menu, .tlui-popover__content') || target === document.body) return

		e.preventDefault()
		e.stopPropagation()
	}

	useEffect(() => {
		if (isMenuOpen) {
			document.addEventListener('keydown', handleKeyEvent, { capture: true })
			document.addEventListener('keyup', handleKeyEvent, { capture: true })
		}

		return () => {
			document.removeEventListener('keydown', handleKeyEvent, { capture: true })
			document.removeEventListener('keyup', handleKeyEvent, { capture: true })
		}
	}, [isMenuOpen])

	return isMenuOpen && <div className="tlui-menu-overlay" onPointerDown={handlePointerDown} />
}
