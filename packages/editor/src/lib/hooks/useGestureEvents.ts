import { Vec2d } from '@tldraw/primitives'
import type { AnyHandlerEventTypes, EventTypes, GestureKey, Handler } from '@use-gesture/core/types'
import { createUseGesture, pinchAction, wheelAction } from '@use-gesture/react'
import throttle from 'lodash.throttle'
import * as React from 'react'
import { TLWheelEventInfo } from '../editor/types/event-types'
import { preventDefault } from '../utils/dom'
import { normalizeWheel } from './shared'
import { useEditor } from './useEditor'

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
		let pinchState = null as null | 'zooming' | 'panning'

		const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
			if (!editor.isFocused) {
				return
			}

			pinchState = null

			if (isWheelEndEvent(Date.now())) {
				// ignore wheelEnd events
				return
			}

			// Awful tht we need to put this logic here, but basically
			// we don't want to handle the the wheel event (or call prevent
			// default on the evnet) if the user is wheeling over an a shape
			// that is scrollable which they're currently editing.

			if (editor.editingId) {
				const shape = editor.getShapeById(editor.editingId)
				if (shape) {
					const util = editor.getShapeUtil(shape)
					if (util.canScroll(shape)) {
						const bounds = editor.getPageBoundsById(editor.editingId)
						if (bounds?.containsPoint(editor.inputs.currentPagePoint)) {
							return
						}
					}
				}
			}

			preventDefault(event)
			const delta = normalizeWheel(event)

			if (delta.x === 0 && delta.y === 0) return

			const info: TLWheelEventInfo = {
				type: 'wheel',
				name: 'wheel',
				delta,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
			}

			editor.dispatch(info)
		}

		let initTouchDistance = 1
		let initZoom = 1
		let currentZoom = 1
		let currentTouchDistance = 0
		const initOrigin = new Vec2d()
		const prevOrigin = new Vec2d()

		const onPinchStart: PinchHandler = (gesture) => {
			const elm = ref.current
			pinchState = null

			const { event, origin, da } = gesture

			if (event instanceof WheelEvent) return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			prevOrigin.x = origin[0]
			prevOrigin.y = origin[1]
			initOrigin.x = origin[0]
			initOrigin.y = origin[1]
			initTouchDistance = da[0]
			initZoom = editor.zoomLevel

			editor.dispatch({
				type: 'pinch',
				name: 'pinch_start',
				point: { x: origin[0], y: origin[1], z: editor.zoomLevel },
				delta: { x: 0, y: 0 },
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
			})
		}

		const updatePinchState = throttle((type: 'gesture' | 'touch') => {
			if (pinchState === null) {
				const touchDistance = Math.abs(currentTouchDistance - initTouchDistance)
				const originDistance = Vec2d.Dist(initOrigin, prevOrigin)

				if (type === 'gesture' && touchDistance) {
					pinchState = 'zooming'
				} else if (type === 'touch' && touchDistance > 16) {
					pinchState = 'zooming'
				} else if (originDistance > 16) {
					pinchState = 'panning'
				}
			}
		}, 32)

		const onPinch: PinchHandler = (gesture) => {
			const elm = ref.current
			const { event, origin, offset, da } = gesture

			if (event instanceof WheelEvent) return
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			// Determine if the event is a gesture or a touch event.
			// This affects how we calculate the touch distance.
			// Because: When trackpad zooming on safari, a different unit is used.
			// By the way, Safari doesn't have TouchEvent...
			// ... so we have to manually check if the event is a TouchEvent.
			const isGesture = 'touches' in event ? false : true

			// The distance between the two touch points
			currentTouchDistance = da[0]

			// Only update the zoom if the pointers are far enough apart;
			// a very small touchDistance means that the user has probably
			// pinched out and their fingers are touching; this produces
			// very unstable zooming behavior.
			if (isGesture || currentTouchDistance > 64) {
				currentZoom = offset[0]
			}

			const dx = origin[0] - prevOrigin.x
			const dy = origin[1] - prevOrigin.y

			prevOrigin.x = origin[0]
			prevOrigin.y = origin[1]

			updatePinchState(isGesture ? 'gesture' : 'touch')

			switch (pinchState) {
				case 'zooming': {
					editor.dispatch({
						type: 'pinch',
						name: 'pinch',
						point: { x: origin[0], y: origin[1], z: currentZoom },
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

			pinchState = null

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
			from: () => [editor.zoomLevel, 0], // Return the camera z to use when pinch starts
			scaleBounds: () => {
				return { from: editor.zoomLevel, max: 8, min: 0.05 }
			},
		},
	})
}
