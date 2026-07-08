import { react } from '@tldraw/state'
import * as React from 'react'
import { TLWheelEventInfo } from '../editor/types/event-types'
import { tlenv } from '../globals/environment'
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

		let initDistanceBetweenFingers = 1 // the distance between the two fingers when the pinch starts
		let initZoom = 1 // the zoom level when the pinch starts
		let currDistanceBetweenFingers = 0
		const initPointBetweenFingers = new Vec()
		const prevPointBetweenFingers = new Vec()

		// Track active touches
		let activeTouches: Touch[] = []

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

			// Initial: [touch]-------origin-------[touch]
			// Current: [touch]-----------origin----------[touch]
			//                          |----|     |------------|
			//             originDistance ^           ^ touchDistance

			// How far have the two touch points moved towards or away from each other?
			const touchDistance = Math.abs(currDistanceBetweenFingers - initDistanceBetweenFingers)
			// How far has the point between the touches moved?
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
					// Slightly more touch distance needed to go from panning to zooming
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
			event: TouchEvent | GestureEvent
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

		function getOriginAndDistance(t0: Touch, t1: Touch) {
			const origin = {
				x: (t0.clientX + t1.clientX) / 2,
				y: (t0.clientY + t1.clientY) / 2,
			}
			const distance = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
			return { origin, distance }
		}

		function onTouchStart(event: TouchEvent) {
			if (!(event.target === elm || elm?.contains(event.target as Node))) return

			activeTouches = Array.from(event.touches)

			// eslint-disable-next-line no-console
			console.log('[shift-sim] touchstart', {
				touches: activeTouches.length,
				touchTypes: activeTouches.map((t) => (t as any).touchType ?? 'unknown'),
				isDragging: editor.inputs.getIsDragging(),
				isPointing: editor.inputs.getIsPointing(),
				isPen: editor.inputs.getIsPen(),
				shiftActive: editor._isSecondTouchShiftActive(),
			})

			if (
				activeTouches.length === 2 &&
				!editor._isSecondTouchShiftActive() &&
				!editor._secondTouchShouldSimulateShift()
			) {
				// eslint-disable-next-line no-console
				console.log('[shift-sim] pinch_start dispatched')
				// Two fingers down — start pinch
				pinchState = 'not sure'
				const { origin, distance } = getOriginAndDistance(activeTouches[0], activeTouches[1])

				prevPointBetweenFingers.x = origin.x
				prevPointBetweenFingers.y = origin.y
				initPointBetweenFingers.x = origin.x
				initPointBetweenFingers.y = origin.y
				initDistanceBetweenFingers = Math.max(distance, 1)
				currDistanceBetweenFingers = distance
				initZoom = editor.getZoomLevel()
				initScaleFrom = getScaleFrom()
				scaleOffset = initScaleFrom

				dispatchPinchEvent('pinch_start', origin, { x: 0, y: 0 }, editor.getZoomLevel(), event)
			}
		}

		function onTouchMove(event: TouchEvent) {
			activeTouches = Array.from(event.touches)

			if (activeTouches.length < 2) return

			const { origin, distance } = getOriginAndDistance(activeTouches[0], activeTouches[1])
			currDistanceBetweenFingers = distance

			const dx = origin.x - prevPointBetweenFingers.x
			const dy = origin.y - prevPointBetweenFingers.y

			prevPointBetweenFingers.x = origin.x
			prevPointBetweenFingers.y = origin.y

			updatePinchState(false)

			// Only update the zoom if the pointers are far enough apart;
			// a very small touchDistance means that the user has probably
			// pinched out and their fingers are touching; this produces
			// very unstable zooming behavior.
			const bounds = getScaleBounds()
			const rawScale = initScaleFrom * (distance / initDistanceBetweenFingers)
			scaleOffset = Math.min(bounds.max, Math.max(bounds.min, rawScale))

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

		function onTouchEnd(event: TouchEvent) {
			const wasPinching = activeTouches.length >= 2
			activeTouches = Array.from(event.touches)

			if (wasPinching && activeTouches.length < 2) {
				// Pinch ended
				const scale = scaleOffset ** editor.getCameraOptions().zoomSpeed
				const origin = { ...prevPointBetweenFingers }
				pinchState = 'not sure'

				editor.timers.requestAnimationFrame(() => {
					dispatchPinchEvent('pinch_end', origin, { x: origin.x, y: origin.y }, scale, event)
				})
			}
		}

		// --- Safari trackpad pinch (GestureEvent) ---

		let safariGestureInitialScale = 1

		// megan look here
		// decided ONCE at gesturestart and honored by gesturechange/gestureend.
		// when a gesture is skipped for shift simulation, its change/end events
		// must not dispatch pinch events either: pinch events run
		// inputs.updateFromEvent, which sets the isPen atom to false (they aren't
		// pointer events), which flickered the probe's arm reaction off and on --
		// resetting probeIndex to 0, recentering mid-rub, and swallowing scroll
		// events. that loop was the "2 scroll cap"
		let skipGestureForShift = false

		function onGestureStart(event: Event) {
			const e = event as GestureEvent
			if (!(e.target === elm || elm?.contains(e.target as Node))) return

			preventDefault(e)
			e.stopPropagation()

			// eslint-disable-next-line no-console
			console.log('[shift-sim] gesturestart', {
				isTouchDevice: tlenv.isTouchDevice,
				shiftActive: editor._isSecondTouchShiftActive(),
				shouldSimulate: editor._secondTouchShouldSimulateShift(),
			})

			if (
				tlenv.isTouchDevice &&
				(editor._isSecondTouchShiftActive() || editor._secondTouchShouldSimulateShift())
			) {
				skipGestureForShift = true
				return
			}
			skipGestureForShift = false

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

			if (skipGestureForShift) return

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

			if (skipGestureForShift) {
				skipGestureForShift = false
				return
			}

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

		// On touch devices (iOS), use pointer events for pinch.
		// On non-touch Safari (macOS trackpad), use GestureEvent.
		// Never use both simultaneously — on iOS Safari, both event types fire
		// for the same pinch gesture, causing conflicting state updates.
		const useGestureEvents = !tlenv.isIos && 'GestureEvent' in window

		if (useGestureEvents) {
			elm.addEventListener('gesturestart', onGestureStart)
			elm.addEventListener('gesturechange', onGestureChange)
			elm.addEventListener('gestureend', onGestureEnd)
		} else {
			elm.addEventListener('touchstart', onTouchStart)
			elm.addEventListener('touchmove', onTouchMove)
			elm.addEventListener('touchend', onTouchEnd)
			elm.addEventListener('touchcancel', onTouchEnd)
		}

		// TEMP diagnostic: attached on every path, log-only, no preventDefault
		const diagTouch = (event: TouchEvent) => {
			// eslint-disable-next-line no-console
			console.log('[shift-sim] diag', event.type, {
				touches: Array.from(event.touches).map((t) => (t as any).touchType ?? 'unknown'),
			})
		}
		elm.addEventListener('touchstart', diagTouch)
		elm.addEventListener('touchend', diagTouch)
		elm.addEventListener('touchcancel', diagTouch)

		// megan look here — TEMP PROBE, pool edition (stateless). remove before PR
		// iPadOS mutes finger DOM events during pencil contact but routes the
		// finger to native scrolling. megan's field data: the refusal after a
		// gesture is per native SCROLL VIEW per pencil contact, not global --
		// separate divs are separate native scroll views (the pool era got
		// multiple rubs), while rebuilding one div in place reuses the same view
		// (never helped). so: a pool of unpainted scrollers; when a gesture goes
		// quiet its scroller is retired and a fresh one is armed for the next
		// contact. retired scrollers KEEP their listeners, so a finger that never
		// lifted keeps working on its original scroller. direction protocol is
		// stateless: finger moving down -> shift on, up -> shift off. probes must
		// stay UNPAINTED (painted 100000px scrollers thrash the compositor)
		const PROBE_POOL_SIZE = 8
		// each px of finger travel counts this much toward the scrub meter
		const PROBE_SCRUB_DAMPING = 0.05
		// the meter decays exponentially with this half-life: active scrubbing
		// outruns the decay and climbs; the instant real input stops (rest, lift,
		// momentum coast) the meter collapses to ~0 within a few half-lives
		const PROBE_SCRUB_DECAY_HALF_LIFE_MS = 100
		// |a| must exceed this (px/ms^2) for the sign-latch to trigger
		const PROBE_MIN_ACCELERATION = 0.01

		const probeStopTouch = (e: TouchEvent) => e.stopPropagation()

		const probes: HTMLDivElement[] = []
		const probeLastTops = new Map<HTMLDivElement, number>()
		for (let i = 0; i < PROBE_POOL_SIZE; i++) {
			const probe = elm.ownerDocument.createElement('div')
			probe.style.cssText =
				'position:absolute;inset:0;overflow:scroll;z-index:999;pointer-events:none;background:transparent;touch-action:pan-x pan-y;'
			const spacer = elm.ownerDocument.createElement('div')
			spacer.style.cssText = 'width:100000px;height:100000px;touch-action:pan-x pan-y;'
			probe.appendChild(spacer)
			elm.appendChild(probe)
			// the canvas's own touchstart handler calls preventDefault, which would
			// kill native scrolling -- stop the event from bubbling up to it
			probe.addEventListener('touchstart', probeStopTouch)
			probes.push(probe)
		}

		let probeArmed = false
		let probeIndex = 0
		// ignore events caused by our own recentering (programmatic scrollTo fires
		// scroll events too)
		let probeRecenteredAt = 0
		// a real finger gesture happened on the current scroller since it was armed
		let probeSawRealScroll = false
		let probeAdvanceTimeout: any
		// signed, damped, time-decaying scrub meter (positive = down)
		let probeRunLen = 0
		let probeRunUpdatedAt = 0
		// per-event velocity (px/ms) and acceleration (px/ms^2); v and a drive
		// the sign-latch below
		let probeLastVelocity = 0
		let probeLastAcceleration = 0

		const probeHud = elm.ownerDocument.createElement('div')
		probeHud.style.cssText =
			'position:absolute;top:50%;left:8px;transform:translateY(-50%);z-index:1000;pointer-events:none;font:600 14px/1.4 monospace;white-space:pre;color:#3c82ff;background:rgba(255,255,255,0.75);padding:4px 8px;border-radius:4px;display:none;'
		elm.appendChild(probeHud)
		// fixed-width number: explicit sign + fixed decimals + space padding, so
		// columns never shift as signs and magnitudes change (needs white-space:pre)
		const fmtHudNum = (n: number, width: number, decimals: number) =>
			((n >= 0 ? '+' : '') + n.toFixed(decimals)).padStart(width)
		const updateProbeHud = () => {
			if (!probeArmed) {
				probeHud.style.display = 'none'
				return
			}
			probeHud.style.display = 'block'
			probeHud.textContent = `#${probeIndex}  scrub:${fmtHudNum(probeRunLen, 6, 1)}  v:${fmtHudNum(probeLastVelocity, 6, 2)}  a:${fmtHudNum(probeLastAcceleration, 7, 3)}  shift:${editor._isSecondTouchShiftActive() ? 'ON ' : 'off'}`
		}

		const recenterProbe = (probe: HTMLDivElement) => {
			probeRecenteredAt = performance.now()
			probe.scrollTo(50000 - probe.clientWidth / 2, 50000 - probe.clientHeight / 2)
			probeLastTops.set(probe, probe.scrollTop)
		}

		const armFreshProbe = (index: number) => {
			probeIndex = index
			probeSawRealScroll = false
			probeRunLen = 0
			probeRunUpdatedAt = performance.now()
			probeLastVelocity = 0
			probeLastAcceleration = 0
			const probe = probes[index]
			recenterProbe(probe)
			probe.style.pointerEvents = 'auto'
		}

		// retire the current scroller and arm a fresh native scroll view for the
		// NEXT finger contact. the retired scroller's listener stays live, so an
		// unlifted finger keeps its working scroller. shift state is untouched
		const advanceProbe = () => {
			if (!probeArmed || !probeSawRealScroll) return
			probes[probeIndex].style.pointerEvents = 'none'
			armFreshProbe((probeIndex + 1) % PROBE_POOL_SIZE)
			// eslint-disable-next-line no-console
			console.log('[shift-sim] PROBE advance -> fresh scroller #', probeIndex)
			updateProbeHud()
		}

		const onProbeScroll = (e: Event) => {
			const probe = e.currentTarget as HTMLDivElement
			if (performance.now() - probeRecenteredAt < 100) {
				probeLastTops.set(probe, probe.scrollTop)
				return
			}
			// finger moving down pulls scrollTop DOWN, so finger delta = -scroll delta
			const last = probeLastTops.get(probe) ?? probe.scrollTop
			const fingerDy = last - probe.scrollTop
			probeLastTops.set(probe, probe.scrollTop)
			if (fingerDy === 0) return
			if (probe === probes[probeIndex]) {
				probeSawRealScroll = true
				clearTimeout(probeAdvanceTimeout)
				probeAdvanceTimeout = editor.timers.setTimeout(advanceProbe, 400)
			}
			// decay the meter for the time elapsed since the last event, then add
			// the damped delta. reversal still resets outright
			const now = performance.now()
			const dtMs = now - probeRunUpdatedAt
			probeRunUpdatedAt = now
			probeRunLen *= Math.pow(0.5, dtMs / PROBE_SCRUB_DECAY_HALF_LIFE_MS)
			const velocity = fingerDy / Math.max(dtMs, 1)
			probeLastAcceleration = (velocity - probeLastVelocity) / Math.max(dtMs, 1)
			probeLastVelocity = velocity
			const scrubDy = fingerDy * PROBE_SCRUB_DAMPING
			probeRunLen = Math.sign(scrubDy) === Math.sign(probeRunLen) ? probeRunLen + scrubDy : scrubDy
			// acceleration sign-latch: an accelerating up-scrub (v<0, a<0) latches
			// shift on, an accelerating down-scrub (v>0, a>0) latches it off.
			// momentum coasts decelerate, so their v and a signs disagree and they
			// can never trigger either transition
			if (
				velocity < 0 &&
				probeLastAcceleration < -PROBE_MIN_ACCELERATION &&
				!editor._isSecondTouchShiftActive()
			) {
				editor._setExternalShiftHeld(true)
			} else if (
				velocity > 0 &&
				probeLastAcceleration > PROBE_MIN_ACCELERATION &&
				editor._isSecondTouchShiftActive()
			) {
				editor._setExternalShiftHeld(false)
			}
			updateProbeHud()
		}
		for (const probe of probes) {
			probe.addEventListener('scroll', onProbeScroll, { passive: true })
		}

		// arm while a pen stroke is in progress; disarm (and release any held
		// probe-shift) the moment the pen lifts
		const stopProbeReaction = react('shift scroll probe', () => {
			const active = editor.inputs.getIsPen() && editor.inputs.getIsPointing()
			probeArmed = active
			clearTimeout(probeAdvanceTimeout)
			if (active) {
				for (const probe of probes) probe.style.pointerEvents = 'none'
				armFreshProbe(0)
			} else {
				for (const probe of probes) probe.style.pointerEvents = 'none'
				editor._setExternalShiftHeld(false)
			}
			updateProbeHud()
		})

		return () => {
			stopProbeReaction()
			clearTimeout(probeAdvanceTimeout)
			probeHud.remove()
			for (const probe of probes) {
				probe.removeEventListener('touchstart', probeStopTouch)
				probe.removeEventListener('scroll', onProbeScroll)
				probe.remove()
			}
			elm.removeEventListener('touchstart', diagTouch)
			elm.removeEventListener('touchend', diagTouch)
			elm.removeEventListener('touchcancel', diagTouch)
			elm.removeEventListener('wheel', onWheel)
			if (useGestureEvents) {
				elm.removeEventListener('gesturestart', onGestureStart)
				elm.removeEventListener('gesturechange', onGestureChange)
				elm.removeEventListener('gestureend', onGestureEnd)
			} else {
				elm.removeEventListener('touchstart', onTouchStart)
				elm.removeEventListener('touchmove', onTouchMove)
				elm.removeEventListener('touchend', onTouchEnd)
				elm.removeEventListener('touchcancel', onTouchEnd)
			}
		}
	}, [editor, ref])
}
