import { unsafe__withoutCapture } from '@tldraw/state'
import { TLCursorType, TLINSTANCE_ID, TLShapeId } from '@tldraw/tlschema'
import { PerformanceTracker, bind } from '@tldraw/utils'
import {
	LEFT_MOUSE_BUTTON,
	MIDDLE_MOUSE_BUTTON,
	RIGHT_MOUSE_BUTTON,
	STYLUS_ERASER_BUTTON,
} from '../../../constants'
import { Vec } from '../../../primitives/Vec'
import { debugFlags } from '../../../utils/debug-flags'
import type { Editor } from '../../Editor'
import {
	type ModifierKey,
	SHIFT_KEY,
	ALT_KEY,
	CTRL_KEY,
	META_KEY,
	MODIFIER_KEYS,
} from '../../editorHelpers'
import { TLEventInfo, TLPointerEventInfo } from '../../types/event-types'
import { TLUpdatePointerOptions } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * Input event dispatch: the per-tick event queue, pointer, keyboard, wheel and pinch handling, modifier key debouncing, and crash reporting.
 *
 * @public
 */
export class EventsManager extends EditorManager {
	/** @internal */
	createErrorAnnotations(origin: string, willCrashApp: boolean | 'unknown') {
		try {
			const editingShapeId = this.editor.getEditingShapeId()
			return {
				tags: {
					origin: origin,
					willCrashApp,
				},
				extras: {
					activeStateNode: this.editor.root.getPath(),
					selectedShapes: this.editor.getSelectedShapes().map((s) => {
						const { props, ...rest } = s
						const { text: _text, richText: _richText, ...restProps } = props as any
						return {
							...rest,
							props: restProps,
						}
					}),
					selectionCount: this.editor.getSelectedShapes().length,
					editingShape: editingShapeId ? this.editor.getShape(editingShapeId) : undefined,
					inputs: this.editor.inputs.toJson(),
					pageState: this.editor.getCurrentPageState(),
					instanceState: this.editor.getInstanceState(),
					collaboratorCount: this.editor.getCollaboratorsOnCurrentPage().length,
				},
			}
		} catch {
			return {
				tags: {
					origin: origin,
					willCrashApp,
				},
				extras: {},
			}
		}
	}

	/** @internal */
	_crashingError: unknown | null = null

	/**
	 * We can't use an `atom` here because there's a chance that when `crashAndReportError` is called,
	 * we're in a transaction that's about to be rolled back due to the same error we're currently
	 * reporting.
	 *
	 * Instead, to listen to changes to this value, you need to listen to editor's `crash` event.
	 *
	 * @internal
	 */
	getCrashingError() {
		return this._crashingError
	}

	/** @internal */
	crash(error: unknown): Editor {
		this._crashingError = error
		this.editor.store.markAsPossiblyCorrupted()
		this.editor.emit('crash', { error })
		return this.editor
	}

	/**
	 * Dispatch a cancel event.
	 *
	 * @example
	 * ```ts
	 * editor.cancel()
	 * ```
	 *
	 * @public
	 */
	cancel(): Editor {
		this.editor.dispatch({ type: 'misc', name: 'cancel' })
		return this.editor
	}

	/**
	 * Dispatch an interrupt event.
	 *
	 * @example
	 * ```ts
	 * editor.interrupt()
	 * ```
	 *
	 * @public
	 */
	interrupt(): Editor {
		this.editor.dispatch({ type: 'misc', name: 'interrupt' })
		return this.editor
	}

	/**
	 * Dispatch a complete event.
	 *
	 * @example
	 * ```ts
	 * editor.complete()
	 * ```
	 *
	 * @public
	 */
	complete(): Editor {
		this.editor.dispatch({ type: 'misc', name: 'complete' })
		return this.editor
	}

	/**
	 * Dispatch a pointer move event in the current position of the pointer. This is useful when
	 * external circumstances have changed (e.g. the camera moved or a shape was moved) and you want
	 * the current interaction to respond to that change.
	 *
	 * @example
	 * ```ts
	 * editor.updatePointer()
	 * ```
	 *
	 * @param options - The options for updating the pointer.
	 * @returns The editor instance.
	 * @public
	 */
	updatePointer(options?: TLUpdatePointerOptions): Editor {
		const event: TLPointerEventInfo = {
			type: 'pointer',
			target: 'canvas',
			name: 'pointer_move',
			point:
				options?.point ??
				// weird but true: what `inputs` calls screen-space is actually viewport space. so
				// we need to convert back into true screen space first. we should fix this...
				Vec.Add(
					this.editor.inputs.getCurrentScreenPoint(),
					this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
				),
			pointerId: options?.pointerId ?? 0,
			button: options?.button ?? 0,
			isPen: options?.isPen ?? this.editor.inputs.getIsPen(),
			shiftKey: options?.shiftKey ?? this.editor.inputs.getShiftKey(),
			altKey: options?.altKey ?? this.editor.inputs.getAltKey(),
			ctrlKey: options?.ctrlKey ?? this.editor.inputs.getCtrlKey(),
			metaKey: options?.metaKey ?? this.editor.inputs.getMetaKey(),
			accelKey: false,
		}

		// needs to be calculated second
		event.accelKey = options?.accelKey ?? this.editor.inputs.getAccelKey()

		if (options?.immediate) {
			this.editor._flushEventForTick(event)
		} else {
			this.editor.dispatch(event)
		}

		return this.editor
	}

	/**
	 * Prevent a double click event from firing the next time the user clicks
	 *
	 * @public
	 */
	cancelDoubleClick() {
		this.editor._clickManager.cancelDoubleClickTimeout()
	}

	/**
	 * The previous cursor. Used for restoring the cursor after pan events.
	 *
	 * @internal
	 */
	_prevCursor: TLCursorType = 'default'

	/** @internal */
	_modifierKeyTimeouts = new Map<ModifierKey['key'], any>()

	/**
	 * Release a modifier: clear its debounce timer id, drop the atom, and dispatch a synthetic
	 * `key_up` so `inputs.keys` and tool `onKeyUp` handlers update. Runs both as the 150ms
	 * debounce timer callback and when a pointer down flushes it.
	 * @internal
	 */
	_releaseModifierKey(modifier: ModifierKey) {
		this._modifierKeyTimeouts.delete(modifier.key)
		modifier.set(this.editor.inputs, false)
		this.editor.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: modifier.key,
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: this.editor.inputs.getAccelKey(),
			code: modifier.code,
		})
	}

	/**
	 * Release the shift modifier. See `EventsManager._releaseModifierKey`.
	 * @internal
	 */
	@bind
	_releaseShiftKey() {
		this._releaseModifierKey(SHIFT_KEY)
	}

	/**
	 * Release the alt modifier. See `EventsManager._releaseModifierKey`.
	 * @internal
	 */
	@bind
	_releaseAltKey() {
		this._releaseModifierKey(ALT_KEY)
	}

	/**
	 * Release the ctrl modifier. See `EventsManager._releaseModifierKey`.
	 * @internal
	 */
	@bind
	_releaseCtrlKey() {
		this._releaseModifierKey(CTRL_KEY)
	}

	/**
	 * Release the meta modifier. See `EventsManager._releaseModifierKey`.
	 * @internal
	 */
	@bind
	_releaseMetaKey() {
		this._releaseModifierKey(META_KEY)
	}

	/**
	 * Flush any modifier still sitting in its 150ms release-debounce window, so a new
	 * interaction (a pointer down) starts with correct modifier state instead of a
	 * just-released key still being counted as held. A pending timer is exactly
	 * "released but still counted as held"; a genuinely-held modifier has no timer
	 * and is left alone.
	 *
	 * Each modifier is released through the same path its timer would have taken, which
	 * dispatches the synthetic `key_up` so stale codes (e.g. `ShiftLeft`) leave
	 * `inputs.keys` and tool `onKeyUp` handlers run. We clear every pending modifier atom
	 * and timer *first*, then dispatch: a synthetic `key_up` reports all currently-held
	 * modifiers, so releasing them one at a time would make each event re-confirm the
	 * not-yet-released ones and cancel their flush.
	 * @internal
	 */
	_releaseDebouncedModifiers() {
		const pending = MODIFIER_KEYS.filter((modifier) => this._modifierKeyTimeouts.has(modifier.key))

		for (const modifier of pending) {
			clearTimeout(this._modifierKeyTimeouts.get(modifier.key))
			this._modifierKeyTimeouts.delete(modifier.key)
			modifier.set(this.editor.inputs, false)
		}

		for (const modifier of pending) {
			modifier.release(this.editor)
		}
	}

	/** @internal */
	_restoreToolId = 'select'

	/** @internal */
	_didPinch = false

	/** @internal */
	_selectedShapeIdsAtPointerDown: TLShapeId[] = []

	/**
	 * Whether `_selectedShapeIdsAtPointerDown` holds a pre-gesture selection
	 * captured by a `pointer_down` (the touch path) that a following pinch
	 * should restore. False when no pointer_down preceded the pinch (the
	 * Safari trackpad path uses gesture events), in which case `pinch_start`
	 * captures the live selection instead.
	 * @internal
	 */
	_didCaptureSelectionAtPointerDown = false

	/** @internal */
	_longPressTimeout = -1 as any

	/** @internal */
	readonly performanceTracker = new PerformanceTracker()

	/** @internal */
	performanceTrackerTimeout = -1 as any

	/** @internal */
	handledEvents = new WeakSet<Event>()

	/**
	 * In tldraw, events are sometimes handled by multiple components. For example, the shapes might
	 * have events, but the canvas handles events too. The way that the canvas handles events can
	 * interfere with the with the shapes event handlers - for example, it calls `.preventDefault()`
	 * on `pointerDown`, which also prevents `click` events from firing on the shapes.
	 *
	 * You can use `.stopPropagation()` to prevent the event from propagating to the rest of the
	 * DOM, but that can impact non-tldraw event handlers set up elsewhere. By using
	 * `markEventAsHandled`, you'll stop other parts of tldraw from handling the event without
	 * impacting other, non-tldraw event handlers. See also {@link EditorForwarders.wasEventAlreadyHandled}.
	 *
	 * @public
	 */
	markEventAsHandled(e: Event | { nativeEvent: Event }) {
		const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e
		this.handledEvents.add(nativeEvent)
	}

	/**
	 * Checks if an event has already been handled. See {@link EditorForwarders.markEventAsHandled}.
	 *
	 * @public
	 */
	wasEventAlreadyHandled(e: Event | { nativeEvent: Event }) {
		const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e
		return this.handledEvents.has(nativeEvent)
	}

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

	_pendingEventsForNextTick: TLEventInfo[] = []

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
			this.editor.scribbles.tick(elapsed)
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

		for (const modifier of MODIFIER_KEYS) {
			const timeout = this._modifierKeyTimeouts.get(modifier.key)
			const isPressed = info[modifier.flag]
			if (isPressed && !(modifier.ignoresKeyUp && info.name === 'key_up')) {
				clearTimeout(timeout)
				this._modifierKeyTimeouts.delete(modifier.key)
				modifier.set(inputs, true)
			} else if (!isPressed && modifier.get(inputs) && timeout === undefined) {
				this._modifierKeyTimeouts.set(
					modifier.key,
					this.editor.timers.setTimeout(() => modifier.release(this.editor), 150)
				)
			}
		}

		if (!inputs.getIsPointing()) {
			inputs.setIsDragging(false)
		}

		const instanceState = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const pageState = this.editor.store.get(this.editor._getCurrentPageStateId())!
		const cameraOptions = this.editor.camera._cameraOptions.__unsafe__getWithoutCapture()!

		switch (type) {
			case 'pinch': {
				if (cameraOptions.isLocked) return
				clearTimeout(this._longPressTimeout)
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
						this.editor.camera._setCamera(
							new Vec(
								cx + (dx * panSpeed) / cz - x / cz + x / z,
								cy + (dy * panSpeed) / cz - y / cz + y / z,
								z
							),
							{ immediate: true }
						)

						this.editor.performance._notifyCameraOperation('zooming')
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

				// If the user has set their input mode preference, then use that to determine the wheel behavior
				if (inputMode !== null) {
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
							this.editor.camera._setCamera(
								new Vec(cx + x / zoom - x / cz, cy + y / zoom - y / cz, zoom),
								{
									immediate: true,
								}
							)
							this.maybeTrackPerformance('Zooming')
							this.editor.performance._notifyCameraOperation('zooming')
							this.editor.root.handleEvent(info)
							this.editor.emit('event', info)
							return
						}
						case 'pan': {
							// Pan the camera based on the wheel delta
							this.editor.camera._setCamera(
								new Vec(cx + (dx * panSpeed) / cz, cy + (dy * panSpeed) / cz, cz),
								{
									immediate: true,
								}
							)
							this.maybeTrackPerformance('Panning')
							this.editor.performance._notifyCameraOperation('panning')
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

				this.editor.inputs.updateFromEvent(info)
				const { isPen } = info
				const { isPenMode } = instanceState

				switch (info.name) {
					case 'pointer_down': {
						// If we're in pen mode and the input is not a pen type, then stop here
						if (isPenMode && !isPen) return

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

						// On devices with erasers (like the Surface Pen or Wacom Pen), button 5 is the eraser
						if (info.button === STYLUS_ERASER_BUTTON) {
							this._restoreToolId = this.editor.getCurrentToolId()
							this.editor.complete()
							this.editor.setCurrentTool('eraser')
						} else if (info.button === MIDDLE_MOUSE_BUTTON) {
							// Middle mouse pan activates panning unless we're already panning (with spacebar)
							if (!this.editor.inputs.getIsPanning()) {
								this._prevCursor = this.editor.getInstanceState().cursor.type
							}
							this.editor.inputs.setIsPanning(true)
							clearTimeout(this._longPressTimeout)
						} else if (
							info.button === RIGHT_MOUSE_BUTTON &&
							this.editor.options.rightClickPanning
						) {
							this.editor.inputs.setIsRightPointing(true)
							clearTimeout(this._longPressTimeout)
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
						// If the user is in pen mode, but the pointer is not a pen, stop here.
						if (!isPen && isPenMode) return

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
							this.editor.performance._notifyCameraOperation('panning')
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
							clearTimeout(this._longPressTimeout)
						}
						break
					}
					case 'pointer_up': {
						// Stop dragging / pointing
						inputs.setIsDragging(false)
						inputs.setIsPointing(false)
						clearTimeout(this._longPressTimeout)
						// Remove the button from the buttons set
						inputs.buttons.delete(info.button)

						// If we're in pen mode and we're not using a pen, stop here
						if (instanceState.isPenMode && !isPen) return

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
							if (info.button === STYLUS_ERASER_BUTTON) {
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
								clearTimeout(this._longPressTimeout)
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

								if (offset) {
									const bounds = this.editor.getViewportPageBounds()
									const next = bounds.clone().translate(offset.mulV({ x: bounds.w, y: bounds.h }))
									this.editor._animateToViewport(next, { animation: { duration: 320 } })
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
						// noop
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

			// If a left click pointer event, send the event to the click manager.
			const { isPenMode } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
			if (info.isPen === isPenMode) {
				// The click manager may return a new event, i.e. a double click event
				// depending on the event coming in and its own state. If the event has
				// changed then hand both events to the statechart
				const clickInfo = this.editor._clickManager.handlePointerEvent(info)
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
	maybeTrackPerformance(name: string) {
		if (debugFlags.measurePerformance.get()) {
			if (this.performanceTracker.isStarted()) {
				clearTimeout(this.performanceTrackerTimeout)
			} else {
				this.performanceTracker.start(name)
			}
			this.performanceTrackerTimeout = this.editor.timers.setTimeout(() => {
				this.performanceTracker.stop()
			}, 50)
		}
	}
}
