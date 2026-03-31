import * as React from 'react'
import { TLWheelEventInfo } from '../editor/types/event-types'
import { Vec } from '../primitives/Vec'
import { preventDefault } from '../utils/dom'
import { isAccelKey } from '../utils/keyboard'
import { normalizeWheel } from '../utils/normalizeWheel'
import { useEditor } from './useEditor'

/*

# How does pinching work?

The pinching handler is fired under two circumstances:
- when a user is on a MacBook trackpad and is ZOOMING with a two-finger pinch
- when a user is on a touch device and is ZOOMING with a two-finger pinch
- when a user is on a touch device and is PANNING with two fingers

Zooming is much more expensive than panning (because it causes shapes to render),
so we want to be sure that we don't zoom while two-finger panning.

In order to do this, we keep track of a "pinchState", which is either:
- "zooming"
- "panning"
- "not sure"

If a user is on a trackpad, the pinchState will be set to "zooming".

If the user is on a touch screen, then we start in the "not sure" state and switch back and forth
between "zooming", "panning", and "not sure" based on what the user is doing with their fingers.

In the "not sure" state, we examine whether the user has moved the center of the gesture far enough
to suggest that they're panning; or else that they've moved their fingers further apart or closer
together enough to suggest that they're zooming.

In the "panning" state, we check whether the user's fingers have moved far enough apart to suggest
that they're zooming. If they have, we switch to the "zooming" state.

In the "zooming" state, we just stay zooming—it's not YET possible to switch back to panning.

todo: compare velocities of change in order to determine whether the user has switched back to panning
*/

/** Safari's non-standard GestureEvent */
interface GestureEvent extends Event {
	scale: number
	rotation: number
	clientX: number
	clientY: number
	shiftKey: boolean
	altKey: boolean
	metaKey: boolean
	ctrlKey: boolean
}

export function useGestureEvents(ref: React.RefObject<HTMLDivElement | null>) {
	const editor = useEditor()

	React.useEffect(() => {
		const elm = ref.current
		if (!elm) return

		let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'

		// --- Wheel handling ---

		function onWheel(event: WheelEvent) {
			if (!editor.getInstanceState().isFocused) {
				return
			}

			pinchState = 'not sure'

			// Don't handle wheel events over a scrollable editing shape
			const editingShapeId = editor.getEditingShapeId()
			if (editingShapeId) {
				const shape = editor.getShape(editingShapeId)
				if (shape) {
					const util = editor.getShapeUtil(shape)
					if (util.canScroll(shape)) {
						const bounds = editor.getShapePageBounds(editingShapeId)
						if (bounds?.containsPoint(editor.inputs.getCurrentPagePoint())) {
							return
						}
					}
				}
			}

			preventDefault(event)
			event.stopPropagation()
			const delta = normalizeWheel(event)

			if (delta.x === 0 && delta.y === 0) return

			const info: TLWheelEventInfo = {
				type: 'wheel',
				name: 'wheel',
				delta,
				point: new Vec(event.clientX, event.clientY),
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
				metaKey: event.metaKey,
				accelKey: isAccelKey(event),
			}

			editor.dispatch(info)
		}

		// --- Touch pinch handling ---

		let initDistanceBetweenFingers = 1
		let initZoom = 1
		let currDistanceBetweenFingers = 0
		const initPointBetweenFingers = new Vec()
		const prevPointBetweenFingers = new Vec()

		// Track active touch pointers
		const activePointers = new Map<number, { x: number; y: number }>()

		function getScaleBounds() {
			const baseZoom = editor.getBaseZoom()
			const { zoomSteps, zoomSpeed } = editor.getCameraOptions()
			const zoomMin = zoomSteps[0] * baseZoom
			const zoomMax = zoomSteps[zoomSteps.length - 1] * baseZoom
			return {
				min: zoomMin ** (1 / zoomSpeed),
				max: zoomMax ** (1 / zoomSpeed),
			}
		}

		function getScaleFrom() {
			const { zoomSpeed } = editor.getCameraOptions()
			return editor.getZoomLevel() ** (1 / zoomSpeed)
		}

		// Accumulated scale offset, clamped to bounds — replaces @use-gesture's offset[0]
		let scaleOffset = 1
		let initScaleFrom = 1 // the scale-space zoom level when the pinch started

		function updatePinchState(isSafariTrackpadPinch: boolean) {
			if (isSafariTrackpadPinch) {
				pinchState = 'zooming'
			}

			if (pinchState === 'zooming') {
				return
			}

			const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
			const originDistance = Vec.Dist(initPointBetweenFingers, prevPointBetweenFingers)

			switch (pinchState) {
				case 'not sure': {
					if (touchDistance > 24) {
						pinchState = 'zooming'
					} else if (originDistance > 16) {
						pinchState = 'panning'
					}
					break
				}
				case 'panning': {
					if (touchDistance > 64) {
						pinchState = 'zooming'
					}
					break
				}
			}
		}

		function dispatchPinchEvent(
			name: 'pinch_start' | 'pinch' | 'pinch_end',
			origin: { x: number; y: number },
			delta: { x: number; y: number },
			zoom: number,
			event: PointerEvent | GestureEvent
		) {
			editor.dispatch({
				type: 'pinch',
				name,
				point: { x: origin.x, y: origin.y, z: zoom },
				delta,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
				metaKey: event.metaKey,
				accelKey: isAccelKey(event),
			})
		}

		function getOriginAndDistance() {
			const pts = [...activePointers.values()]
			const origin = {
				x: (pts[0].x + pts[1].x) / 2,
				y: (pts[0].y + pts[1].y) / 2,
			}
			const distance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
			return { origin, distance }
		}

		function onPointerDown(event: PointerEvent) {
			if (event.pointerType !== 'touch') return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

			if (activePointers.size === 2) {
				// Two fingers down — start pinch
				pinchState = 'not sure'
				const { origin, distance } = getOriginAndDistance()

				prevPointBetweenFingers.x = origin.x
				prevPointBetweenFingers.y = origin.y
				initPointBetweenFingers.x = origin.x
				initPointBetweenFingers.y = origin.y
				initDistanceBetweenFingers = distance
				currDistanceBetweenFingers = distance
				initZoom = editor.getZoomLevel()
				initScaleFrom = getScaleFrom()
				scaleOffset = initScaleFrom

				dispatchPinchEvent('pinch_start', origin, { x: 0, y: 0 }, editor.getZoomLevel(), event)
			}
		}

		function onPointerMove(event: PointerEvent) {
			if (event.pointerType !== 'touch') return
			if (!activePointers.has(event.pointerId)) return

			activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

			if (activePointers.size < 2) return

			const { origin, distance } = getOriginAndDistance()
			currDistanceBetweenFingers = distance

			const dx = origin.x - prevPointBetweenFingers.x
			const dy = origin.y - prevPointBetweenFingers.y

			prevPointBetweenFingers.x = origin.x
			prevPointBetweenFingers.y = origin.y

			updatePinchState(false)

			// Update scale offset: ratio of current distance to initial distance, applied to initial scale
			const bounds = getScaleBounds()
			if (initDistanceBetweenFingers > 0) {
				const rawScale = initScaleFrom * (distance / initDistanceBetweenFingers)
				scaleOffset = Math.min(bounds.max, Math.max(bounds.min, rawScale))
			}

			switch (pinchState) {
				case 'zooming': {
					const currZoom = scaleOffset ** editor.getCameraOptions().zoomSpeed
					dispatchPinchEvent('pinch', origin, { x: dx, y: dy }, currZoom, event)
					break
				}
				case 'panning': {
					dispatchPinchEvent('pinch', origin, { x: dx, y: dy }, initZoom, event)
					break
				}
			}
		}

		function onPointerUp(event: PointerEvent) {
			if (event.pointerType !== 'touch') return

			const wasPinching = activePointers.size >= 2
			activePointers.delete(event.pointerId)

			if (wasPinching && activePointers.size < 2) {
				// Pinch ended
				const scale = scaleOffset ** editor.getCameraOptions().zoomSpeed
				const origin = { ...prevPointBetweenFingers }
				pinchState = 'not sure'

				editor.timers.requestAnimationFrame(() => {
					dispatchPinchEvent('pinch_end', origin, { x: origin.x, y: origin.y }, scale, event)
				})
			}
		}

		function onPointerCancel(event: PointerEvent) {
			onPointerUp(event)
		}

		// --- Safari trackpad pinch (GestureEvent) ---

		let safariGestureInitialScale = 1

		function onGestureStart(event: Event) {
			const e = event as GestureEvent
			if (!(e.target === elm || elm?.contains(e.target as Node))) return

			preventDefault(e)
			e.stopPropagation()

			pinchState = 'not sure'
			safariGestureInitialScale = getScaleFrom()
			scaleOffset = safariGestureInitialScale
			initZoom = editor.getZoomLevel()

			prevPointBetweenFingers.x = e.clientX
			prevPointBetweenFingers.y = e.clientY
			initPointBetweenFingers.x = e.clientX
			initPointBetweenFingers.y = e.clientY
			initDistanceBetweenFingers = 1
			currDistanceBetweenFingers = 1

			dispatchPinchEvent(
				'pinch_start',
				{ x: e.clientX, y: e.clientY },
				{ x: 0, y: 0 },
				editor.getZoomLevel(),
				e
			)
		}

		function onGestureChange(event: Event) {
			const e = event as GestureEvent
			if (!(e.target === elm || elm?.contains(e.target as Node))) return

			preventDefault(e)
			e.stopPropagation()

			const dx = e.clientX - prevPointBetweenFingers.x
			const dy = e.clientY - prevPointBetweenFingers.y

			prevPointBetweenFingers.x = e.clientX
			prevPointBetweenFingers.y = e.clientY

			// Safari GestureEvent.scale is a multiplier relative to gesture start
			const bounds = getScaleBounds()
			const rawScale = safariGestureInitialScale * e.scale
			scaleOffset = Math.min(bounds.max, Math.max(bounds.min, rawScale))

			// Update distance tracking for pinch state (treat scale change as distance change)
			currDistanceBetweenFingers = e.scale * initDistanceBetweenFingers

			updatePinchState(true)

			const currZoom = scaleOffset ** editor.getCameraOptions().zoomSpeed

			dispatchPinchEvent('pinch', { x: e.clientX, y: e.clientY }, { x: dx, y: dy }, currZoom, e)
		}

		function onGestureEnd(event: Event) {
			const e = event as GestureEvent
			if (!(e.target === elm || elm?.contains(e.target as Node))) return

			preventDefault(e)
			e.stopPropagation()

			const scale = scaleOffset ** editor.getCameraOptions().zoomSpeed
			pinchState = 'not sure'

			editor.timers.requestAnimationFrame(() => {
				dispatchPinchEvent(
					'pinch_end',
					{ x: e.clientX, y: e.clientY },
					{ x: e.clientX, y: e.clientY },
					scale,
					e
				)
			})
		}

		// --- Attach event listeners ---

		elm.addEventListener('wheel', onWheel, { passive: false })

		// Touch pinch via pointer events
		elm.addEventListener('pointerdown', onPointerDown)
		elm.addEventListener('pointermove', onPointerMove)
		elm.addEventListener('pointerup', onPointerUp)
		elm.addEventListener('pointercancel', onPointerCancel)

		// Safari trackpad pinch via GestureEvent
		elm.addEventListener('gesturestart', onGestureStart)
		elm.addEventListener('gesturechange', onGestureChange)
		elm.addEventListener('gestureend', onGestureEnd)

		return () => {
			elm.removeEventListener('wheel', onWheel)
			elm.removeEventListener('pointerdown', onPointerDown)
			elm.removeEventListener('pointermove', onPointerMove)
			elm.removeEventListener('pointerup', onPointerUp)
			elm.removeEventListener('pointercancel', onPointerCancel)
			elm.removeEventListener('gesturestart', onGestureStart)
			elm.removeEventListener('gesturechange', onGestureChange)
			elm.removeEventListener('gestureend', onGestureEnd)
		}
	}, [editor, ref])
}
