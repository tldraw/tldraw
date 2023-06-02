import { useEffect } from 'react'
import { useValue } from 'signia-react'
import { TLKeyboardEventInfo, TLPointerEventInfo } from '../app/types/event-types'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useApp } from './useEditor'

export function useDocumentEvents() {
	const app = useApp()
	const container = useContainer()

	const isAppFocused = useValue('isFocused', () => app.isFocused, [app])

	useEffect(() => {
		if (!isAppFocused) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.altKey &&
				(app.isIn('zoom') || !app.root.path.value.endsWith('.idle')) &&
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
					if (isFocusingInput() || app.isMenuOpen) {
						return
					}
					break
				}
				case ',': {
					if (!isFocusingInput()) {
						preventDefault(e)
						if (!app.inputs.keys.has('Comma')) {
							const { x, y, z } = app.inputs.currentScreenPoint
							const {
								pageState: { hoveredId },
							} = app
							app.inputs.keys.add('Comma')

							const info: TLPointerEventInfo = {
								type: 'pointer',
								name: 'pointer_down',
								point: { x, y, z },
								shiftKey: e.shiftKey,
								altKey: e.altKey,
								ctrlKey: e.metaKey || e.ctrlKey,
								pointerId: 0,
								button: 0,
								isPen: app.isPenMode,
								...(hoveredId
									? {
											target: 'shape',
											shape: app.getShapeById(hoveredId)!,
									  }
									: {
											target: 'canvas',
									  }),
							}

							app.dispatch(info)
							return
						}
					}
					break
				}
				case 'Escape': {
					if (!app.inputs.keys.has('Escape')) {
						app.inputs.keys.add('Escape')

						app.cancel()
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
					if (isFocusingInput() || app.isMenuOpen) {
						return
					}
				}
			}

			const info: TLKeyboardEventInfo = {
				type: 'keyboard',
				name: app.inputs.keys.has(e.code) ? 'key_repeat' : 'key_down',
				key: e.key,
				code: e.code,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
			}

			app.dispatch(info)
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if ((e as any).isKilled) return
			;(e as any).isKilled = true

			if (isFocusingInput() || app.isMenuOpen) {
				return
			}

			// Use the , key to send pointer events
			if (e.key === ',') {
				if (document.activeElement?.ELEMENT_NODE) preventDefault(e)
				if (app.inputs.keys.has(e.code)) {
					const { x, y, z } = app.inputs.currentScreenPoint
					const {
						pageState: { hoveredId },
					} = app

					app.inputs.keys.delete(e.code)

					const info: TLPointerEventInfo = {
						type: 'pointer',
						name: 'pointer_up',
						point: { x, y, z },
						shiftKey: e.shiftKey,
						altKey: e.altKey,
						ctrlKey: e.metaKey || e.ctrlKey,
						pointerId: 0,
						button: 0,
						isPen: app.isPenMode,
						...(hoveredId
							? {
									target: 'shape',
									shape: app.getShapeById(hoveredId)!,
							  }
							: {
									target: 'canvas',
							  }),
					}
					app.dispatch(info)
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

			app.dispatch(info)
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
					touchXPosition + touchXRadius > app.viewportScreenBounds.width - 10
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
			app.complete()
		}

		function handleFocus() {
			app.updateViewportScreenBounds()
		}

		container.addEventListener('touchstart', handleTouchStart, { passive: false })

		document.addEventListener('wheel', handleWheel, { passive: false })
		document.addEventListener('gesturestart', preventDefault)
		document.addEventListener('gesturechange', preventDefault)
		document.addEventListener('gestureend', preventDefault)

		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('keyup', handleKeyUp)

		window.addEventListener('blur', handleBlur)
		window.addEventListener('focus', handleFocus)

		return () => {
			container.removeEventListener('touchstart', handleTouchStart)

			document.removeEventListener('wheel', handleWheel)
			document.removeEventListener('gesturestart', preventDefault)
			document.removeEventListener('gesturechange', preventDefault)
			document.removeEventListener('gestureend', preventDefault)

			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)

			window.removeEventListener('blur', handleBlur)
			window.removeEventListener('focus', handleFocus)
		}
	}, [app, container, isAppFocused])
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
