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
 * Macropad wraps an Editor instance and provides an imperative API for driving it
 * programmatically. Useful for scripting, automation, REPL usage, and testing.
 *
 * All methods use only public Editor APIs and return `this` for fluent chaining.
 *
 * @public
 */
export class Macropad {
	constructor(public readonly editor: Editor) {}

	clipboard: TLContent | null = null

	/* ---------------------- IDs ---------------------- */

	testShapeID(id: string) {
		return createShapeId(id)
	}

	testPageID(id: string) {
		return PageRecordType.createId(id)
	}

	/* ------------------- Clipboard ------------------- */

	copy(ids = this.editor.getSelectedShapeIds()) {
		if (ids.length > 0) {
			const content = this.editor.getContentFromCurrentPage(ids)
			if (content) {
				this.clipboard = content
			}
		}
		return this
	}

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

	getViewportPageCenter() {
		return this.editor.getViewportPageBounds().center
	}

	getSelectionPageCenter() {
		const selectionRotation = this.editor.getSelectionRotation()
		const selectionBounds = this.editor.getSelectionRotatedPageBounds()
		if (!selectionBounds) return null
		return Vec.RotWith(selectionBounds.center, selectionBounds.point, selectionRotation)
	}

	getPageCenter(shape: TLShape) {
		const pageTransform = this.editor.getShapePageTransform(shape.id)
		if (!pageTransform) return null
		const center = this.editor.getShapeGeometry(shape).bounds.center
		return Mat.applyToPoint(pageTransform, center)
	}

	getPageRotationById(id: TLShapeId): number {
		const pageTransform = this.editor.getShapePageTransform(id)
		if (pageTransform) {
			return Mat.Decompose(pageTransform).rotation
		}
		return 0
	}

	getPageRotation(shape: TLShape) {
		return this.getPageRotationById(shape.id)
	}

	getArrowsBoundTo(shapeId: TLShapeId) {
		const ids = new Set(this.editor.getBindingsToShape(shapeId, 'arrow').map((b) => b.fromId))
		return compact(Array.from(ids, (id) => this.editor.getShape<TLArrowShape>(id)))
	}

	/* --------------- Event building --------------- */

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

	forceTick(count = 1) {
		for (let i = 0; i < count; i++) {
			this.editor.emit('tick', 16)
		}
		return this
	}

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

	keyPress(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.keyDown(key, options)
		this.keyUp(key, options)
		return this
	}

	keyDown(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.editor.dispatch({ ...this.getKeyboardEventInfo(key, 'key_down', options) })
		this.forceTick()
		return this
	}

	keyRepeat(key: string, options = {} as Partial<Exclude<TLKeyboardEventInfo, 'key'>>) {
		this.editor.dispatch({ ...this.getKeyboardEventInfo(key, 'key_repeat', options) })
		this.forceTick()
		return this
	}

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

	rotateSelection(
		angleRadians: number,
		{
			handle = 'top_left_rotate',
			shiftKey = false,
		}: { handle?: RotateCorner; shiftKey?: boolean } = {}
	) {
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

	resizeSelection(
		{ scaleX = 1, scaleY = 1 },
		handle: SelectionHandle,
		options?: Partial<TLPointerEventInfo>
	) {
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
