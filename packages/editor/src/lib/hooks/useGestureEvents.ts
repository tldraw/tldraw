import type { AnyHandlerEventTypes, EventTypes, GestureKey, Handler } from '@use-gesture/core/types'
import { createUseGesture, pinchAction, wheelAction } from '@use-gesture/react'
import * as React from 'react'
import { TLWheelEventInfo } from '../editor/types/event-types'
import { Vec2d } from '../primitives/Vec2d'
import { preventDefault } from '../utils/dom'
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

type check<T extends AnyHandlerEventTypes, Key extends GestureKey> = undefined extends T[Key]
	? EventTypes[Key]
	: T[Key]
type PinchHandler = Handler<'pinch', check<EventTypes, 'pinch'>>

const useGesture = createUseGesture([wheelAction, pinchAction])

/**
 * GOTCHA
 *
 * UseGesture fires a wheel event 140ms after the gesture actually ends, with a momentum-adjusted
 * delta. This creates a messed up interaction where after you stop scrolling suddenly the dang page
 * jumps a tick. why do they do this? you are asking the wrong person. it seems intentional though.
 * anyway we want to ignore that last event, but there's no way to directly detect it so we need to
 * keep track of timestamps. Yes this is awful, I am sorry.
 */
let lastWheelTime = undefined as undefined | number

const isWheelEndEvent = (time: number) => {
	if (lastWheelTime === undefined) {
		lastWheelTime = time
		return false
	}

	if (time - lastWheelTime > 120 && time - lastWheelTime < 160) {
		lastWheelTime = time
		return true
	}

	lastWheelTime = time
	return false
}

export function useGestureEvents(ref: React.RefObject<HTMLDivElement>) {
	const editor = useEditor()

	const events = React.useMemo(() => {
		let pinchState = 'not sure' as 'not sure' | 'zooming' | 'panning'

		const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
			if (!editor.getInstanceState().isFocused) {
				return
			}

			pinchState = 'not sure'

			if (isWheelEndEvent(Date.now())) {
				// ignore wheelEnd events
				return
			}

			// Awful tht we need to put this logic here, but basically
			// we don't want to handle the the wheel event (or call prevent
			// default on the evnet) if the user is wheeling over an a shape
			// that is scrollable which they're currently editing.

			const editingShapeId = editor.getEditingShapeId()
			if (editingShapeId) {
				const shape = editor.getShape(editingShapeId)
				if (shape) {
					const util = editor.getShapeUtil(shape)
					if (util.canScroll(shape)) {
						const bounds = editor.getShapePageBounds(editingShapeId)
						if (bounds?.containsPoint(editor.inputs.currentPagePoint)) {
							return
						}
					}
				}
			}

			preventDefault(event)
			const delta = normalizeWheel(event)

			if (delta.x === 0 && delta.y === 0) return

			const container = editor.getContainer().getBoundingClientRect()

			const info: TLWheelEventInfo = {
				type: 'wheel',
				name: 'wheel',
				delta,
				point: new Vec2d(event.clientX, event.clientY).sub({
					x: container.left,
					y: container.top,
				}),
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
			}

			editor.dispatch(info)
		}

		let initDistanceBetweenFingers = 1 // the distance between the two fingers when the pinch starts
		let initZoom = 1 // the browser's zoom level when the pinch starts
		let currZoom = 1 // the current zoom level according to the pinch gesture recognizer
		let currDistanceBetweenFingers = 0
		const initPointBetweenFingers = new Vec2d()
		const prevPointBetweenFingers = new Vec2d()

		const onPinchStart: PinchHandler = (gesture) => {
			const elm = ref.current
			pinchState = 'not sure'

			const { event, origin, da } = gesture

			if (event instanceof WheelEvent) return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			prevPointBetweenFingers.x = origin[0]
			prevPointBetweenFingers.y = origin[1]
			initPointBetweenFingers.x = origin[0]
			initPointBetweenFingers.y = origin[1]
			initDistanceBetweenFingers = da[0]
			initZoom = editor.getZoomLevel()

			editor.dispatch({
				type: 'pinch',
				name: 'pinch_start',
				point: { x: origin[0], y: origin[1], z: editor.getZoomLevel() },
				delta: { x: 0, y: 0 },
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
			})
		}

		// let timeout: any
		const updatePinchState = (isSafariTrackpadPinch: boolean) => {
			if (isSafariTrackpadPinch) {
				pinchState = 'zooming'
			}

			if (pinchState === 'zooming') {
				return
			}

			// Initial: [touch]-------origin-------[touch]
			// Current: [touch]-----------origin----------[touch]
			//                          |----|     |------------|
			//             originDistance ^           ^ touchDistance

			// How far have the two touch points moved towards or away from eachother?
			const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
			// How far has the point between the touches moved?
			const originDistance = Vec2d.Dist(initPointBetweenFingers, prevPointBetweenFingers)

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
					// Slightly more touch distance needed to go from panning to zooming
					if (touchDistance > 64) {
						pinchState = 'zooming'
					}
					break
				}
			}
		}

		const onPinch: PinchHandler = (gesture) => {
			const elm = ref.current
			const { event, origin, offset, da } = gesture

			if (event instanceof WheelEvent) return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			// In (desktop) Safari, a two finger trackpad pinch will be a "gesturechange" event
			// and will have 0 touches; on iOS, a two-finger pinch will be a "pointermove" event
			// with two touches.
			const isSafariTrackpadPinch =
				gesture.type === 'gesturechange' || gesture.type === 'gestureend'

			// The distance between the two touch points
			currDistanceBetweenFingers = da[0]

			// Only update the zoom if the pointers are far enough apart;
			// a very small touchDistance means that the user has probably
			// pinched out and their fingers are touching; this produces
			// very unstable zooming behavior.

			const dx = origin[0] - prevPointBetweenFingers.x
			const dy = origin[1] - prevPointBetweenFingers.y

			prevPointBetweenFingers.x = origin[0]
			prevPointBetweenFingers.y = origin[1]

			updatePinchState(isSafariTrackpadPinch)

			switch (pinchState) {
				case 'zooming': {
					currZoom = offset[0]

					editor.dispatch({
						type: 'pinch',
						name: 'pinch',
						point: { x: origin[0], y: origin[1], z: currZoom },
						delta: { x: dx, y: dy },
						shiftKey: event.shiftKey,
						altKey: event.altKey,
						ctrlKey: event.metaKey || event.ctrlKey,
					})
					break
				}
				case 'panning': {
					editor.dispatch({
						type: 'pinch',
						name: 'pinch',
						point: { x: origin[0], y: origin[1], z: initZoom },
						delta: { x: dx, y: dy },
						shiftKey: event.shiftKey,
						altKey: event.altKey,
						ctrlKey: event.metaKey || event.ctrlKey,
					})
					break
				}
			}
		}

		const onPinchEnd: PinchHandler = (gesture) => {
			const elm = ref.current
			const { event, origin, offset } = gesture

			if (event instanceof WheelEvent) return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			const scale = offset[0]

			pinchState = 'not sure'

			requestAnimationFrame(() => {
				editor.dispatch({
					type: 'pinch',
					name: 'pinch_end',
					point: { x: origin[0], y: origin[1], z: scale },
					delta: { x: origin[0], y: origin[1] },
					shiftKey: event.shiftKey,
					altKey: event.altKey,
					ctrlKey: event.metaKey || event.ctrlKey,
				})
			})
		}

		return {
			onWheel,
			onPinchStart,
			onPinchEnd,
			onPinch,
		}
	}, [editor, ref])

	useGesture(events, {
		target: ref,
		eventOptions: { passive: false },
		pinch: {
			from: () => [editor.getZoomLevel(), 0], // Return the camera z to use when pinch starts
			scaleBounds: () => {
				return { from: editor.getZoomLevel(), max: 8, min: 0.05 }
			},
		},
	})
}
