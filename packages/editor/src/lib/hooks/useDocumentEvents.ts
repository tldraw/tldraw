import { useValue } from '@tldraw/state'
import { useEffect } from 'react'
import { TLKeyboardEventInfo, TLPointerEventInfo } from '../editor/types/event-types'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useDocumentEvents() {
	const editor = useEditor()
	const container = useContainer()

	const isAppFocused = useValue('isFocused', () => editor.getInstanceState().isFocused, [editor])

	useEffect(() => {
		if (typeof matchMedia === undefined) return
		// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes
		let remove: (() => void) | null = null
		const updatePixelRatio = () => {
			if (remove != null) {
				remove()
			}
			const mqString = `(resolution: ${window.devicePixelRatio}dppx)`
			const media = matchMedia(mqString)
			// Safari only started supporting `addEventListener('change',...) in version 14
			// https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event
			const safariCb = (ev: any) => {
				if (ev.type === 'change') {
					updatePixelRatio()
				}
			}
			if (media.addEventListener) {
				media.addEventListener('change', updatePixelRatio)
				// eslint-disable-next-line deprecation/deprecation
			} else if (media.addListener) {
				// eslint-disable-next-line deprecation/deprecation
				media.addListener(safariCb)
			}
			remove = () => {
				if (media.removeEventListener) {
					media.removeEventListener('change', updatePixelRatio)
					// eslint-disable-next-line deprecation/deprecation
				} else if (media.removeListener) {
					// eslint-disable-next-line deprecation/deprecation
					media.removeListener(safariCb)
				}
			}
			editor.updateInstanceState({ devicePixelRatio: window.devicePixelRatio })
		}
		updatePixelRatio()
		return () => {
			remove?.()
		}
	}, [editor])

	useEffect(() => {
		if (!isAppFocused) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.altKey &&
				// todo: When should we allow the alt key to be used? Perhaps states should declare which keys matter to them?
				(editor.isIn('zoom') || !editor.getPath().endsWith('.idle')) &&
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
				case '=':
				case '-':
				case '0': {
					// These keys are used for zooming. Technically we only use
					// the + - and 0 keys, however it's common for them to be
					// paired with modifier keys (command / control) so we need
					// to prevent the browser's regular actions (i.e. zooming
					// the page). A user can zoom by unfocusing the editor.
					if (e.metaKey || e.ctrlKey) {
						preventDefault(e)
						return
					}
					break
				}
				case 'Tab': {
					if (isFocusingInput() || editor.getIsMenuOpen()) {
						return
					}
					break
				}
				case ',': {
					// todo: extract to extension
					// This seems very fragile; the comma key here is used to send pointer events,
					// but that means it also needs to know about pen mode, hovered ids, etc.
					if (!isFocusingInput()) {
						preventDefault(e)
						if (!editor.inputs.keys.has('Comma')) {
							const { x, y, z } = editor.inputs.currentScreenPoint
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
								isPen: editor.getInstanceState().isPenMode,
								target: 'canvas',
							}

							editor.dispatch(info)
							return
						}
					}
					break
				}
				case 'Escape': {
					// In certain browsers, pressing escape while in full screen mode
					// will exit full screen mode. We want to allow that, but not when
					// escape is being handled by the editor. When a user has an editing
					// shape, escape stops editing. When a user is using a tool, escape
					// returns to the select tool. When the user has selected shapes,
					// escape de-selects them. Only when the user's selection is empty
					// should we allow escape to do its normal thing.

					if (editor.getEditingShape() || editor.getSelectedShapeIds().length > 0) {
						e.preventDefault()
					}

					// Don't do anything if we open menus open
					if (editor.getOpenMenus().length > 0) return

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
					if (isFocusingInput() || editor.getIsMenuOpen()) {
						return
					}
				}
			}

			const info: TLKeyboardEventInfo = {
				type: 'keyboard',
				name: e.repeat ? 'key_repeat' : 'key_down',
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

			if (isFocusingInput() || editor.getIsMenuOpen()) {
				return
			}

			// Use the , key to send pointer events
			if (e.key === ',') {
				if (document.activeElement?.ELEMENT_NODE) preventDefault(e)
				if (editor.inputs.keys.has(e.code)) {
					const { x, y, z } = editor.inputs.currentScreenPoint

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
						isPen: editor.getInstanceState().isPenMode,
						target: 'canvas',
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
					touchXPosition + touchXRadius > editor.getViewportScreenBounds().width - 10
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

		container.addEventListener('touchstart', handleTouchStart, { passive: false })

		container.addEventListener('wheel', handleWheel, { passive: false })

		document.addEventListener('gesturestart', preventDefault)
		document.addEventListener('gesturechange', preventDefault)
		document.addEventListener('gestureend', preventDefault)

		container.addEventListener('keydown', handleKeyDown)
		container.addEventListener('keyup', handleKeyUp)

		return () => {
			container.removeEventListener('touchstart', handleTouchStart)

			container.removeEventListener('wheel', handleWheel)

			document.removeEventListener('gesturestart', preventDefault)
			document.removeEventListener('gesturechange', preventDefault)
			document.removeEventListener('gestureend', preventDefault)

			container.removeEventListener('keydown', handleKeyDown)
			container.removeEventListener('keyup', handleKeyUp)
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
