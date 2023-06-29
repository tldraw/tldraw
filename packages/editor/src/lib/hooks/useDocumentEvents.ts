import { useValue } from '@tldraw/state'
import { useEffect } from 'react'
import { TLKeyboardEventInfo, TLPointerEventInfo } from '../editor/types/event-types'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useDocumentEvents() {
	const editor = useEditor()
	const container = useContainer()

	const isAppFocused = useValue('isFocused', () => editor.isFocused, [editor])

	useEffect(() => {
		if (typeof matchMedia !== undefined) return

		function updateDevicePixelRatio() {
			editor.setDevicePixelRatio(window.devicePixelRatio)
		}

		const MM = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)

		MM.addEventListener('change', updateDevicePixelRatio)
		return () => {
			MM.removeEventListener('change', updateDevicePixelRatio)
		}
	}, [editor])

	useEffect(() => {
		if (!isAppFocused) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.altKey &&
				(editor.isIn('zoom') || !editor.root.path.value.endsWith('.idle')) &&
				!isFocusingInput()
			) {
				// On windows the alt key opens the menu bar.
				// We want to prevent that if the user is doing something else,
				// e.g. resizing a shape
				preventDefault(e)
			}

			if ((e as any).isKilled) return
			;(e as any).isKilled = true

			switch (e.key) {
				case '=': {
					if (e.metaKey || e.ctrlKey) {
						preventDefault(e)
						return
					}
					break
				}
				case '-': {
					if (e.metaKey || e.ctrlKey) {
						preventDefault(e)
						return
					}
					break
				}
				case '0': {
					if (e.metaKey || e.ctrlKey) {
						preventDefault(e)
						return
					}
					break
				}
				case 'Tab': {
					if (isFocusingInput() || editor.isMenuOpen) {
						return
					}
					break
				}
				case ',': {
					if (!isFocusingInput()) {
						preventDefault(e)
						if (!editor.inputs.keys.has('Comma')) {
							const { x, y, z } = editor.inputs.currentScreenPoint
							const {
								pageState: { hoveredId },
							} = editor
							editor.inputs.keys.add('Comma')

							const info: TLPointerEventInfo = {
								type: 'pointer',
								name: 'pointer_down',
								point: { x, y, z },
								shiftKey: e.shiftKey,
								altKey: e.altKey,
								ctrlKey: e.metaKey || e.ctrlKey,
								pointerId: 0,
								button: 0,
								isPen: editor.isPenMode,
								...(hoveredId
									? {
											target: 'shape',
											shape: editor.getShapeById(hoveredId)!,
									  }
									: {
											target: 'canvas',
									  }),
							}

							editor.dispatch(info)
							return
						}
					}
					break
				}
				case 'Escape': {
					if (!editor.inputs.keys.has('Escape')) {
						editor.inputs.keys.add('Escape')

						editor.cancel()
						// Pressing escape will focus the document.body,
						// which will cause the app to lose focus, which
						// will break additional shortcuts. We need to
						// refocus the container in order to keep these
						// shortcuts working.
						container.focus()
					}
					return
				}
				default: {
					if (isFocusingInput() || editor.isMenuOpen) {
						return
					}
				}
			}

			const info: TLKeyboardEventInfo = {
				type: 'keyboard',
				name: editor.inputs.keys.has(e.code) ? 'key_repeat' : 'key_down',
				key: e.key,
				code: e.code,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
			}

			editor.dispatch(info)
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if ((e as any).isKilled) return
			;(e as any).isKilled = true

			if (isFocusingInput() || editor.isMenuOpen) {
				return
			}

			// Use the , key to send pointer events
			if (e.key === ',') {
				if (document.activeElement?.ELEMENT_NODE) preventDefault(e)
				if (editor.inputs.keys.has(e.code)) {
					const { x, y, z } = editor.inputs.currentScreenPoint
					const {
						pageState: { hoveredId },
					} = editor

					editor.inputs.keys.delete(e.code)

					const info: TLPointerEventInfo = {
						type: 'pointer',
						name: 'pointer_up',
						point: { x, y, z },
						shiftKey: e.shiftKey,
						altKey: e.altKey,
						ctrlKey: e.metaKey || e.ctrlKey,
						pointerId: 0,
						button: 0,
						isPen: editor.isPenMode,
						...(hoveredId
							? {
									target: 'shape',
									shape: editor.getShapeById(hoveredId)!,
							  }
							: {
									target: 'canvas',
							  }),
					}
					editor.dispatch(info)
					return
				}
			}

			const info: TLKeyboardEventInfo = {
				type: 'keyboard',
				name: 'key_up',
				key: e.key,
				code: e.code,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
			}

			editor.dispatch(info)
		}

		function handleTouchStart(e: TouchEvent) {
			if (container.contains(e.target as Node)) {
				// Center point of the touch area
				const touchXPosition = e.touches[0].pageX
				// Size of the touch area
				const touchXRadius = e.touches[0].radiusX || 0

				// We set a threshold (10px) on both sizes of the screen,
				// if the touch area overlaps with the screen edges
				// it's likely to trigger the navigation. We prevent the
				// touchstart event in that case.
				if (
					touchXPosition - touchXRadius < 10 ||
					touchXPosition + touchXRadius > editor.viewportScreenBounds.width - 10
				) {
					if ((e.target as HTMLElement)?.tagName === 'BUTTON') {
						// Force a click before bailing
						;(e.target as HTMLButtonElement)?.click()
					}

					preventDefault(e)
				}
			}
		}

		// Prevent wheel events that occur inside of the container
		const handleWheel = (e: WheelEvent) => {
			if (container.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
				preventDefault(e)
			}
		}

		function handleBlur() {
			editor.complete()
		}

		function handleFocus() {
			editor.updateViewportScreenBounds()
		}

		container.addEventListener('touchstart', handleTouchStart, { passive: false })

		container.addEventListener('wheel', handleWheel, { passive: false })

		document.addEventListener('gesturestart', preventDefault)
		document.addEventListener('gesturechange', preventDefault)
		document.addEventListener('gestureend', preventDefault)

		container.addEventListener('keydown', handleKeyDown)
		container.addEventListener('keyup', handleKeyUp)

		window.addEventListener('blur', handleBlur)
		window.addEventListener('focus', handleFocus)

		return () => {
			container.removeEventListener('touchstart', handleTouchStart)

			container.removeEventListener('wheel', handleWheel)

			document.removeEventListener('gesturestart', preventDefault)
			document.removeEventListener('gesturechange', preventDefault)
			document.removeEventListener('gestureend', preventDefault)

			container.removeEventListener('keydown', handleKeyDown)
			container.removeEventListener('keyup', handleKeyUp)

			window.removeEventListener('blur', handleBlur)
			window.removeEventListener('focus', handleFocus)
		}
	}, [editor, container, isAppFocused])
}

const INPUTS = ['input', 'select', 'button', 'textarea']

function isFocusingInput() {
	const { activeElement } = document

	if (
		activeElement &&
		(activeElement.getAttribute('contenteditable') ||
			INPUTS.indexOf(activeElement.tagName.toLowerCase()) > -1)
	) {
		return true
	}

	return false
}
