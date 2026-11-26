// This module is part of the headless core. It must not import React or touch the DOM.
import { unsafe__withoutCapture } from '@tldraw/state'
import { TLCursorType, TLINSTANCE_ID, TLShapeId } from '@tldraw/tlschema'
import { PerformanceTracker, bind } from '@tldraw/utils'
import {
	LEFT_MOUSE_BUTTON,
	MIDDLE_MOUSE_BUTTON,
	RIGHT_MOUSE_BUTTON,
	STYLUS_ERASER_BUTTON,
} from '../../constants'
import type { Editor } from '../../editor/Editor'
import type { ClickManager } from '../../editor/managers/ClickManager/ClickManager'
import { TLEventInfo } from '../../editor/types/event-types'
import { Vec } from '../../primitives/Vec'
import { debugFlags } from '../../utils/debug-flags'
import { performanceCapability } from './performance'
import { scribblesCapability } from './scribbles'

/**
 * Runs the events that the editor dispatches: it batches pointer moves, wheel and pinch events
 * until the next tick, updates the input state, handles panning, zooming and modifier keys, and
 * sends each event to the state chart. `editor.dispatch` uses it. Its methods call the editor's
 * public methods for everything else, so a subclass that overrides an editor method changes event
 * handling too.
 *
 * @public
 */
export class EventDispatcher {
	constructor(
		private readonly editor: Editor,
		private readonly _clickManager: ClickManager
	) {
		this.performanceTracker = new PerformanceTracker()
	}

	/**
	 * The previous cursor. Used for restoring the cursor after pan events.
	 *
	 * @internal
	 */
	private _prevCursor: TLCursorType = 'default'

	/** @internal */
	private _shiftKeyTimeout = -1 as any

	/**
	 * Release the shift modifier: clear its debounce timer id, drop the atom, and
	 * dispatch a synthetic `key_up` so `inputs.keys` and tool `onKeyUp` handlers update.
	 * Runs both as the 150ms debounce timer callback and when a pointer down flushes it.
	 * @internal
	 */
	@bind
	_releaseShiftKey() {
		this._shiftKeyTimeout = -1
		this.editor.inputs.setShiftKey(false)
		this.editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Shift',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: this.editor.inputs.getAccelKey(),
			code: 'ShiftLeft',
		})
	}

	/** @internal */
	private _altKeyTimeout = -1 as any

	/**
	 * Release the alt modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseAltKey() {
		this._altKeyTimeout = -1
		this.editor.inputs.setAltKey(false)
		this.editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Alt',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: this.editor.inputs.getAccelKey(),
			code: 'AltLeft',
		})
	}

	/** @internal */
	private _ctrlKeyTimeout = -1 as any

	/**
	 * Release the ctrl modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseCtrlKey() {
		this._ctrlKeyTimeout = -1
		this.editor.inputs.setCtrlKey(false)
		this.editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Ctrl',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: this.editor.inputs.getAccelKey(),
			code: 'ControlLeft',
		})
	}

	/** @internal */
	private _metaKeyTimeout = -1 as any

	/**
	 * Release the meta modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseMetaKey() {
		this._metaKeyTimeout = -1
		this.editor.inputs.setMetaKey(false)
		this.editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Meta',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: this.editor.inputs.getAccelKey(),
			code: 'MetaLeft',
		})
	}

	/**
	 * Flush any modifier still sitting in its 150ms release-debounce window, so a new
	 * interaction (a pointer down) starts with correct modifier state instead of a
	 * just-released key still being counted as held. A pending timer is exactly
	 * "released but still counted as held"; a genuinely-held modifier has no timer
	 * (-1) and is left alone.
	 *
	 * Each modifier is released through the same path its timer would have taken
	 * (`_releaseShiftKey` and friends), which dispatches the synthetic `key_up` so
	 * stale codes (e.g. `ShiftLeft`) leave `inputs.keys` and tool `onKeyUp` handlers run.
	 * We clear every pending modifier atom and timer *first*, then dispatch: a synthetic
	 * `key_up` reports all currently-held modifiers, so releasing them one at a time
	 * would make each event re-confirm the not-yet-released ones and cancel their flush.
	 * @internal
	 */
	private _releaseDebouncedModifiers() {
		const releaseShift = this._shiftKeyTimeout !== -1
		const releaseAlt = this._altKeyTimeout !== -1
		const releaseCtrl = this._ctrlKeyTimeout !== -1
		const releaseMeta = this._metaKeyTimeout !== -1

		if (releaseShift) {
			this.editor.timers.clearTimeout(this._shiftKeyTimeout)
			this._shiftKeyTimeout = -1
			this.editor.inputs.setShiftKey(false)
		}
		if (releaseAlt) {
			this.editor.timers.clearTimeout(this._altKeyTimeout)
			this._altKeyTimeout = -1
			this.editor.inputs.setAltKey(false)
		}
		if (releaseCtrl) {
			this.editor.timers.clearTimeout(this._ctrlKeyTimeout)
			this._ctrlKeyTimeout = -1
			this.editor.inputs.setCtrlKey(false)
		}
		if (releaseMeta) {
			this.editor.timers.clearTimeout(this._metaKeyTimeout)
			this._metaKeyTimeout = -1
			this.editor.inputs.setMetaKey(false)
		}

		// Dispatch the synthetic key_up for each flushed modifier (same path its 150ms
		// timer would run): clears stale codes from inputs.keys and fires tool onKeyUp.
		if (releaseShift) this.editor._releaseShiftKey()
		if (releaseAlt) this.editor._releaseAltKey()
		if (releaseCtrl) this.editor._releaseCtrlKey()
		if (releaseMeta) this.editor._releaseMetaKey()
	}

	/** @internal */
	private _restoreToolId = 'select'

	/** @internal */
	private _didPinch = false

	/** @internal */
	private _selectedShapeIdsAtPointerDown: TLShapeId[] = []

	/**
	 * Whether `_selectedShapeIdsAtPointerDown` holds a pre-gesture selection
	 * captured by a `pointer_down` (the touch path) that a following pinch
	 * should restore. False when no pointer_down preceded the pinch (the
	 * Safari trackpad path uses gesture events), in which case `pinch_start`
	 * captures the live selection instead.
	 * @internal
	 */
	private _didCaptureSelectionAtPointerDown = false

	/** @internal */
	private _longPressTimeout = -1 as any

	/** @internal */
	private readonly performanceTracker: PerformanceTracker

	/** @internal */
	private performanceTrackerTimeout = -1 as any

	/**
	 * Dispatch an event to the editor.
	 *
	 * @example
	 * ```ts
	 * editor.dispatch(myPointerEvent)
	 * ```
	 *
	 * @param info - The event info.
	 *
	 * @public
	 */
	dispatch(info: TLEventInfo) {
		this._pendingEventsForNextTick.push(info)
		if (
			!(
				(info.type === 'pointer' && info.name === 'pointer_move') ||
				info.type === 'wheel' ||
				info.type === 'pinch'
			)
		) {
			this._flushEventsForTick(0)
		}
		return this.editor
	}

	private _pendingEventsForNextTick: TLEventInfo[] = []

	@bind _flushEventsForTick(elapsed: number) {
		this.editor.run(() => {
			if (this._pendingEventsForNextTick.length > 0) {
				const events = [...this._pendingEventsForNextTick]
				this._pendingEventsForNextTick.length = 0
				for (const info of events) {
					this.editor._flushEventForTick(info)
				}
			}
			if (elapsed > 0) {
				this.editor.root.handleEvent({ type: 'misc', name: 'tick', elapsed })
			}
			this.editor.plugins.getOptional(scribblesCapability)?.tick(elapsed)
		})
	}

	_flushEventForTick(info: TLEventInfo) {
		// prevent us from spamming similar event errors if we're crashed.
		// todo: replace with new readonly mode?
		if (this.editor.getCrashingError()) return this.editor

		this.editor.emit('before-event', info)

		const { inputs } = this.editor
		const { type } = info

		if (info.type === 'misc') {
			// stop panning if the interaction is cancelled or completed
			if (info.name === 'cancel' || info.name === 'complete') {
				this.editor.inputs.setIsDragging(false)

				// A pan owned by a held spacebar outlives the cancelled interaction;
				// key_up ends it. Otherwise Escape mid-pan stops the camera until
				// the user releases and re-presses Space (#10446).
				if (this.editor.inputs.getIsPanning() && !this.editor.inputs.keys.has('Space')) {
					this.editor.inputs.setIsPanning(false)
					this.editor.inputs.setIsSpacebarPanning(false)
					this.editor.setCursor({ type: this._prevCursor, rotation: 0 })
				}
			}

			this.editor.root.handleEvent(info)
			this.editor.emit('event', info)
			return
		}

		if (info.shiftKey) {
			this.editor.timers.clearTimeout(this._shiftKeyTimeout)
			this._shiftKeyTimeout = -1
			inputs.setShiftKey(true)
		} else if (!info.shiftKey && inputs.getShiftKey() && this._shiftKeyTimeout === -1) {
			this._shiftKeyTimeout = this.editor.timers.setTimeout(this.editor._releaseShiftKey, 150)
		}

		if (info.altKey) {
			this.editor.timers.clearTimeout(this._altKeyTimeout)
			this._altKeyTimeout = -1
			inputs.setAltKey(true)
		} else if (!info.altKey && inputs.getAltKey() && this._altKeyTimeout === -1) {
			this._altKeyTimeout = this.editor.timers.setTimeout(this.editor._releaseAltKey, 150)
		}

		if (info.ctrlKey) {
			this.editor.timers.clearTimeout(this._ctrlKeyTimeout)
			this._ctrlKeyTimeout = -1
			inputs.setCtrlKey(true)
		} else if (!info.ctrlKey && inputs.getCtrlKey() && this._ctrlKeyTimeout === -1) {
			this._ctrlKeyTimeout = this.editor.timers.setTimeout(this.editor._releaseCtrlKey, 150)
		}

		if (info.metaKey && info.name !== 'key_up') {
			// Unlike the other modifiers, the native metaKey property is still true on keyup.
			// If we don't have this guard, then the metakey will be left true without the timeout.
			this.editor.timers.clearTimeout(this._metaKeyTimeout)
			this._metaKeyTimeout = -1
			inputs.setMetaKey(true)
		} else if (!info.metaKey && inputs.getMetaKey() && this._metaKeyTimeout === -1) {
			this._metaKeyTimeout = this.editor.timers.setTimeout(this.editor._releaseMetaKey, 150)
		}

		if (!inputs.getIsPointing()) {
			inputs.setIsDragging(false)
		}

		const instanceState = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const pageState = this.editor.store.get(this.editor._getCurrentPageStateId())!
		const cameraOptions = this.editor._camera._cameraOptions.__unsafe__getWithoutCapture()!

		switch (type) {
			case 'pinch': {
				this.editor.timers.clearTimeout(this._longPressTimeout)
				this.editor.inputs.updateFromEvent(info)

				switch (info.name) {
					case 'pinch_start': {
						if (inputs.getIsPinching()) return

						if (!inputs.getIsEditing()) {
							// If a pointer_down already captured the pre-gesture selection,
							// keep it: on touch, the first finger's pointer_down can change
							// the selection before the second finger starts the pinch, and we
							// want to restore the selection from before that change. When no
							// pointer_down preceded the pinch (Safari delivers trackpad pinches
							// as gesture events), capture the live selection now.
							if (!this._didCaptureSelectionAtPointerDown) {
								this._selectedShapeIdsAtPointerDown = [...pageState.selectedShapeIds]
							}

							this._didPinch = true

							inputs.setIsPinching(true)

							this.editor.interrupt()

							// If the first finger changed the selection, roll it back now rather
							// than waiting for the pinch to end, so the pre-gesture selection is
							// what's shown during the pinch.
							if (this._didCaptureSelectionAtPointerDown) {
								this.editor.setSelectedShapes(this._selectedShapeIdsAtPointerDown)
							}
						}

						this.editor.emit('event', info)
						return // Stop here!
					}
					case 'pinch': {
						if (!inputs.getIsPinching()) return
						// Lock the zoom, not the gesture: skipping pinch_start would send the fingers'
						// pointer events to the tool, and skipping pinch_end would leave isPinching stuck.
						if (cameraOptions.isLocked) return

						const {
							point: { z = 1 },
							delta: { x: dx, y: dy },
						} = info

						// The center of the pinch in screen space
						const { x, y } = Vec.SubXY(
							info.point,
							instanceState.screenBounds.x,
							instanceState.screenBounds.y
						)

						this.editor.stopCameraAnimation()
						if (instanceState.followingUserId) {
							this.editor.stopFollowingUser()
						}

						const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.editor.getCamera())

						const { panSpeed } = cameraOptions
						this.editor._camera._setCamera(
							new Vec(
								cx + (dx * panSpeed) / cz - x / cz + x / z,
								cy + (dy * panSpeed) / cz - y / cz + y / z,
								z
							),
							{ immediate: true }
						)

						this.editor.plugins
							.getOptional(performanceCapability)
							?._notifyCameraOperation('zooming')
						this.editor.emit('event', info)
						return // Stop here!
					}
					case 'pinch_end': {
						if (!inputs.getIsPinching()) return this.editor

						// Stop pinching
						inputs.setIsPinching(false)

						// Stash and clear the shapes that were selected when the pinch started
						const { _selectedShapeIdsAtPointerDown: shapesToReselect } = this
						this.editor.setSelectedShapes(this._selectedShapeIdsAtPointerDown)
						this._selectedShapeIdsAtPointerDown = []
						this._didCaptureSelectionAtPointerDown = false

						if (this._didPinch) {
							this._didPinch = false
							if (shapesToReselect.length > 0) {
								this.editor.once('tick', () => {
									if (!this._didPinch) {
										// Unless we've started pinching again...
										// Reselect the shapes that were selected when the pinch started
										this.editor.setSelectedShapes(shapesToReselect)
									}
								})
							}
						}

						this.editor.emit('event', info)
						return // Stop here!
					}
				}
			}
			case 'wheel': {
				if (cameraOptions.isLocked) return

				this.editor.inputs.updateFromEvent(info)

				const { panSpeed, zoomSpeed } = cameraOptions
				let wheelBehavior = cameraOptions.wheelBehavior
				const inputMode = this.editor.user.getUserPreferences().inputMode

				// The user's input mode preference picks between pan and zoom, but it must not
				// re-enable a wheel the app disabled with `wheelBehavior: 'none'`.
				if (inputMode !== null && wheelBehavior !== 'none') {
					wheelBehavior = inputMode === 'trackpad' ? 'pan' : 'zoom'
				}

				if (wheelBehavior !== 'none') {
					// Stop any camera animation
					this.editor.stopCameraAnimation()
					// Stop following any following user
					if (instanceState.followingUserId) {
						this.editor.stopFollowingUser()
					}

					const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.editor.getCamera())
					const { x: dx, y: dy, z: dz = 0 } = info.delta

					let behavior = wheelBehavior

					// If the camera behavior is "zoom" and the ctrl key is pressed, then pan;
					// If the camera behavior is "pan" and the ctrl key is not pressed, then zoom
					if (info.ctrlKey) behavior = wheelBehavior === 'pan' ? 'zoom' : 'pan'

					switch (behavior) {
						case 'zoom': {
							// Zoom in on current screen point using the wheel delta
							const { x, y } = this.editor.inputs.getCurrentScreenPoint()
							let delta = dz

							// If we're forcing zoom, then we need to do the wheel normalization math here
							if (wheelBehavior === 'zoom') {
								if (Math.abs(dy) > 10) {
									delta = (10 * Math.sign(dy)) / 100
								} else {
									delta = dy / 100
								}
							}

							// because we can't for sure detect whether a user is using a mouse or a trackpad,
							// we need to check the input mode preference, and only invert the zoom direction
							// if the user has specifically set it to a mouse.
							const isZoomDirectionInverted =
								(this.editor.user.getUserPreferences().isZoomDirectionInverted &&
									inputMode === 'mouse') ??
								false
							const deltaValue = delta ?? 0
							const finalDelta = isZoomDirectionInverted ? -deltaValue : deltaValue

							const zoom = cz + finalDelta * zoomSpeed * cz
							this.editor._camera._setCamera(
								new Vec(cx + x / zoom - x / cz, cy + y / zoom - y / cz, zoom),
								{
									immediate: true,
								}
							)
							this.maybeTrackPerformance('Zooming')
							this.editor.plugins
								.getOptional(performanceCapability)
								?._notifyCameraOperation('zooming')
							this.editor.root.handleEvent(info)
							this.editor.emit('event', info)
							return
						}
						case 'pan': {
							// Pan the camera based on the wheel delta
							this.editor._camera._setCamera(
								new Vec(cx + (dx * panSpeed) / cz, cy + (dy * panSpeed) / cz, cz),
								{
									immediate: true,
								}
							)
							this.maybeTrackPerformance('Panning')
							this.editor.plugins
								.getOptional(performanceCapability)
								?._notifyCameraOperation('panning')
							this.editor.root.handleEvent(info)
							this.editor.emit('event', info)
							return
						}
					}
				}
				break
			}
			case 'pointer': {
				// Ignore pointer events while we're pinching
				if (inputs.getIsPinching()) return

				const { isPen } = info
				const { isPenMode } = instanceState

				// In pen mode, reject non-pen input (a resting palm) before it touches any
				// state: otherwise updateFromEvent moves the origin point out from under the
				// pen's drag, and a palm pointer_up clears the pen's isPointing/isDragging.
				if (isPenMode && !isPen) return

				this.editor.inputs.updateFromEvent(info)

				switch (info.name) {
					case 'pointer_down': {
						// A pointer down starts a new interaction, so flush any modifier that's
						// still lingering in its release-debounce window: treat it as released now.
						this._releaseDebouncedModifiers()

						if (!this.editor.inputs.getIsPanning()) {
							// Start a long press timeout
							this._longPressTimeout = this.editor.timers.setTimeout(() => {
								const vsb = this.editor.getViewportScreenBounds()
								this.editor.dispatch({
									...info,
									// important! non-obvious!! the screenpoint was adjusted using the
									// viewport bounds, and will be again when this event is handled...
									// so we need to counter-adjust from the stored value so that the
									// new value is set correctly.
									point: this.editor.inputs.getOriginScreenPoint().clone().addXY(vsb.x, vsb.y),
									name: 'long_press',
								})
							}, this.editor.options.longPressDurationMs)
						}

						// Save the selected ids at the start of an interaction so a pinch can
						// restore the pre-gesture selection. Only capture on the first pointer:
						// on touch, the second finger's pointer_down arrives after the first
						// has already changed the selection, and we want the earlier snapshot.
						// Cleared on pointer_up / pinch_end.
						if (!this._didCaptureSelectionAtPointerDown) {
							this._selectedShapeIdsAtPointerDown = this.editor.getSelectedShapeIds()
							this._didCaptureSelectionAtPointerDown = true
						}

						// Firefox bug fix...
						// If it's a left-mouse-click, we store the pointer id for later user
						if (info.button === LEFT_MOUSE_BUTTON) this.editor.capturedPointerId = info.pointerId

						// Add the button from the buttons set
						inputs.buttons.add(info.button)

						// Start pointing and stop dragging
						inputs.setIsPointing(true)
						inputs.setIsDragging(false)

						// A camera still animating under a held pointer would shift the page
						// point past the drag threshold and turn a click into a drag (#10706)
						this.editor.stopCameraAnimation()

						// If pen mode is off, turn it on for direct-display pen input only (e.g. Apple
						// Pencil on an iPad or a Surface Pen on a touchscreen). Indirect desktop tablet
						// styluses still draw as pens, but should not auto-enable pen mode.
						if (!isPenMode && info.isPenDirect) {
							this.editor.updateInstanceState({ isPenMode: true })
							// Once pen mode is on, touch input is ignored, so we discard the
							// in-progress touch interaction .
							this.editor.interrupt()
						}

						// On devices with erasers (like the Surface Pen or Wacom Pen), button 5 is the eraser.
						// Guarded on the eraser tool existing: the bare editor can be configured without
						// it, and an unguarded transition would throw and crash the editor.
						if (info.button === STYLUS_ERASER_BUTTON && this.editor.getStateDescendant('eraser')) {
							this._restoreToolId = this.editor.getCurrentToolId()
							this.editor.complete()
							this.editor.setCurrentTool('eraser')
						} else if (info.button === MIDDLE_MOUSE_BUTTON) {
							// Middle mouse pan activates panning unless we're already panning (with spacebar)
							if (!this.editor.inputs.getIsPanning()) {
								this._prevCursor = this.editor.getInstanceState().cursor.type
							}
							this.editor.inputs.setIsPanning(true)
							this.editor.timers.clearTimeout(this._longPressTimeout)
						} else if (
							info.button === RIGHT_MOUSE_BUTTON &&
							this.editor.options.rightClickPanning
						) {
							this.editor.inputs.setIsRightPointing(true)
							this.editor.timers.clearTimeout(this._longPressTimeout)
							return this.editor
						}

						// We might be panning because we did a middle mouse click, or because we're holding spacebar and started a regular click
						// Also stop here, we don't want the state chart to receive the event
						if (this.editor.inputs.getIsPanning()) {
							this.editor.stopCameraAnimation()
							this.editor.setCursor({ type: 'grabbing', rotation: 0 })
							return this.editor
						}

						break
					}
					case 'pointer_move': {
						const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.editor.getCamera())

						// Right-click pointing: waiting to see if this becomes a drag
						if (this.editor.inputs.getIsRightPointing() && !this.editor.inputs.getIsPanning()) {
							const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
							const originScreenPoint = this.editor.inputs.getOriginScreenPoint()
							if (
								Vec.Dist2(originScreenPoint, currentScreenPoint) >
								this.editor.options.dragDistanceSquared
							) {
								// Passed the drag threshold—transition to panning
								this._prevCursor = this.editor.getInstanceState().cursor.type
								this.editor.inputs.setIsPanning(true)
								this.editor.setCursor({ type: 'grabbing', rotation: 0 })
								this.editor.stopCameraAnimation()
								// Apply the initial delta from the pointer down origin
								const offset = Vec.Sub(currentScreenPoint, originScreenPoint)
								this.editor.setCamera(new Vec(cx + offset.x / cz, cy + offset.y / cz, cz), {
									immediate: true,
								})
								this.maybeTrackPerformance('Panning')
							}
							return
						}

						// If we've started panning, then clear any long press timeout
						if (this.editor.inputs.getIsPanning() && this.editor.inputs.getIsPointing()) {
							// Handle spacebar / middle mouse button / right-click panning
							const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
							const previousScreenPoint = this.editor.inputs.getPreviousScreenPoint()
							const offset = Vec.Sub(currentScreenPoint, previousScreenPoint)
							this.editor.setCamera(new Vec(cx + offset.x / cz, cy + offset.y / cz, cz), {
								immediate: true,
							})
							this.maybeTrackPerformance('Panning')
							this.editor.plugins
								.getOptional(performanceCapability)
								?._notifyCameraOperation('panning')
							return
						}

						if (
							inputs.getIsPointing() &&
							!inputs.getIsDragging() &&
							Vec.Dist2(inputs.getOriginPagePoint(), inputs.getCurrentPagePoint()) *
								this.editor.getZoomLevel() >
								(instanceState.isCoarsePointer
									? this.editor.options.coarseDragDistanceSquared
									: this.editor.options.dragDistanceSquared) /
									cz
						) {
							// Start dragging
							inputs.setIsDragging(true)
							this.editor.timers.clearTimeout(this._longPressTimeout)
						}
						break
					}
					case 'pointer_up': {
						// Stop dragging / pointing
						inputs.setIsDragging(false)
						inputs.setIsPointing(false)
						this.editor.timers.clearTimeout(this._longPressTimeout)
						// Remove the button from the buttons set
						inputs.buttons.delete(info.button)

						// Right-click pointing ended without dragging—this is a static
						// right-click, so let it through to the state chart as right_click.
						// Check isPanning first: if we transitioned to panning, isRightPointing
						// is still true but we want the panning cleanup path instead.
						if (this.editor.inputs.getIsRightPointing() && !this.editor.inputs.getIsPanning()) {
							this.editor.inputs.setIsRightPointing(false)
							this._selectedShapeIdsAtPointerDown = []
							this._didCaptureSelectionAtPointerDown = false
							break // fall through to state chart dispatch as right_click
						}

						this.editor.inputs.setIsRightPointing(false)

						// Firefox bug fix...
						// If it's the same pointer that we stored earlier...
						// ... then it's probably still a left-mouse-click!
						if (this.editor.capturedPointerId === info.pointerId) {
							this.editor.capturedPointerId = null
							info.button = 0
						}

						if (inputs.getIsPanning()) {
							if (!inputs.keys.has('Space')) {
								inputs.setIsPanning(false)
								inputs.setIsSpacebarPanning(false)
							}
							const slideDirection = this.editor.inputs.getPointerVelocity()
							const slideSpeed = Math.min(2, slideDirection.len())

							switch (info.button) {
								case LEFT_MOUSE_BUTTON: {
									this.editor.setCursor({ type: 'grab', rotation: 0 })
									break
								}
								case MIDDLE_MOUSE_BUTTON: {
									if (this.editor.inputs.keys.has('Space')) {
										this.editor.setCursor({ type: 'grab', rotation: 0 })
									} else {
										this.editor.setCursor({ type: this._prevCursor, rotation: 0 })
									}
									break
								}
								case RIGHT_MOUSE_BUTTON: {
									if (this.editor.inputs.keys.has('Space')) {
										this.editor.setCursor({ type: 'grab', rotation: 0 })
									} else {
										this.editor.setCursor({ type: this._prevCursor, rotation: 0 })
									}
									// Don't pass right-click panning events to the state chart
									// as it causes unintended shape selection on release
									if (slideSpeed > 0) {
										this.editor.slideCamera({
											speed: slideSpeed,
											direction: { x: slideDirection.x, y: slideDirection.y, z: 0 },
										})
									}
									this._selectedShapeIdsAtPointerDown = []
									this._didCaptureSelectionAtPointerDown = false
									return this.editor
								}
							}

							if (slideSpeed > 0) {
								this.editor.slideCamera({
									speed: slideSpeed,
									direction: { x: slideDirection.x, y: slideDirection.y, z: 0 },
								})
							}
						} else {
							if (
								info.button === STYLUS_ERASER_BUTTON &&
								this.editor.getStateDescendant('eraser')
							) {
								// If we were erasing with a stylus button, restore the tool we were using before we started erasing
								this.editor.complete()
								this.editor.setCurrentTool(this._restoreToolId)
							}
						}

						// Clear the stashed selection so the next pinch captures fresh state.
						// This fixes Safari pinch zoom restoring outdated selections.
						this._selectedShapeIdsAtPointerDown = []
						this._didCaptureSelectionAtPointerDown = false

						break
					}
				}
				break
			}
			case 'keyboard': {
				// Left and right modifier keys are the same key to us. `inputs.keys` stores
				// `code`, so normalize that: a `ShiftRight` left as-is would never match the
				// `ShiftLeft` that nudging checks or that `_releaseShiftKey` clears.
				if (info.code === 'ShiftRight') info.code = 'ShiftLeft'
				if (info.code === 'AltRight') info.code = 'AltLeft'
				if (info.code === 'ControlRight') info.code = 'ControlLeft'
				if (info.code === 'MetaRight') info.code = 'MetaLeft'

				switch (info.name) {
					case 'key_down': {
						// Add the key from the keys set
						inputs.keys.add(info.code)

						if (this.editor.options.spacebarPanning) {
							// If the space key is pressed (but meta / control isn't!) activate panning
							if (info.code === 'Space' && !info.ctrlKey) {
								if (!this.editor.inputs.getIsPanning()) {
									this._prevCursor = instanceState.cursor.type
								}

								this.editor.inputs.setIsPanning(true)
								this.editor.inputs.setIsSpacebarPanning(true)
								this.editor.timers.clearTimeout(this._longPressTimeout)
								this.editor.setCursor({
									type: this.editor.inputs.getIsPointing() ? 'grabbing' : 'grab',
									rotation: 0,
								})
							}

							if (this.editor.inputs.getIsSpacebarPanning()) {
								let offset: Vec | undefined
								switch (info.code) {
									case 'ArrowUp': {
										offset = new Vec(0, -1)
										break
									}
									case 'ArrowRight': {
										offset = new Vec(1, 0)
										break
									}
									case 'ArrowDown': {
										offset = new Vec(0, 1)
										break
									}
									case 'ArrowLeft': {
										offset = new Vec(-1, 0)
										break
									}
								}

								// `_animateToViewport` bypasses `setCamera`, so honor the lock here.
								if (offset && !cameraOptions.isLocked) {
									const bounds = this.editor.getViewportPageBounds()
									const next = bounds.clone().translate(offset.mulV({ x: bounds.w, y: bounds.h }))
									this.editor._camera._animateToViewport(next, { animation: { duration: 320 } })
								}
							}
						}

						break
					}
					case 'key_up': {
						// Remove the key from the keys set
						inputs.keys.delete(info.code)

						if (this.editor.options.spacebarPanning) {
							// If we've lifted the space key,
							if (info.code === 'Space') {
								if (this.editor.inputs.buttons.has(MIDDLE_MOUSE_BUTTON)) {
									// If we're still middle dragging, continue panning
								} else {
									// otherwise, stop panning
									this.editor.inputs.setIsPanning(false)
									this.editor.inputs.setIsSpacebarPanning(false)
									this.editor.setCursor({ type: this._prevCursor, rotation: 0 })
								}
							}
						}
						break
					}
					case 'key_repeat': {
						// A repeat is the only positive evidence that a key is still physically
						// down, so it is also the only way one we lost track of can get back in.
						// A key still held when Meta is released is dropped there on the
						// assumption macOS ate its keyup; this is what corrects that.
						inputs.keys.add(info.code)
						break
					}
				}
				break
			}
		}

		// Correct the info name for right / middle clicks
		if (info.type === 'pointer') {
			if (info.button === MIDDLE_MOUSE_BUTTON) {
				info.name = 'middle_click'
			} else if (info.button === RIGHT_MOUSE_BUTTON) {
				info.name = 'right_click'
			}

			// The context menu is a select-tool surface: every item acts on the
			// current selection. Route a right-click through the select tool before
			// the event reaches the state chart, so the select tool's idle resolves
			// the selection at the click point (select the shape under the pointer,
			// or clear it) no matter which tool was active. Without this, opening the
			// menu from another tool leaves a stale selection that doesn't match the
			// click (#8828). Guarded on the select tool existing, since the bare
			// editor can be configured without it.
			if (
				info.name === 'right_click' &&
				this.editor.getCurrentToolId() !== 'select' &&
				this.editor.getStateDescendant('select')
			) {
				this.editor.setCurrentTool('select')
			}

			// Send the event to the click manager. In pen mode only pen clicks count; otherwise
			// every pointer does, including an indirect tablet stylus (a pen that never enables
			// pen mode), which would otherwise never produce double-click events.
			const { isPenMode } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
			if (!isPenMode || info.isPen) {
				// The click manager may return a new event, i.e. a double click event
				// depending on the event coming in and its own state. If the event has
				// changed then hand both events to the statechart
				const clickInfo = this._clickManager.handlePointerEvent(info)
				if (info.name !== clickInfo.name) {
					this.editor.root.handleEvent(info)
					this.editor.emit('event', info)
					this.editor.root.handleEvent(clickInfo)
					this.editor.emit('event', clickInfo)
					return
				}
			}
		}

		// Send the event to the statechart. It will be handled by all
		// active states, starting at the root.
		this.editor.root.handleEvent(info)
		this.editor.emit('event', info)

		// close open menus at the very end on pointer down! after everything else! συντελείας τοῦ κώδικα!!
		if (info.type === 'pointer' && info.name === 'pointer_down') {
			this.editor.menus.clearOpenMenus()
		}

		return this.editor
	}

	/** @internal */
	private maybeTrackPerformance(name: string) {
		if (debugFlags.measurePerformance.get()) {
			if (this.performanceTracker.isStarted()) {
				this.editor.timers.clearTimeout(this.performanceTrackerTimeout)
			} else {
				this.performanceTracker.start(name)
			}
			this.performanceTrackerTimeout = this.editor.timers.setTimeout(() => {
				this.performanceTracker.stop()
			}, 50)
		}
	}
}
