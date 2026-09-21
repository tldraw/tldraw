import { useValue } from '@tldraw/state-react'
import { useEffect, useRef } from 'react'
import { Editor } from '../editor/Editor'
import { TLKeyboardEventInfo } from '../editor/types/event-types'
import { activeElementShouldCaptureKeys, preventDefault } from '../utils/dom'
import { isAccelKey } from '../utils/keyboard'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useDocumentEvents() {
	const editor = useEditor()
	const container = useContainer()

	const isEditing = useValue('isEditing', () => editor.getEditingShapeId(), [editor])
	const isAppFocused = useValue('isFocused', () => editor.getIsFocused(), [editor])

	// `inputs.keys` only stores codes, but tools match `onKeyUp` on `info.key`, so the window
	// blur release below needs the key remembered per code.
	const heldKeysRef = useRef(new Map<string, string>())

	// Prevent the browser's default drag and drop behavior on our container (UI, etc)
	useEffect(() => {
		if (!container) return

		function onDrop(e: DragEvent) {
			// this is tricky: we don't want the event to do anything
			// here, but we do want it to make its way to the canvas,
			// even if the drop is over some other element (like a toolbar),
			// so we're going to flag the event and then dispatch
			// it to the canvas; the canvas will handle it and try to
			// stop it from propagating back, but in case we do see it again,
			// we'll look for the flag so we know to stop it from being
			// re-dispatched, which would lead to an infinite loop.
			if ((e as any).isSpecialRedispatchedEvent) return
			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			// A drop on the canvas itself already reaches the canvas (and any shape's own React
			// drop handlers) by bubbling; stopping it here would hide it from React, which
			// delegates from the root above this container.
			if (cvs?.contains(e.target as Node | null)) return
			e.stopPropagation()
			if (!cvs) return
			const newEvent = new DragEvent(e.type, e)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		}

		container.addEventListener('dragover', onDrop)
		container.addEventListener('drop', onDrop)
		return () => {
			container.removeEventListener('dragover', onDrop)
			container.removeEventListener('drop', onDrop)
		}
	}, [container])

	useEffect(() => {
		const win = editor.getContainerWindow()
		if (!('matchMedia' in win)) return

		// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes
		let remove: (() => void) | null = null
		const updatePixelRatio = () => {
			if (remove != null) {
				remove()
			}
			const mqString = `(resolution: ${win.devicePixelRatio}dppx)`
			const media = win.matchMedia(mqString)
			// Safari only started supporting `addEventListener('change',...) in version 14
			// https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event
			const safariCb = (ev: any) => {
				if (ev.type === 'change') {
					updatePixelRatio()
				}
			}
			if (media.addEventListener) {
				media.addEventListener('change', updatePixelRatio)
				// eslint-disable-next-line @typescript-eslint/no-deprecated
			} else if (media.addListener) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				media.addListener(safariCb)
			}
			remove = () => {
				if (media.removeEventListener) {
					media.removeEventListener('change', updatePixelRatio)
					// eslint-disable-next-line @typescript-eslint/no-deprecated
				} else if (media.removeListener) {
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					media.removeListener(safariCb)
				}
			}
			editor.updateInstanceState({ devicePixelRatio: win.devicePixelRatio })
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
				!areShortcutsDisabled(editor)
			) {
				// On windows the alt key opens the menu bar.
				// We want to prevent that if the user is doing something else,
				// e.g. resizing a shape
				preventDefault(e)
			}

			if (editor.wasEventAlreadyHandled(e)) return
			editor.markEventAsHandled(e)
			const hasSelectedShapes = !!editor.getSelectedShapeIds().length

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
					if (areShortcutsDisabled(editor)) {
						return
					}
					// isEditing here sounds like it's about text editing
					// but more specifically, this is so you can tab into an
					// embed that's being 'edited'. In our world,
					// editing an embed, means it's interactive.
					if (hasSelectedShapes && !isEditing) {
						// This is used in tandem with shape navigation.
						preventDefault(e)
					}
					break
				}
				case 'ArrowLeft':
				case 'ArrowRight':
				case 'ArrowUp':
				case 'ArrowDown': {
					if (areShortcutsDisabled(editor)) {
						return
					}
					if (hasSelectedShapes && (e.metaKey || e.ctrlKey)) {
						// This is used in tandem with shape navigation.
						preventDefault(e)
					}
					break
				}
				case ',': {
					// this was moved to useKeyBoardShortcuts; it's possible
					// that the comma key is pressed when the container is not
					// focused, for example when the user has just interacted
					// with the toolbar. We need to handle it on the window
					// (ofc ensuring it's a correct time for a shortcut)
					return
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
						preventDefault(e)
					}

					// Don't do anything if we open menus open
					if (editor.menus.getOpenMenus().length > 0) return

					if (editor.inputs.keys.has('Escape')) {
						// noop
					} else {
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
					if (areShortcutsDisabled(editor)) {
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
				metaKey: e.metaKey,
				accelKey: isAccelKey(e),
			}

			heldKeysRef.current.set(e.code, e.key)
			editor.dispatch(info)
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (editor.wasEventAlreadyHandled(e)) return
			editor.markEventAsHandled(e)

			if (areShortcutsDisabled(editor)) {
				return
			}

			if (e.key === ',') {
				return
			}

			const info: TLKeyboardEventInfo = {
				type: 'keyboard',
				name: 'key_up',
				key: e.key,
				code: e.code,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.metaKey || e.ctrlKey,
				metaKey: e.metaKey,
				accelKey: isAccelKey(e),
			}

			heldKeysRef.current.delete(e.code)
			editor.dispatch(info)
		}

		function handleTouchStart(e: TouchEvent) {
			if (container.contains(e.target as Node)) {
				// Center point of the touch area, measured from the edge of the window the touch
				// has to reach to trigger the navigation
				const touchXPosition = e.touches[0].clientX
				// Size of the touch area
				const touchXRadius = e.touches[0].radiusX || 0

				// If the touch area overlaps with the screen edges it's likely to trigger the
				// navigation. We prevent the touchstart event in that case. The gesture belongs to
				// the window, so an editor inset from the window's edges — beside a sidebar, say —
				// is not near an edge the system reacts to.
				const windowWidth = editor.getContainerWindow().innerWidth
				if (
					touchXPosition - touchXRadius < 10 ||
					touchXPosition + touchXRadius > windowWidth - 10
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
			// Ctrl/Meta key indicates a pinch event (funny, eh?)
			if (container.contains(e.target as Node) && (e.ctrlKey || e.metaKey)) {
				preventDefault(e)
			}
		}

		container.addEventListener('touchstart', handleTouchStart, { passive: false })

		container.addEventListener('wheel', handleWheel, { passive: false })

		// Not the shared `preventDefault` reference: the DOM dedupes identical listeners, so with two
		// editors in one document the first cleanup would otherwise remove it for both.
		const handleGesture = (e: Event) => preventDefault(e)
		const ownerDoc = container.ownerDocument
		ownerDoc.addEventListener('gesturestart', handleGesture)
		ownerDoc.addEventListener('gesturechange', handleGesture)
		ownerDoc.addEventListener('gestureend', handleGesture)

		container.addEventListener('keydown', handleKeyDown)
		container.addEventListener('keyup', handleKeyUp)

		return () => {
			container.removeEventListener('touchstart', handleTouchStart)

			container.removeEventListener('wheel', handleWheel)

			ownerDoc.removeEventListener('gesturestart', handleGesture)
			ownerDoc.removeEventListener('gesturechange', handleGesture)
			ownerDoc.removeEventListener('gestureend', handleGesture)

			container.removeEventListener('keydown', handleKeyDown)
			container.removeEventListener('keyup', handleKeyUp)
		}
	}, [editor, container, isAppFocused, isEditing])

	// Alt+Tab / Cmd+Tab away while holding a key delivers the keyup to the other app, so without
	// this Space-panning (grab cursor, drags pan) stuck until the key was pressed again (#10442).
	// Replaying a key_up per held key runs the normal release path, including tool onKeyUp.
	useEffect(() => {
		const win = editor.getContainerWindow()

		const handleWindowBlur = () => {
			const heldKeys = heldKeysRef.current
			for (const code of [...editor.inputs.keys]) {
				editor.dispatch({
					type: 'keyboard',
					name: 'key_up',
					key: heldKeys.get(code) ?? code,
					code,
					shiftKey: false,
					altKey: false,
					ctrlKey: false,
					metaKey: false,
					accelKey: false,
				})
			}
			heldKeys.clear()
		}

		win.addEventListener('blur', handleWindowBlur)
		return () => {
			win.removeEventListener('blur', handleWindowBlur)
		}
	}, [editor])
}

function areShortcutsDisabled(editor: Editor) {
	return (
		editor.menus.hasOpenMenus() ||
		activeElementShouldCaptureKeys(true, editor.getContainerDocument())
	)
}
