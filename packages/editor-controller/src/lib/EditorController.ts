import {
	Editor,
	Mat,
	PageRecordType,
	ROTATE_CORNER_TO_SELECTION_CORNER,
	RotateCorner,
	SelectionHandle,
	TLArrowShape,
	TLContent,
	TLKeyboardEventInfo,
	TLPinchEventInfo,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLWheelEventInfo,
	Vec,
	VecLike,
	compact,
	createShapeId,
	isAccelKey,
	rotateSelectionHandle,
	tlenv,
} from '@tldraw/editor'

/** Options for pointer events. Either partial pointer event info or a shape ID to target. @public */
export type PointerEventInit = Partial<TLPointerEventInfo> | TLShapeId

/** Modifier keys for events. @public */
export type EventModifiers = Partial<Pick<TLPointerEventInfo, 'shiftKey' | 'ctrlKey' | 'altKey'>>

/**
 * EditorController wraps an Editor instance and provides an imperative API for driving it
 * programmatically. Useful for scripting, automation, REPL usage, and testing.
 *
 * All methods use only public Editor APIs and return `this` for fluent chaining.
 *
 * @public
 */
export class EditorController {
	/** The underlying Editor instance. */
	constructor(public readonly editor: Editor) {
		this.editor.sideEffects.registerAfterCreateHandler('shape', (record) => {
			this._lastCreatedShapes.push(record)
		})
	}

	/** Local clipboard content. Used by copy, cut, and paste. */
	clipboard: TLContent | null = null

	private _lastCreatedShapes: TLShape[] = []

	/**
	 * Get the last created shapes.
	 * @param count - The number of shapes to get.
	 */
	getLastCreatedShapes(count = 1) {
		return this._lastCreatedShapes.slice(-count).map((s) => this.editor.getShape(s)!)
	}

	/**
	 * Get the last created shape.
	 */
	getLastCreatedShape<T extends TLShape>() {
		const lastShape = this._lastCreatedShapes[this._lastCreatedShapes.length - 1] as T
		return this.editor.getShape<T>(lastShape)!
	}

	/* ---------------------- IDs ---------------------- */

	/**
	 * Creates a shape ID from a string.
	 * @param id - The string to convert to a shape ID.
	 */
	testShapeID(id: string) {
		return createShapeId(id)
	}

	/**
	 * Creates a page ID from a string.
	 * @param id - The string to convert to a page ID.
	 */
	testPageID(id: string) {
		return PageRecordType.createId(id)
	}

	/* ------------------- Clipboard ------------------- */

	/**
	 * Copies the given shapes to the controller clipboard. Defaults to the current selection.
	 * @param ids - Shape IDs to copy. Defaults to the current selection.
	 */
	copy(ids = this.editor.getSelectedShapeIds()) {
		if (ids.length > 0) {
			const content = this.editor.getContentFromCurrentPage(ids)
			if (content) {
				this.clipboard = content
			}
		}
		return this
	}

	/**
	 * Cuts the given shapes (copy to clipboard, then delete). Defaults to the current selection.
	 * @param ids - Shape IDs to cut. Defaults to the current selection.
	 */
	cut(ids = this.editor.getSelectedShapeIds()) {
		if (ids.length > 0) {
			const content = this.editor.getContentFromCurrentPage(ids)
			if (content) {
				this.clipboard = content
			}
			this.editor.deleteShapes(ids)
		}
		return this
	}

	/**
	 * Pastes content from the controller clipboard. If shift is held, uses current pointer. Otherwise uses the given point.
	 * @param point - Page coordinates for paste location. If omitted and shift is not held, placement may vary.
	 */
	paste(point?: VecLike) {
		if (this.clipboard !== null) {
			const p = this.editor.inputs.getShiftKey() ? this.editor.inputs.getCurrentPagePoint() : point

			this.editor.markHistoryStoppingPoint('pasting')
			this.editor.putContentOntoCurrentPage(this.clipboard, {
				point: p,
				select: true,
			})
		}
		return this
	}

	/* ------------------- Queries ------------------- */

	/** Returns the center of the viewport in page coordinates. */
	getViewportPageCenter() {
		return this.editor.getViewportPageBounds().center
	}

	/** Returns the center of the current selection in page coordinates, or null if nothing is selected. */
	getSelectionPageCenter() {
		const selectionRotation = this.editor.getSelectionRotation()
		const selectionBounds = this.editor.getSelectionRotatedPageBounds()
		if (!selectionBounds) return null
		return Vec.RotWith(selectionBounds.center, selectionBounds.point, selectionRotation)
	}

	/**
	 * Returns the center of a shape in page coordinates, or null if the shape has no page transform.
	 * @param shape - The shape to get the center of.
	 */
	getPageCenter(shape: TLShape) {
		const pageTransform = this.editor.getShapePageTransform(shape.id)
		if (!pageTransform) return null
		const center = this.editor.getShapeGeometry(shape).bounds.center
		return Mat.applyToPoint(pageTransform, center)
	}

	/**
	 * Returns the rotation of a shape in page space by ID, in radians.
	 * @param id - The shape ID.
	 */
	getPageRotationById(id: TLShapeId): number {
		const pageTransform = this.editor.getShapePageTransform(id)
		if (pageTransform) {
			return Mat.Decompose(pageTransform).rotation
		}
		return 0
	}

	/**
	 * Returns the rotation of a shape in page space, in radians.
	 * @param shape - The shape to get the rotation of.
	 */
	getPageRotation(shape: TLShape) {
		return this.getPageRotationById(shape.id)
	}

	/**
	 * Returns all arrow shapes bound to the given shape.
	 * @param shapeId - The shape ID to find arrows bound to.
	 */
	getArrowsBoundTo(shapeId: TLShapeId) {
		const ids = new Set(this.editor.getBindingsToShape(shapeId, 'arrow').map((b) => b.fromId))
		return compact(Array.from(ids, (id) => this.editor.getShape<TLArrowShape>(id)))
	}

	/* --------------- Event building --------------- */

	/**
	 * Builds a TLPointerEventInfo object for input simulation.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	private getPointerEventInfo(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	): TLPointerEventInfo {
		if (typeof options === 'string') {
			options = { target: 'shape', shape: this.editor.getShape(options) }
		} else if (options === undefined) {
			options = { target: 'canvas' }
		}
		return {
			name: 'pointer_down',
			type: 'pointer',
			pointerId: 1,
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: isAccelKey({ ...this.editor.inputs.toJson(), ...modifiers }),
			point: { x, y, z: null },
			button: 0,
			isPen: false,
			...options,
			...modifiers,
		} as TLPointerEventInfo
	}

	/**
	 * Builds a TLKeyboardEventInfo object for input simulation.
	 * @param key - The key being pressed.
	 * @param name - The event name (key_down, key_up, key_repeat).
	 * @param options - Partial event info overrides.
	 */
	private getKeyboardEventInfo(
		key: string,
		name: TLKeyboardEventInfo['name'],
		options = {} as Partial<Exclude<TLKeyboardEventInfo, 'point'>>
	): TLKeyboardEventInfo {
		return {
			shiftKey: key === 'Shift',
			ctrlKey: key === 'Control' || key === 'Meta',
			altKey: key === 'Alt',
			metaKey: key === 'Meta',
			accelKey: tlenv.isDarwin ? key === 'Meta' : key === 'Control' || key === 'Meta',
			...options,
			name,
			code:
				key === 'Shift'
					? 'ShiftLeft'
					: key === 'Alt'
						? 'AltLeft'
						: key === 'Control'
							? 'CtrlLeft'
							: key === 'Meta'
								? 'MetaLeft'
								: key === ' '
									? 'Space'
									: key === 'Enter' ||
										  key === 'ArrowRight' ||
										  key === 'ArrowLeft' ||
										  key === 'ArrowUp' ||
										  key === 'ArrowDown'
										? key
										: 'Key' + key[0].toUpperCase() + key.slice(1),
			type: 'keyboard',
			key,
		}
	}

	/* --------------- Input events --------------- */

	/**
	 * Emits tick events to advance the editor by the given number of frames (default 1).
	 * @param count - Number of tick events to emit. Defaults to 1.
	 */
	forceTick(count = 1) {
		for (let i = 0; i < count; i++) {
			this.editor.emit('tick', 16)
		}
		return this
	}

	/**
	 * Dispatches a pointer move event at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	pointerMove(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_move',
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a pointer down event at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	pointerDown(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_down',
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a pointer up event at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	pointerUp(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_up',
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a pointer down followed by pointer up at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	click(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.pointerDown(x, y, options, modifiers)
		this.pointerUp(x, y, options, modifiers)
		return this
	}

	/**
	 * Dispatches a right-click (button 2) down and up at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	rightClick(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_down',
			button: 2,
		})
		this.forceTick()
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			name: 'pointer_up',
			button: 2,
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a double-click sequence at the given screen coordinates.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param options - Target shape/selection or partial event info.
	 * @param modifiers - Override shift, ctrl, or alt key state.
	 */
	doubleClick(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		options?: PointerEventInit,
		modifiers?: EventModifiers
	) {
		this.pointerDown(x, y, options, modifiers)
		this.pointerUp(x, y, options, modifiers)
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			type: 'click',
			name: 'double_click',
			phase: 'down',
		})
		this.editor.dispatch({
			...this.getPointerEventInfo(x, y, options, modifiers),
			type: 'click',
			name: 'double_click',
			phase: 'up',
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a key down followed by key up for the given key.
	 * @param key - The key to press (e.g. 'a', 'Enter', 'Shift').
	 * @param options - Partial keyboard event overrides.
	 */
	keyPress(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.keyDown(key, options)
		this.keyUp(key, options)
		return this
	}

	/**
	 * Dispatches a key down event for the given key.
	 * @param key - The key to press (e.g. 'a', 'Enter', 'Shift').
	 * @param options - Partial keyboard event overrides.
	 */
	keyDown(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.editor.dispatch({ ...this.getKeyboardEventInfo(key, 'key_down', options) })
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a key repeat event for the given key.
	 * @param key - The key that is repeating (e.g. 'a', 'ArrowDown').
	 * @param options - Partial keyboard event overrides.
	 */
	keyRepeat(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.editor.dispatch({ ...this.getKeyboardEventInfo(key, 'key_repeat', options) })
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a key up event for the given key.
	 * @param key - The key to release (e.g. 'a', 'Enter', 'Shift').
	 * @param options - Partial keyboard event overrides.
	 */
	keyUp(key: string, options = {} as Partial<Omit<TLKeyboardEventInfo, 'key'>>) {
		this.editor.dispatch({
			...this.getKeyboardEventInfo(key, 'key_up', {
				shiftKey: this.editor.inputs.getShiftKey() && key !== 'Shift',
				ctrlKey: this.editor.inputs.getCtrlKey() && !(key === 'Control' || key === 'Meta'),
				altKey: this.editor.inputs.getAltKey() && key !== 'Alt',
				metaKey: this.editor.inputs.getMetaKey() && key !== 'Meta',
				...options,
			}),
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a wheel event with the given delta values.
	 * @param dx - Horizontal scroll delta.
	 * @param dy - Vertical scroll delta.
	 * @param options - Partial wheel event overrides.
	 */
	wheel(dx: number, dy: number, options = {} as Partial<Omit<TLWheelEventInfo, 'delta'>>) {
		const currentScreenPoint = this.editor.inputs.getCurrentScreenPoint()
		this.editor.dispatch({
			type: 'wheel',
			name: 'wheel',
			point: new Vec(currentScreenPoint.x, currentScreenPoint.y),
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: isAccelKey(this.editor.inputs),
			...options,
			delta: { x: dx, y: dy },
		})
		this.forceTick(2)
		return this
	}

	/**
	 * Pans the camera by the given offset (in page coordinates). Does nothing if camera is locked.
	 * @param offset - The pan delta (x, y) in page coordinates.
	 */
	pan(offset: VecLike) {
		const { isLocked, panSpeed } = this.editor.getCameraOptions()
		if (isLocked) return this
		const { x: cx, y: cy, z: cz } = this.editor.getCamera()
		this.editor.setCamera(
			new Vec(cx + (offset.x * panSpeed) / cz, cy + (offset.y * panSpeed) / cz, cz),
			{ immediate: true }
		)
		return this
	}

	/**
	 * Dispatches a pinch start event.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param z - Pinch scale/factor.
	 * @param dx - Delta x for pinch.
	 * @param dy - Delta y for pinch.
	 * @param dz - Delta z for pinch.
	 * @param options - Partial pinch event overrides.
	 */
	pinchStart(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.editor.dispatch({
			type: 'pinch',
			name: 'pinch_start',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: isAccelKey(this.editor.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		})
		this.forceTick()
		return this
	}

	/**
	 * Dispatches a pinch move event (pinch_to).
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param z - Pinch scale/factor.
	 * @param dx - Delta x for pinch.
	 * @param dy - Delta y for pinch.
	 * @param dz - Delta z for pinch.
	 * @param options - Partial pinch event overrides.
	 */
	pinchTo(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.editor.dispatch({
			type: 'pinch',
			name: 'pinch_start',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: isAccelKey(this.editor.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		})
		return this
	}

	/**
	 * Dispatches a pinch end event.
	 * @param x - Screen x coordinate. Defaults to current pointer.
	 * @param y - Screen y coordinate. Defaults to current pointer.
	 * @param z - Pinch scale/factor.
	 * @param dx - Delta x for pinch.
	 * @param dy - Delta y for pinch.
	 * @param dz - Delta z for pinch.
	 * @param options - Partial pinch event overrides.
	 */
	pinchEnd(
		x = this.editor.inputs.getCurrentScreenPoint().x,
		y = this.editor.inputs.getCurrentScreenPoint().y,
		z: number,
		dx: number,
		dy: number,
		dz: number,
		options = {} as Partial<Omit<TLPinchEventInfo, 'point' | 'delta' | 'offset'>>
	) {
		this.editor.dispatch({
			type: 'pinch',
			name: 'pinch_end',
			shiftKey: this.editor.inputs.getShiftKey(),
			ctrlKey: this.editor.inputs.getCtrlKey(),
			altKey: this.editor.inputs.getAltKey(),
			metaKey: this.editor.inputs.getMetaKey(),
			accelKey: isAccelKey(this.editor.inputs),
			...options,
			point: { x, y, z },
			delta: { x: dx, y: dy, z: dz },
		})
		this.forceTick()
		return this
	}

	/* --------------- Interaction helpers --------------- */

	/**
	 * Simulates rotating the current selection by the given angle in radians via the rotation handle.
	 * @param angleRadians - Rotation angle in radians.
	 * @param options - Optional handle and shiftKey. handle defaults to 'top_left_rotate'.
	 */
	rotateSelection(
		angleRadians: number,
		options: { handle?: RotateCorner; shiftKey?: boolean } = {}
	) {
		const { handle = 'top_left_rotate', shiftKey = false } = options
		if (this.editor.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}

		this.editor.setCurrentTool('select')

		const handlePoint = this.editor
			.getSelectionRotatedPageBounds()!
			.getHandlePoint(ROTATE_CORNER_TO_SELECTION_CORNER[handle])
			.clone()
			.rotWith(
				this.editor.getSelectionRotatedPageBounds()!.point,
				this.editor.getSelectionRotation()
			)

		const targetHandlePoint = Vec.RotWith(handlePoint, this.getSelectionPageCenter()!, angleRadians)

		this.pointerDown(handlePoint.x, handlePoint.y, { target: 'selection', handle })
		this.pointerMove(targetHandlePoint.x, targetHandlePoint.y, { shiftKey })
		this.pointerUp()
		return this
	}

	/**
	 * Simulates translating the current selection by the given delta in page coordinates.
	 * @param dx - Horizontal delta in page coordinates.
	 * @param dy - Vertical delta in page coordinates.
	 * @param options - Partial pointer event overrides (e.g. altKey for center-based scaling).
	 */
	translateSelection(dx: number, dy: number, options?: Partial<TLPointerEventInfo>) {
		if (this.editor.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}
		this.editor.setCurrentTool('select')

		const center = this.getSelectionPageCenter()!

		this.pointerDown(center.x, center.y, this.editor.getSelectedShapeIds()[0])
		const numSteps = 10
		for (let i = 1; i < numSteps; i++) {
			this.pointerMove(center.x + (i * dx) / numSteps, center.y + (i * dy) / numSteps, options)
		}
		this.pointerUp(center.x + dx, center.y + dy, options)
		return this
	}

	/**
	 * Simulates resizing the current selection via the given handle, with optional scale factors.
	 * @param scale - Scale factors for x and y. Defaults to `\{ scaleX: 1, scaleY: 1 \}`.
	 * @param handle - The selection handle to drag (e.g. 'top', 'bottom_right').
	 * @param options - Partial pointer event overrides (e.g. altKey to scale from center).
	 */
	resizeSelection(
		scale: { scaleX?: number; scaleY?: number } = {},
		handle: SelectionHandle,
		options?: Partial<TLPointerEventInfo>
	) {
		const { scaleX = 1, scaleY = 1 } = scale
		if (this.editor.getSelectedShapeIds().length === 0) {
			throw new Error('No selection')
		}
		this.editor.setCurrentTool('select')
		const bounds = this.editor.getSelectionRotatedPageBounds()!
		const preRotationHandlePoint = bounds.getHandlePoint(handle)

		const preRotationScaleOriginPoint = options?.altKey
			? bounds.center
			: bounds.getHandlePoint(rotateSelectionHandle(handle, Math.PI))

		const preRotationTargetHandlePoint = Vec.Add(
			Vec.Sub(preRotationHandlePoint, preRotationScaleOriginPoint).mulV({
				x: scaleX,
				y: scaleY,
			}),
			preRotationScaleOriginPoint
		)

		const handlePoint = Vec.RotWith(
			preRotationHandlePoint,
			bounds.point,
			this.editor.getSelectionRotation()
		)
		const targetHandlePoint = Vec.RotWith(
			preRotationTargetHandlePoint,
			bounds.point,
			this.editor.getSelectionRotation()
		)

		this.pointerDown(handlePoint.x, handlePoint.y, { target: 'selection', handle }, options)
		this.pointerMove(targetHandlePoint.x, targetHandlePoint.y, options)
		this.pointerUp(targetHandlePoint.x, targetHandlePoint.y, options)
		return this
	}
}
