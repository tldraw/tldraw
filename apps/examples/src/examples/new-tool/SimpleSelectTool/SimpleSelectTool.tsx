import {
	Arc2d,
	Box,
	BoxLike,
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultSizeStyle,
	Geometry2d,
	Group2d,
	HIT_TEST_MARGIN,
	Mat,
	RotateCorner,
	SelectionHandle,
	SharedStyleMap,
	TLArrowShape,
	TLClickEventInfo,
	TLEventInfo,
	TLGroupShape,
	TLHandle,
	TLImageShape,
	TLKeyboardEventInfo,
	TLNoteShape,
	TLPointerEventInfo,
	TLRotationSnapshot,
	TLSelectionHandle,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	ToolUtil,
	Vec,
	applyRotationToSnapshotShapes,
	createShapeId,
	debugFlags,
	getOwnProperty,
	getPointInArcT,
	getRotationSnapshot,
	isPageId,
	kickoutOccludedShapes,
	moveCameraWhenCloseToEdge,
	react,
	structuredClone,
} from 'tldraw'
import { getArrowInfo } from 'tldraw/src/lib/shapes/arrow/shared'
import { HintedShapeIndicator } from './components/HintedShapeIndicators'
import { TldrawSelectionForeground } from './components/SelectionBox'
import { SelectionBrush } from './components/SelectionBrush'
import { ShapeIndicators } from './components/ShapeIndicators'
import { DragAndDropManager } from './selection-logic/DragAndDropManager'
import {
	MIN_CROP_SIZE,
	ShapeWithCrop,
	getTranslateCroppedImageChange,
} from './selection-logic/cropping'
import { cursorTypeMap } from './selection-logic/cursorTypeMap'
import { getCroppingSnapshot } from './selection-logic/getCroppingSnapshot'
import { getHitShapeOnCanvasPointerDown } from './selection-logic/getHitShapeOnCanvasPointerDown'
import { getNoteForPit } from './selection-logic/getNoteForPits'
import { getShouldEnterCropMode } from './selection-logic/getShouldEnterCropModeOnPointerDown'
import { getTextLabels } from './selection-logic/getTextLabels'
import { isOverArrowLabel } from './selection-logic/isOverArrowLabel'
import { isPointInRotatedSelectionBounds } from './selection-logic/isPointInRotatedSelectionBounds'
import { NOTE_CENTER_OFFSET } from './selection-logic/noteHelpers'
import { getRotationFromPointerPosition } from './selection-logic/rotating'
import { startEditingShapeWithLabel } from './selection-logic/selectHelpers'
import { selectOnCanvasPointerUp } from './selection-logic/selectOnCanvasPointerUp'
import {
	TranslatingSnapshot,
	getTranslatingSnapshot,
	moveShapesToPoint,
} from './selection-logic/translating'
import { updateHoveredShapeId } from './selection-logic/updateHoveredShapeId'

type SimpleSelectState =
	| {
			name: 'idle'
	  }
	| {
			name: 'pointing_canvas'
	  }
	| {
			name: 'pointing_crop'
			shape: TLShape
	  }
	| {
			name: 'pointing_crop_handle'
			handle: SelectionHandle
			onInteractionEnd?: string
	  }
	| {
			name: 'cropping'
			handle: SelectionHandle
			snapshot: ReturnType<typeof getCroppingSnapshot>
	  }
	| {
			name: 'pointing_selection'
	  }
	| {
			name: 'pointing_shape'
			hitShape: TLShape
			hitShapeForPointerUp: TLShape | null
			isDoubleClick: boolean
			didSelectOnEnter: boolean
	  }
	| {
			name: 'translating'
			isCloning: boolean
			didClone: boolean
			isCreating: boolean
			onCreate: (shape: TLShape | null) => void
			selectionSnapshot: TranslatingSnapshot
			snapshot: TranslatingSnapshot
			onInteractionEnd?: string
			markId: string
			dragAndDropManager: DragAndDropManager
	  }
	| {
			name: 'pointing_resize_handle'
			handle: SelectionHandle
			onInteractionEnd?: string
	  }
	| {
			name: 'resizing'
			handle: SelectionHandle
			onInteractionEnd?: string
	  }
	| {
			name: 'pointing_rotate_handle'
			handle: RotateCorner
			onInteractionEnd?: string
	  }
	| {
			name: 'rotating'
			handle: RotateCorner
			snapshot: TLRotationSnapshot
			onInteractionEnd?: string
	  }
	| {
			name: 'pointing_handle'
			shape: TLShape
			handle: TLHandle
	  }
	| {
			name: 'dragging_handle'
			shape: TLShape
			handle: TLHandle
	  }
	| {
			name: 'pointing_arrow_label'
			shapeId: TLShapeId
			wasAlreadySelected: boolean
			didDrag: boolean
			labelDragOffset: Vec
	  }
	| {
			name: 'editing_shape'
	  }
	| {
			name: 'brushing'
			brush: BoxLike | null
	  }
	| {
			name: 'scribble_brushing'
	  }
	| {
			name: 'crop_idle'
	  }
	| {
			name: 'crop_translating'
			shape: ShapeWithCrop
			isCreating?: boolean
			onInteractionEnd?: string
	  }
	| {
			name: 'crop_pointing'
			shape: ShapeWithCrop
	  }

const simpleSelectStyles = new SharedStyleMap()
simpleSelectStyles.applyValue(DefaultColorStyle, DefaultColorStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultFillStyle, DefaultFillStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultDashStyle, DefaultDashStyle.defaultValue)
simpleSelectStyles.applyValue(DefaultSizeStyle, DefaultSizeStyle.defaultValue)

export class SimpleSelectToolUtil extends ToolUtil<SimpleSelectState> {
	id = 'select' as const

	getDefaultConfig() {
		return {}
	}

	getDefaultState(): SimpleSelectState {
		return {
			name: 'idle',
		}
	}

	override getStyles() {
		const { editor } = this
		const selectedShapeIds = editor.getSelectedShapeIds()
		if (selectedShapeIds.length === 0) {
			return simpleSelectStyles
		}

		const sharedStyleMap = new SharedStyleMap()

		for (const id of selectedShapeIds) {
			const shape = editor.getShape(id)
			if (!shape) continue
			for (const [style, propKey] of editor.styleProps[shape.type]) {
				sharedStyleMap.applyValue(style, getOwnProperty(shape.props, propKey))
			}
		}

		return sharedStyleMap
	}

	override overlay() {
		const state = this.getState()

		return (
			<>
				<ShapeIndicators />
				<HintedShapeIndicator />
				<TldrawSelectionForeground />
				{state.name === 'brushing' && <SelectionBrush brush={state.brush} />}
			</>
		)
	}

	// This object is used for events, it's kept in memory and updated as the user interacts with the tool
	private memo = {
		initialSelectedIds: [] as TLShapeId[],
	}

	reactor?: () => void

	override onEnter() {
		this.reactor = react('clean duplicate props', () => {
			try {
				this.cleanUpDuplicateProps()
			} catch (e) {
				if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
					// ignore errors at test time
				} else {
					console.error(e)
				}
			}
		})
	}

	override onExit = () => {
		const { editor } = this
		this.reactor?.()
		if (editor.getCurrentPageState().editingShapeId) {
			editor.setEditingShape(null)
		}
	}

	override onStateChange(prev: SimpleSelectState, next: SimpleSelectState, _info: any) {
		const { editor, memo } = this
		switch (prev.name) {
			case 'rotating':
			case 'pointing_crop_handle':
			case 'pointing_arrow_label': {
				editor.setCursor({ type: 'default', rotation: 0 })
				break
			}
			case 'crop_idle': {
				editor.setCursor({ type: 'default', rotation: 0 })
				const onlySelectedShape = editor.getOnlySelectedShape()
				// it's possible for a user to enter cropping, then undo (which clears the cropping id) but still remain in this state.
				editor.on('tick', this.cleanupCroppingState)
				if (onlySelectedShape) {
					editor.mark('crop')
					editor.setCroppingShape(onlySelectedShape.id)
				}
			}
		}

		switch (next.name) {
			case 'idle': {
				updateHoveredShapeId(editor)
				editor.setCursor({ type: 'default', rotation: 0 })
				break
			}
			case 'pointing_canvas': {
				if (!editor.inputs.shiftKey) {
					if (editor.getSelectedShapeIds().length > 0) {
						editor.mark('selecting none')
						editor.selectNone()
					}
				}
				break
			}
			case 'pointing_shape': {
				const info = _info as TLPointerEventInfo & { target: 'shape' }
				let didSelectOnEnter = false
				let hitShapeForPointerUp = null as null | TLShape
				const selectedShapeIds = editor.getSelectedShapeIds()
				const selectionBounds = editor.getSelectionRotatedPageBounds()
				const focusedGroupId = editor.getFocusedGroupId()
				const outermostSelectingShape = editor.getOutermostSelectableShape(info.shape)
				const selectedAncestor = editor.findShapeAncestor(outermostSelectingShape, (parent) =>
					selectedShapeIds.includes(parent.id)
				)
				const {
					inputs: { currentPagePoint, shiftKey, altKey },
				} = editor

				if (
					// If the shape has an onClick handler
					editor.getShapeUtil(info.shape).onClick ||
					// ...or if the shape is the focused layer (e.g. group)
					outermostSelectingShape.id === focusedGroupId ||
					// ...or if the shape is within the selection
					selectedShapeIds.includes(outermostSelectingShape.id) ||
					// ...or if an ancestor of the shape is selected
					selectedAncestor ||
					// ...or if the current point is NOT within the selection bounds
					(selectedShapeIds.length > 1 && selectionBounds?.containsPoint(currentPagePoint))
				) {
					// We won't select the shape on enter, though we might select it on pointer up!
					didSelectOnEnter = false
					hitShapeForPointerUp = outermostSelectingShape
					return
				} else {
					didSelectOnEnter = true
					if (shiftKey && !altKey) {
						editor.cancelDoubleClick()
						if (!selectedShapeIds.includes(outermostSelectingShape.id)) {
							editor.mark('shift selecting shape')
							editor.setSelectedShapes([...selectedShapeIds, outermostSelectingShape.id])
						}
					} else {
						editor.mark('selecting shape')
						editor.setSelectedShapes([outermostSelectingShape.id])
					}
				}

				this.setState({
					name: 'pointing_shape',
					hitShape: info.shape,
					hitShapeForPointerUp,
					didSelectOnEnter,
					isDoubleClick: false,
				})
				break
			}
			case 'rotating': {
				editor.mark('rotating')
				const newSelectionRotation = getRotationFromPointerPosition(editor, next.snapshot, false)

				applyRotationToSnapshotShapes({
					editor: editor,
					delta: getRotationFromPointerPosition(editor, next.snapshot, false),
					snapshot: next.snapshot,
					stage: 'start',
				})

				// Update cursor
				editor.setCursor({
					type: cursorTypeMap[next.handle],
					rotation: newSelectionRotation + next.snapshot.initialSelectionRotation,
				})
				break
			}
			case 'brushing': {
				const { originPagePoint, currentPagePoint } = editor.inputs
				const box = Box.FromPoints([originPagePoint, currentPagePoint])
				this.setState({
					name: 'brushing',
					brush: box.toJson(),
				})

				// Stash the selected ids so we can restore them later
				memo.initialSelectedIds = editor.getSelectedShapeIds()
				break
			}
			case 'crop_idle': {
				editor.setCursor({ type: 'default', rotation: 0 })
				editor.off('tick', this.cleanupCroppingState)
				break
			}
			case 'crop_pointing': {
				break
			}
			case 'crop_translating': {
				editor.mark('translating crop')
				editor.setCursor({ type: 'move', rotation: 0 })
				// this.updateTranslatingCroppingShape(next)
				break
			}
			case 'pointing_crop_handle': {
				const selectedShape = editor.getSelectedShapes()[0]
				if (!selectedShape) return

				const info = _info as TLPointerEventInfo & {
					target: 'selection'
					handle: TLSelectionHandle
				}

				const cursorType = cursorTypeMap[info.handle]
				editor.setCursor({ type: cursorType, rotation: editor.getSelectionRotation() })
				editor.setCroppingShape(selectedShape.id)

				break
			}
			case 'cropping': {
				const cursorType = cursorTypeMap[next.handle]
				editor.setCursor({ type: cursorType, rotation: editor.getSelectionRotation() })
				editor.mark('cropping')
				break
			}
			case 'pointing_resize_handle': {
				const info = _info as TLPointerEventInfo & {
					target: 'selection'
					handle: TLSelectionHandle
				}

				const selected = editor.getSelectedShapes()
				const cursorType = cursorTypeMap[info.handle]
				editor.setCursor({
					type: cursorType,
					rotation: selected.length === 1 ? editor.getSelectionRotation() : 0,
				})
				break
			}
			case 'resizing': {
				break
			}
			case 'pointing_arrow_label': {
				editor.setCursor({ type: 'grabbing', rotation: 0 })
				editor.mark('label-drag start')
				editor.setSelectedShapes([next.shapeId])
				break
			}
			case 'translating': {
				if (!editor.getSelectedShapeIds()?.length) {
					this.setState({ name: 'idle' })
					return
				}

				editor.mark('translating')

				// this.parent.setCurrentToolIdMask(info.onInteractionEnd)

				editor.setCursor({ type: 'move', rotation: 0 })

				// Don't clone on create; otherwise clone on altKey
				if (!next.isCreating) {
					if (editor.inputs.altKey) {
						this.startCloningTranslatingShapes(next)
						return
					}
				}

				this.startTranslating(next)
				this.updateTranslatingShapes(next)
				break
			}
		}
	}

	override onEvent(info: TLEventInfo) {
		const { editor, memo } = this
		const state = this.getState()

		switch (state.name) {
			case 'idle': {
				if (info.name === 'pointer_move') {
					updateHoveredShapeId(editor)
				} else if (info.name === 'pointer_down') {
					if (editor.getIsMenuOpen()) return

					const shouldEnterCropMode = info.ctrlKey && getShouldEnterCropMode(editor)

					if (info.ctrlKey && !shouldEnterCropMode) {
						// On Mac, you can right click using the Control keys + Click.
						if (
							info.target === 'shape' &&
							editor.environment.isMac &&
							editor.inputs.keys.has('ControlLeft')
						) {
							if (!editor.isShapeOrAncestorLocked(info.shape)) {
								this.setState(
									{
										name: 'pointing_shape',
										hitShape: info.shape,
										hitShapeForPointerUp: null,
										didSelectOnEnter: false,
										isDoubleClick: false,
									},
									info
								)
								return
							}
						}
						this.setState({ name: 'brushing', brush: null }, info)
						return
					}

					switch (info.target) {
						case 'canvas': {
							// Check to see if we hit any shape under the pointer; if so,
							// handle this as a pointer down on the shape instead of the canvas
							const hitShape = getHitShapeOnCanvasPointerDown(editor)
							if (hitShape && !hitShape.isLocked) {
								this.onEvent({
									...info,
									shape: hitShape,
									target: 'shape',
								})
								return
							}

							const selectedShapeIds = editor.getSelectedShapeIds()
							const onlySelectedShape = editor.getOnlySelectedShape()
							const {
								inputs: { currentPagePoint },
							} = editor

							if (
								selectedShapeIds.length > 1 ||
								(onlySelectedShape &&
									!editor.getShapeUtil(onlySelectedShape).hideSelectionBoundsBg(onlySelectedShape))
							) {
								if (isPointInRotatedSelectionBounds(editor, currentPagePoint)) {
									this.onEvent({
										...info,
										target: 'selection',
									})
									return
								}
							}

							this.setState({ name: 'pointing_canvas' }, info)
							break
						}
						case 'shape': {
							const { shape } = info
							if (isOverArrowLabel(editor, shape)) {
								// We're moving the label on a shape.
								const geometry = editor.getShapeGeometry<Group2d>(shape)
								const labelGeometry = geometry.children[1]
								if (!labelGeometry) {
									throw Error(`Expected to find an arrow label geometry for shape: ${shape.id}`)
								}
								const { currentPagePoint } = editor.inputs
								const pointInShapeSpace = editor.getPointInShapeSpace(shape, currentPagePoint)

								this.setState(
									{
										name: 'pointing_arrow_label',
										shapeId: shape.id,
										wasAlreadySelected: editor.getOnlySelectedShapeId() === shape.id,
										didDrag: false,
										labelDragOffset: Vec.Sub(labelGeometry.center, pointInShapeSpace),
									},
									info
								)
								break
							}

							if (editor.isShapeOrAncestorLocked(shape)) {
								this.setState({ name: 'pointing_canvas' }, info)
								break
							}
							this.setState(
								{
									name: 'pointing_shape',
									hitShape: info.shape,
									hitShapeForPointerUp: null,
									didSelectOnEnter: false,
									isDoubleClick: false,
								},
								info
							)
							break
						}
						case 'handle': {
							if (editor.getInstanceState().isReadonly) break
							if (editor.inputs.altKey) {
								this.setState(
									{
										name: 'pointing_shape',
										hitShape: info.shape,
										hitShapeForPointerUp: null,
										didSelectOnEnter: false,
										isDoubleClick: false,
									},
									info
								)
							} else {
								this.setState(
									{
										name: 'pointing_handle',
										shape: info.shape,
										handle: info.handle,
									},
									info
								)
							}
							break
						}
						case 'selection': {
							switch (info.handle) {
								case 'mobile_rotate':
								case 'top_left_rotate':
								case 'top_right_rotate':
								case 'bottom_left_rotate':
								case 'bottom_right_rotate': {
									this.setState({ name: 'pointing_rotate_handle', handle: info.handle }, info)
									break
								}
								case 'top':
								case 'right':
								case 'bottom':
								case 'left': {
									if (shouldEnterCropMode) {
										this.setState({ name: 'pointing_crop_handle', handle: info.handle }, info)
									} else {
										this.setState({ name: 'pointing_resize_handle', handle: info.handle }, info)
									}
									break
								}
								case 'top_left':
								case 'top_right':
								case 'bottom_left':
								case 'bottom_right': {
									if (shouldEnterCropMode) {
										this.setState({ name: 'pointing_crop_handle', handle: info.handle }, info)
									} else {
										this.setState({ name: 'pointing_resize_handle', handle: info.handle }, info)
									}
									break
								}
								default: {
									const hoveredShape = editor.getHoveredShape()
									if (
										hoveredShape &&
										!editor.getSelectedShapeIds().includes(hoveredShape.id) &&
										!hoveredShape.isLocked
									) {
										this.onEvent({
											...info,
											shape: hoveredShape,
											target: 'shape',
										})
										return
									}

									this.setState({ name: 'pointing_selection' }, info)
								}
							}
							break
						}
					}
				} else if (info.name === 'double_click') {
					if (editor.inputs.shiftKey || info.phase !== 'up') return

					switch (info.target) {
						case 'canvas': {
							const hoveredShape = editor.getHoveredShape()

							// todo
							// double clicking on the middle of a hollow geo shape without a label, or
							// over the label of a hollwo shape that has a label, should start editing
							// that shape's label. We can't support "double click anywhere inside"
							// of the shape yet because that also creates text shapes, and can product
							// unexpected results when working "inside of" a hollow shape.

							const hitShape =
								hoveredShape && !editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
									? hoveredShape
									: editor.getSelectedShapeAtPoint(editor.inputs.currentPagePoint) ??
										editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
											margin: HIT_TEST_MARGIN / editor.getZoomLevel(),
											hitInside: false,
										})

							const focusedGroupId = editor.getFocusedGroupId()

							if (hitShape) {
								if (editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
									// Probably select the shape
									selectOnCanvasPointerUp(editor)
									return
								} else {
									const parent = editor.getShape(hitShape.parentId)
									if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
										// The shape is the direct child of a group. If the group is
										// selected, then we can select the shape. If the group is the
										// focus layer id, then we can double click into it as usual.
										if (focusedGroupId && parent.id === focusedGroupId) {
											// noop, double click on the shape as normal below
										} else {
											// The shape is the child of some group other than our current
											// focus layer. We should probably select the group instead.
											selectOnCanvasPointerUp(editor)
											return
										}
									}
								}

								// double click on the shape. We'll start editing the
								// shape if it's editable or else do a double click on
								// the canvas.
								this.onEvent({
									...info,
									shape: hitShape,
									target: 'shape',
								})

								return
							}

							if (!editor.inputs.shiftKey) {
								this.handleDoubleClickOnCanvas(info)
							}
							break
						}
						case 'selection': {
							if (editor.getInstanceState().isReadonly) break

							const onlySelectedShape = editor.getOnlySelectedShape()

							if (onlySelectedShape) {
								const util = editor.getShapeUtil(onlySelectedShape)

								if (!this.canInteractWithShapeInReadOnly(onlySelectedShape)) {
									return
								}

								// Test edges for an onDoubleClickEdge handler
								if (
									info.handle === 'right' ||
									info.handle === 'left' ||
									info.handle === 'top' ||
									info.handle === 'bottom'
								) {
									const change = util.onDoubleClickEdge?.(onlySelectedShape)
									if (change) {
										editor.mark('double click edge')
										editor.updateShapes([change])
										kickoutOccludedShapes(editor, [onlySelectedShape.id])
										return
									}
								}

								// For corners OR edges
								if (
									util.canCrop(onlySelectedShape) &&
									!editor.isShapeOrAncestorLocked(onlySelectedShape)
								) {
									this.setState({ name: 'crop_idle' }, info)
									return
								}

								if (this.shouldStartEditingShape(onlySelectedShape)) {
									this.startEditingShape(onlySelectedShape, info, true /* select all */)
								}
							}
							break
						}
						case 'shape': {
							const { shape } = info
							const util = editor.getShapeUtil(shape)

							// Allow playing videos and embeds
							if (
								shape.type !== 'video' &&
								shape.type !== 'embed' &&
								editor.getInstanceState().isReadonly
							)
								break

							if (util.onDoubleClick) {
								// Call the shape's double click handler
								const change = util.onDoubleClick?.(shape)
								if (change) {
									editor.updateShapes([change])
									return
								} else if (util.canCrop(shape) && !editor.isShapeOrAncestorLocked(shape)) {
									// crop on double click
									editor.mark('select and crop')
									editor.select(info.shape?.id)
									this.setState({ name: 'crop_idle' }, info)
									return
								}
							}

							// If the shape can edit, then begin editing
							if (this.shouldStartEditingShape(shape)) {
								this.startEditingShape(shape, info, true /* select all */)
							} else {
								// If the shape's double click handler has not created a change,
								// and if the shape cannot edit, then create a text shape and
								// begin editing the text shape
								this.handleDoubleClickOnCanvas(info)
							}
							break
						}
						case 'handle': {
							if (editor.getInstanceState().isReadonly) break
							const { shape, handle } = info

							const util = editor.getShapeUtil(shape)
							const changes = util.onDoubleClickHandle?.(shape, handle)

							if (changes) {
								editor.updateShapes([changes])
							} else {
								// If the shape's double click handler has not created a change,
								// and if the shape can edit, then begin editing the shape.
								if (this.shouldStartEditingShape(shape)) {
									this.startEditingShape(shape, info, true /* select all */)
								}
							}
						}
					}
				} else if (info.name === 'right_click') {
					switch (info.target) {
						case 'canvas': {
							const hoveredShape = editor.getHoveredShape()
							const hitShape =
								hoveredShape && !editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
									? hoveredShape
									: editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
											margin: HIT_TEST_MARGIN / editor.getZoomLevel(),
											hitInside: false,
											hitLabels: true,
											hitLocked: true,
											hitFrameInside: false,
											renderingOnly: true,
										})

							if (hitShape) {
								this.onEvent({
									...info,
									shape: hitShape,
									target: 'shape',
								})
								return
							}

							const selectedShapeIds = editor.getSelectedShapeIds()
							const onlySelectedShape = editor.getOnlySelectedShape()
							const {
								inputs: { currentPagePoint },
							} = editor

							if (
								selectedShapeIds.length > 1 ||
								(onlySelectedShape &&
									!editor.getShapeUtil(onlySelectedShape).hideSelectionBoundsBg(onlySelectedShape))
							) {
								if (isPointInRotatedSelectionBounds(editor, currentPagePoint)) {
									this.onEvent({
										...info,
										target: 'selection',
									})
									return
								}
							}

							editor.selectNone()
							break
						}
						case 'shape': {
							const { selectedShapeIds } = editor.getCurrentPageState()
							const { shape } = info

							const targetShape = editor.getOutermostSelectableShape(
								shape,
								(parent) => !selectedShapeIds.includes(parent.id)
							)

							if (!selectedShapeIds.includes(targetShape.id)) {
								editor.mark('selecting shape')
								editor.setSelectedShapes([targetShape.id])
							}
							break
						}
					}
				} else if (info.name === 'cancel') {
					if (
						editor.getFocusedGroupId() !== editor.getCurrentPageId() &&
						editor.getSelectedShapeIds().length > 0
					) {
						editor.popFocusedGroupId()
					} else {
						editor.mark('clearing selection')
						editor.selectNone()
					}
				} else if (info.name === 'key_down') {
					switch (info.code) {
						case 'ArrowLeft':
						case 'ArrowRight':
						case 'ArrowUp':
						case 'ArrowDown': {
							this.nudgeSelectedShapes(false)
							return
						}
					}

					if (debugFlags['editOnType'].get()) {
						// This feature flag lets us start editing a note shape's label when a key is pressed.
						// We exclude certain keys to avoid conflicting with modifiers, but there are conflicts
						// with other action kbds, hence why this is kept behind a feature flag.
						if (
							!SKIPPED_KEYS_FOR_AUTO_EDITING.includes(info.key) &&
							!info.altKey &&
							!info.ctrlKey
						) {
							// If the only selected shape is editable, then begin editing it
							const onlySelectedShape = editor.getOnlySelectedShape()
							if (
								onlySelectedShape &&
								// If it's a note shape, then edit on type
								editor.isShapeOfType(onlySelectedShape, 'note') &&
								// If it's not locked or anything
								this.shouldStartEditingShape(onlySelectedShape)
							) {
								this.startEditingShape(
									onlySelectedShape,
									{
										...info,
										target: 'shape',
										shape: onlySelectedShape,
									},
									true /* select all */
								)
								return
							}
						}
					}
				} else if (info.name === 'key_repeat') {
					switch (info.code) {
						case 'ArrowLeft':
						case 'ArrowRight':
						case 'ArrowUp':
						case 'ArrowDown': {
							this.nudgeSelectedShapes(true)
							break
						}
					}
				} else if (info.name === 'key_up') {
					switch (info.code) {
						case 'Enter': {
							const selectedShapes = editor.getSelectedShapes()

							// On enter, if every selected shape is a group, then select all of the children of the groups
							if (
								selectedShapes.every((shape) => editor.isShapeOfType<TLGroupShape>(shape, 'group'))
							) {
								editor.setSelectedShapes(
									selectedShapes.flatMap((shape) => editor.getSortedChildIdsForParent(shape.id))
								)
								return
							}

							// If the only selected shape is editable, then begin editing it
							const onlySelectedShape = editor.getOnlySelectedShape()
							if (onlySelectedShape && this.shouldStartEditingShape(onlySelectedShape)) {
								this.startEditingShape(
									onlySelectedShape,
									{
										...info,
										target: 'shape',
										shape: onlySelectedShape,
									},
									true /* select all */
								)
								return
							}

							// If the only selected shape is croppable, then begin cropping it
							if (getShouldEnterCropMode(editor)) {
								this.setState({ name: 'crop_idle' }, info)
							}
							break
						}
					}
				}
				break
			}
			case 'pointing_canvas': {
				if (editor.inputs.isDragging) {
					this.setState(
						{
							name: 'brushing',
							brush: null,
						},
						info
					)
				} else if (info.name === 'pointer_up') {
					selectOnCanvasPointerUp(editor)
					this.setState({ name: 'idle' })
				} else if (
					info.name === 'cancel' ||
					info.name === 'complete' ||
					info.name === 'interrupt'
				) {
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'pointing_handle': {
				if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return
					const { shape, handle } = state

					if (editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
						const nextNote = getNoteForPit(editor, shape, handle, true)
						if (nextNote) {
							// Center the shape on the current pointer
							const centeredOnPointer = editor
								.getPointInParentSpace(nextNote, editor.inputs.originPagePoint)
								.sub(Vec.Rot(NOTE_CENTER_OFFSET, nextNote.rotation))
							editor.updateShape({ ...nextNote, x: centeredOnPointer.x, y: centeredOnPointer.y })

							// Then select and begin translating the shape
							editor.setHoveredShape(nextNote.id) // important!
							editor.select(nextNote.id)
							const snapshot = getTranslatingSnapshot(editor)
							this.setState({
								name: 'translating',
								isCloning: false,
								isCreating: true,
								didClone: false,
								markId: 'creating note',
								selectionSnapshot: snapshot,
								snapshot: snapshot,
								dragAndDropManager: new DragAndDropManager(editor),
								onInteractionEnd: 'note',
								onCreate: () => {
									// When we're done, start editing it
									startEditingShapeWithLabel(editor, nextNote, true /* selectAll */)
								},
							})
							return
						}
					}

					this.setState(
						{ name: 'dragging_handle', shape: state.shape, handle: state.handle },
						{ shape: state.shape, handle: state.handle }
					)
				} else if (info.name === 'pointer_up') {
					const { shape, handle } = state

					if (editor.isShapeOfType<TLNoteShape>(shape, 'note')) {
						const { editor } = this
						const nextNote = getNoteForPit(editor, shape, handle, false)
						if (nextNote) {
							startEditingShapeWithLabel(editor, nextNote, true /* selectAll */)
							return
						}
					}

					this.setState({ name: 'idle' })
				} else if (
					info.name === 'cancel' ||
					info.name === 'complete' ||
					info.name === 'interrupt'
				) {
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'pointing_resize_handle': {
				if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return
					this.setState({ name: 'resizing', handle: state.handle })
				} else if (
					info.name === 'complete' ||
					info.name === 'interrupt' ||
					info.name === 'cancel'
				) {
					if (state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd, {})
					} else {
						this.setState({ name: 'idle' })
					}
				}
				break
			}
			case 'pointing_rotate_handle': {
				if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return

					const snapshot = getRotationSnapshot({ editor: editor })
					if (!snapshot) return

					this.setState({
						name: 'rotating',
						handle: state.handle,
						snapshot,
					})
				} else if (
					info.name === 'complete' ||
					info.name === 'interrupt' ||
					info.name === 'cancel'
				) {
					if (state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd, {})
					} else {
						this.setState({ name: 'idle' })
					}
				}
				break
			}
			case 'pointing_crop_handle': {
				if (info.name === 'pointer_up') {
					editor.setCroppingShape(null)
					this.setState({ name: 'idle' })
				} else if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return
					this.setState({
						name: 'cropping',
						handle: state.handle,
						snapshot: getCroppingSnapshot(editor, state.handle),
					})
				} else if (
					info.name === 'complete' ||
					info.name === 'interrupt' ||
					info.name === 'cancel'
				) {
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'pointing_selection': {
				if (info.name === 'pointer_up') {
					selectOnCanvasPointerUp(editor)
					this.setState({ name: 'idle' }, info)
				} else if (info.name === 'double_click') {
					const hoveredShape = editor.getHoveredShape()
					const hitShape =
						hoveredShape && !editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
							? hoveredShape
							: editor.getShapeAtPoint(editor.inputs.currentPagePoint, {
									hitInside: true,
									margin: 0,
									renderingOnly: true,
								})

					if (hitShape) {
						// todo: extract the double click shape logic from idle so that we can share it here
						this.setState({ name: 'idle' })
						this.onEvent({
							...info,
							target: 'shape',
							shape: editor.getShape(hitShape)!,
						})
						return
					}
				} else if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return
					const snapshot = getTranslatingSnapshot(editor)
					this.setState(
						{
							name: 'translating',
							isCreating: false,
							isCloning: false,
							didClone: false,
							onCreate: () => void null,
							selectionSnapshot: snapshot,
							snapshot: snapshot,
							markId: 'translating',
							dragAndDropManager: new DragAndDropManager(editor),
						},
						info
					)
				} else if (
					info.name === 'cancel' ||
					info.name === 'complete' ||
					info.name === 'interrupt'
				) {
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'pointing_shape': {
				if (info.name === 'cancel' || info.name === 'interrupt' || info.name === 'complete') {
					this.setState({ name: 'idle' })
				} else if (info.name === 'double_click') {
					this.setState({ ...state, isDoubleClick: true })
				} else if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					if (editor.getInstanceState().isReadonly) return
					// Re-focus the editor, just in case the text label of the shape has stolen focus
					editor.getContainer().focus()
					const snapshot = getTranslatingSnapshot(editor)
					this.setState(
						{
							name: 'translating',
							isCreating: false,
							isCloning: false,
							didClone: false,
							onCreate: () => void null,
							selectionSnapshot: snapshot,
							snapshot: snapshot,
							markId: 'translating',
							dragAndDropManager: new DragAndDropManager(editor),
						},
						info
					)
				} else if (info.name === 'pointer_up') {
					const selectedShapeIds = editor.getSelectedShapeIds()
					const focusedGroupId = editor.getFocusedGroupId()
					const zoomLevel = editor.getZoomLevel()
					const {
						inputs: { currentPagePoint, shiftKey },
					} = editor

					const hitShape =
						editor.getShapeAtPoint(currentPagePoint, {
							margin: HIT_TEST_MARGIN / zoomLevel,
							hitInside: true,
							renderingOnly: true,
						}) ?? state.hitShape

					const selectingShape = hitShape
						? editor.getOutermostSelectableShape(hitShape)
						: state.hitShapeForPointerUp

					if (!selectingShape) throw Error('no shape to select')

					// If the selecting shape has a click handler, call it instead of selecting the shape
					const util = editor.getShapeUtil(selectingShape)
					if (util.onClick) {
						const change = util.onClick?.(selectingShape)
						if (change) {
							editor.mark('shape on click')
							editor.updateShapes([change])
							this.setState({ name: 'idle' }, info)
							return
						}
					}

					if (selectingShape.id === focusedGroupId) {
						if (selectedShapeIds.length > 0) {
							editor.mark('clearing shape ids')
							editor.setSelectedShapes([])
						} else {
							editor.popFocusedGroupId()
						}
						this.setState({ name: 'idle' }, info)
						return
					}

					if (!state.didSelectOnEnter) {
						// if the shape has an ancestor which is a focusable layer and it is not focused but it is selected
						// then we should focus the layer and select the shape

						const outermostSelectableShape = editor.getOutermostSelectableShape(
							hitShape,
							// if a group is selected, we want to stop before reaching that group
							// so we can drill down into the group
							(parent) => !selectedShapeIds.includes(parent.id)
						)

						// If the outermost shape is selected, then either select or deselect the SELECTING shape
						if (selectedShapeIds.includes(outermostSelectableShape.id)) {
							// same shape, so deselect it if shift is pressed, otherwise deselect all others
							if (shiftKey) {
								editor.mark('deselecting on pointer up')
								editor.deselect(selectingShape)
							} else {
								if (selectedShapeIds.includes(selectingShape.id)) {
									// todo
									// if the shape is editable and we're inside of an editable part of that shape, e.g. the label of a geo shape,
									// then we would want to begin editing the shape. At the moment we're relying on the shape label's onPointerUp
									// handler to do this logic, and prevent the regular pointer up event, so we won't be here in that case.

									// if the shape has a text label, and we're inside of the label, then we want to begin editing the label.
									if (selectedShapeIds.length === 1) {
										const geometry = editor.getShapeUtil(selectingShape).getGeometry(selectingShape)
										const textLabels = getTextLabels(geometry)
										const textLabel = textLabels.length === 1 ? textLabels[0] : undefined
										// N.B. we're only interested if there is exactly one text label. We don't handle the
										// case if there's potentially more than one text label at the moment.
										if (textLabel) {
											const pointInShapeSpace = editor.getPointInShapeSpace(
												selectingShape,
												currentPagePoint
											)

											if (
												textLabel.bounds.containsPoint(pointInShapeSpace, 0) &&
												textLabel.hitTestPoint(pointInShapeSpace)
											) {
												editor.mark('editing on pointer up')
												editor.select(selectingShape.id)

												const util = editor.getShapeUtil(selectingShape)
												if (editor.getInstanceState().isReadonly) {
													if (!util.canEditInReadOnly(selectingShape)) {
														return
													}
												}

												editor.setEditingShape(selectingShape.id)
												editor.setCurrentTool('select.editing_shape')

												if (state.isDoubleClick) {
													editor.emit('select-all-text', { shapeId: selectingShape.id })
												}
												return
											}
										}
									}

									// We just want to select the single shape from the selection
									editor.mark('selecting on pointer up')
									editor.select(selectingShape.id)
								} else {
									editor.mark('selecting on pointer up')
									editor.select(selectingShape)
								}
							}
						} else if (shiftKey) {
							// Different shape, so we are drilling down into a group with shift key held.
							// Deselect any ancestors and add the target shape to the selection
							const ancestors = editor.getShapeAncestors(outermostSelectableShape)

							editor.mark('shift deselecting on pointer up')
							editor.setSelectedShapes([
								...editor.getSelectedShapeIds().filter((id) => !ancestors.find((a) => a.id === id)),
								outermostSelectableShape.id,
							])
						} else {
							editor.mark('selecting on pointer up')
							// different shape and we are drilling down, but no shift held so just select it straight up
							editor.setSelectedShapes([outermostSelectableShape.id])
						}
					}

					this.setState({ name: 'idle' }, info)
				}
				break
			}
			case 'pointing_arrow_label': {
				if (info.name === 'pointer_move' && editor.inputs.isDragging) {
					const shape = editor.getShape<TLArrowShape>(state.shapeId)
					if (!shape) return

					const info = getArrowInfo(editor, shape)!
					const groupGeometry = editor.getShapeGeometry<Group2d>(shape)
					const bodyGeometry = groupGeometry.children[0] as Geometry2d
					const pointInShapeSpace = editor.getPointInShapeSpace(
						shape,
						editor.inputs.currentPagePoint
					)
					const nearestPoint = bodyGeometry.nearestPoint(
						Vec.Add(pointInShapeSpace, state.labelDragOffset)
					)

					let nextLabelPosition
					if (info.isStraight) {
						// straight arrows
						const lineLength = Vec.Dist(info.start.point, info.end.point)
						const segmentLength = Vec.Dist(info.end.point, nearestPoint)
						nextLabelPosition = 1 - segmentLength / lineLength
					} else {
						const { _center, measure, angleEnd, angleStart } = groupGeometry.children[0] as Arc2d
						nextLabelPosition = getPointInArcT(
							measure,
							angleStart,
							angleEnd,
							_center.angle(nearestPoint)
						)
					}

					if (isNaN(nextLabelPosition)) {
						nextLabelPosition = 0.5
					}

					this.setState({ ...state, didDrag: true })

					editor.updateShape<TLArrowShape>({
						id: shape.id,
						type: shape.type,
						props: { labelPosition: nextLabelPosition },
					})
				} else if (info.name === 'pointer_up') {
					const shape = editor.getShape<TLArrowShape>(state.shapeId)
					if (!shape) return

					if (state.didDrag || !state.wasAlreadySelected) {
						this.setState({ name: 'idle' })
					} else {
						// Go into edit mode.
						editor.setEditingShape(shape.id)
						editor.setCurrentTool('select.editing_shape')
					}
				} else if (
					info.name === 'cancel' ||
					info.name === 'complete' ||
					info.name === 'interrupt'
				) {
					editor.bailToMark('label-drag start')
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'cropping': {
				if (info.name === 'cancel' || info.name === 'interrupt') {
					editor.bailToMark('cropping')
					editor.setCroppingShape(null)
					this.setState({ name: 'idle' })
				} else if (info.name === 'pointer_move') {
					this.updateCroppingShapes(state)
				} else if (info.name === 'complete') {
					this.updateCroppingShapes(state)
					kickoutOccludedShapes(editor, [state.snapshot.shape.id])
					editor.setCroppingShape(null)
					this.setState({ name: 'idle' })
				}
				break
			}
			case 'crop_idle': {
				if (info.name === 'cancel' || info.name === 'complete' || info.name === 'interrupt') {
					this.cancelCrop()
				} else if (info.name === 'pointer_down') {
					if (editor.getIsMenuOpen()) {
						return
					}

					if (info.ctrlKey) {
						this.cancelCrop()
						this.onEvent(info)
						return
					}

					switch (info.target) {
						case 'canvas': {
							const hitShape = getHitShapeOnCanvasPointerDown(editor)
							if (hitShape && !editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
								this.onEvent({
									...info,
									shape: hitShape,
									target: 'shape',
								})
								return
							}
							this.cancelCrop()
							this.onEvent(info)
							break
						}
						case 'shape': {
							if (info.shape.id === editor.getCroppingShapeId()) {
								this.setState({ name: 'pointing_crop', shape: info.shape }, info)
							} else {
								if (editor.getShapeUtil(info.shape)?.canCrop(info.shape)) {
									editor.setCroppingShape(info.shape.id)
									editor.setSelectedShapes([info.shape.id])
									this.setState({ name: 'pointing_crop', shape: info.shape }, info)
								} else {
									this.cancelCrop()
									this.onEvent(info)
								}
							}
							break
						}
						case 'selection':
							{
								switch (info.handle) {
									case 'mobile_rotate':
									case 'top_left_rotate':
									case 'top_right_rotate':
									case 'bottom_left_rotate':
									case 'bottom_right_rotate': {
										this.setState({
											name: 'pointing_rotate_handle',
											handle: info.handle,
											onInteractionEnd: 'select.crop',
										})
										break
									}
									case 'top':
									case 'right':
									case 'bottom':
									case 'left':
									case 'top_left':
									case 'top_right':
									case 'bottom_left':
									case 'bottom_right': {
										this.setState(
											{
												name: 'pointing_crop_handle',
												handle: info.handle,
												onInteractionEnd: 'crop_idle',
											},
											info
										)
										break
									}
									default: {
										this.cancelCrop()
									}
								}
							}
							break
					}
				} else if (info.name === 'double_click') {
					// Without this, the double click's "settle" would trigger the reset
					// after the user double clicked the edge to begin cropping
					if (editor.inputs.shiftKey || info.phase !== 'up') return

					const croppingShapeId = editor.getCroppingShapeId()
					if (!croppingShapeId) return
					const shape = editor.getShape(croppingShapeId)
					if (!shape) return

					const util = editor.getShapeUtil(shape)
					if (!util) return

					if (info.target === 'selection') {
						util.onDoubleClickEdge?.(shape)
					}
				} else if (info.name === 'key_down') {
					this.nudgeCroppingImage(false)
				} else if (info.name === 'key_up') {
					this.nudgeCroppingImage(true)
				}
				break
			}
			case 'crop_pointing': {
				if (
					info.name === 'cancel' ||
					info.name === 'complete' ||
					info.name === 'interrupt' ||
					!editor.inputs.isPointing
				) {
					// Completed / cancelled / stopped pointing
					this.setState({ name: 'crop_idle' }, info)
				} else if (
					info.name === 'long_press' ||
					(info.name === 'pointer_move' && editor.inputs.isDragging)
				) {
					this.setState({ name: 'crop_translating', shape: state.shape }, info)
				}
				break
			}
			case 'crop_translating': {
				if (info.name === 'cancel') {
					// Cancelled
					editor.bailToMark('translating crop')
					this.setState({ name: 'crop_idle' })
				} else if (
					info.name === 'complete' ||
					info.name === 'interrupt' ||
					(info.name === 'key_up' && info.key === 'Enter') ||
					!editor.inputs.isPointing
				) {
					// Completed / cancelled / stopped pointing
					this.setState({ name: 'crop_idle' })
				} else if (
					info.name === 'pointer_move' ||
					(info.name === 'key_down' && (info.key === 'Alt' || info.key === 'Shift')) ||
					(info.name === 'key_up' && (info.key === 'Alt' || info.key === 'Shift'))
				) {
					// Moved pointer or pressed/released modifier
					const shape = state.shape
					if (!shape) return
					const { originPagePoint, currentPagePoint } = editor.inputs
					const delta = currentPagePoint.clone().sub(originPagePoint)
					const partial = getTranslateCroppedImageChange(editor, shape, delta)
					if (partial) {
						editor.updateShapes([partial])
					}
				}
				break
			}
			case 'dragging_handle': {
				break
			}
			case 'editing_shape': {
				break
			}
			case 'resizing': {
				break
			}
			case 'rotating': {
				if (info.name === 'cancel') {
					editor.bailToMark('rotating')
					if (state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd)
					} else {
						this.setState({ name: 'idle' })
					}
				} else if (info.name === 'complete' || !editor.inputs.isPointing) {
					applyRotationToSnapshotShapes({
						editor,
						delta: getRotationFromPointerPosition(editor, state.snapshot, true),
						snapshot: state.snapshot,
						stage: 'end',
					})
					kickoutOccludedShapes(
						editor,
						state.snapshot.shapeSnapshots.map((s) => s.shape.id)
					)
					if (state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd)
					} else {
						this.setState({ name: 'idle' })
					}
				} else if (
					info.name === 'pointer_move' ||
					info.name === 'key_down' ||
					info.name === 'key_up'
				) {
					const newSelectionRotation = getRotationFromPointerPosition(editor, state.snapshot, false)

					applyRotationToSnapshotShapes({
						editor,
						delta: newSelectionRotation,
						snapshot: state.snapshot,
						stage: 'update',
					})

					// Update cursor
					editor.setCursor({
						type: cursorTypeMap[state.handle as RotateCorner],
						rotation: newSelectionRotation + state.snapshot.initialSelectionRotation,
					})
				}
				break
			}
			case 'translating': {
				if (info.name === 'tick') {
					state.dragAndDropManager.updateDroppingNode(state.snapshot.movingShapes, () =>
						this.updateTranslatingParentTransforms(state)
					)
					moveCameraWhenCloseToEdge(editor)
				} else if (info.name === 'cancel') {
					editor.bailToMark(state.markId)
					if (state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd)
					} else {
						this.setState({ name: 'idle' })
					}
				} else if (info.name === 'pointer_move') {
					this.updateTranslatingShapes(state)
				} else if (info.name === 'key_down') {
					if (editor.inputs.altKey && !state.isCloning) {
						this.startCloningTranslatingShapes(state)
					} else {
						this.updateTranslatingShapes(state)
					}
				} else if (info.name === 'key_up') {
					if (!editor.inputs.altKey && state.isCloning) {
						this.stopCloningTranslatingShapes(state)
					} else {
						this.updateTranslatingShapes(state)
					}
				} else if (info.name === 'complete' || !editor.inputs.isPointing) {
					const { movingShapes } = state.snapshot

					this.updateTranslatingShapes(state)

					state.dragAndDropManager.dropShapes(movingShapes)

					kickoutOccludedShapes(
						editor,
						movingShapes.map((s) => s.id)
					)

					if (state.isCloning && movingShapes.length > 0) {
						const currentAveragePagePoint = Vec.Average(
							movingShapes.map((s) => editor.getShapePageTransform(s.id)!.point())
						)
						const offset = Vec.Sub(
							currentAveragePagePoint,
							state.selectionSnapshot.averagePagePoint
						)
						if (!Vec.IsNaN(offset)) {
							editor.updateInstanceState({
								duplicateProps: {
									shapeIds: movingShapes.map((s) => s.id),
									offset: { x: offset.x, y: offset.y },
								},
							})
						}
					}

					const changes: TLShapePartial[] = []

					movingShapes.forEach((shape) => {
						const current = editor.getShape(shape.id)!
						const util = editor.getShapeUtil(shape)
						const change = util.onTranslateEnd?.(shape, current)
						if (change) {
							changes.push(change)
						}
					})

					if (changes.length > 0) {
						editor.updateShapes(changes)
					}

					if (editor.getInstanceState().isToolLocked && state.onInteractionEnd) {
						editor.setCurrentTool(state.onInteractionEnd)
					} else {
						if (state.isCreating) {
							state.onCreate?.(editor.getOnlySelectedShape())
						} else {
							this.setState({ name: 'idle' })
						}
					}
				}
				break
			}
			case 'brushing': {
				if (!editor.inputs.isPointing) {
					// Stopped pointing
					this.setState({
						name: 'idle',
					})
					return
				}

				if (
					info.name === 'pointer_move' ||
					// for modifiers
					info.name === 'key_down' ||
					info.name === 'key_up'
				) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					const box = Box.FromPoints([originPagePoint, currentPagePoint])

					// update the box in the state
					this.setState({
						name: 'brushing',
						brush: box.toJson(),
					})

					const hitIds = new Set<TLShapeId>()

					// If we're holding shift, add the initial selected ids to the hitIds set
					if (editor.inputs.shiftKey) {
						for (const id of memo.initialSelectedIds) {
							hitIds.add(id)
						}
					}

					// Test the rest of the shapes on the page (broad phase only for simplifity)
					for (const shape of editor.getCurrentPageShapes()) {
						if (hitIds.has(shape.id)) continue
						const pageBounds = editor.getShapePageBounds(shape.id)
						if (!pageBounds) continue
						if (box.collides(pageBounds)) {
							hitIds.add(shape.id)
						}
					}

					// If the selected ids have changed, update the selection
					const currentSelectedIds = editor.getSelectedShapeIds()
					if (
						currentSelectedIds.length !== hitIds.size ||
						currentSelectedIds.some((id) => !hitIds.has(id))
					) {
						editor.setSelectedShapes(Array.from(hitIds))
					}
				}

				break
			}
			case 'scribble_brushing': {
				break
			}
		}
	}

	private cleanUpDuplicateProps = () => {
		const { editor } = this
		// Clean up the duplicate props when the selection changes
		const selectedShapeIds = editor.getSelectedShapeIds()
		const instance = editor.getInstanceState()
		if (!instance.duplicateProps) return
		const duplicatedShapes = new Set(instance.duplicateProps.shapeIds)
		if (
			selectedShapeIds.length === duplicatedShapes.size &&
			selectedShapeIds.every((shapeId) => duplicatedShapes.has(shapeId))
		) {
			return
		}
		editor.updateInstanceState({
			duplicateProps: null,
		})
	}

	private shouldStartEditingShape(shape: TLShape | null): boolean {
		const { editor } = this
		if (!shape) return false
		if (editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return false
		if (!this.canInteractWithShapeInReadOnly(shape)) return false
		return editor.getShapeUtil(shape).canEdit(shape)
	}

	private startEditingShape(
		shape: TLShape,
		info: TLClickEventInfo | TLKeyboardEventInfo,
		shouldSelectAll?: boolean
	) {
		const { editor } = this
		if (editor.isShapeOrAncestorLocked(shape) && shape.type !== 'embed') return
		editor.mark('editing shape')
		startEditingShapeWithLabel(editor, shape, shouldSelectAll)
		this.setState({ name: 'editing_shape' }, info)
	}

	private canInteractWithShapeInReadOnly(shape: TLShape) {
		const { editor } = this
		if (!editor.getInstanceState().isReadonly) return true
		const util = editor.getShapeUtil(shape)
		if (util.canEditInReadOnly(shape)) return true
		return false
	}

	private handleDoubleClickOnCanvas(info: TLClickEventInfo) {
		const { editor } = this
		// Create text shape and transition to editing_shape
		if (editor.getInstanceState().isReadonly) return

		editor.mark('creating text shape')

		const id = createShapeId()

		const { x, y } = editor.inputs.currentPagePoint

		editor.createShapes<TLTextShape>([
			{
				id,
				type: 'text',
				x,
				y,
				props: {
					text: '',
					autoSize: true,
				},
			},
		])

		const shape = editor.getShape(id)
		if (!shape) return

		const util = editor.getShapeUtil(shape)
		if (editor.getInstanceState().isReadonly) {
			if (!util.canEditInReadOnly(shape)) {
				return
			}
		}

		editor.setEditingShape(id)
		editor.select(id)
		this.setState({ name: 'editing_shape' }, info)
	}

	private nudgeSelectedShapes(ephemeral = false) {
		const { editor } = this
		const { keys } = editor.inputs

		// We want to use the "actual" shift key state,
		// not the one that's in the editor.inputs.shiftKey,
		// because that one uses a short timeout on release
		const shiftKey = keys.has('ShiftLeft')

		const delta = new Vec(0, 0)

		if (keys.has('ArrowLeft')) delta.x -= 1
		if (keys.has('ArrowRight')) delta.x += 1
		if (keys.has('ArrowUp')) delta.y -= 1
		if (keys.has('ArrowDown')) delta.y += 1

		if (delta.equals(new Vec(0, 0))) return

		if (!ephemeral) editor.mark('nudge shapes')

		const { gridSize } = editor.getDocumentSettings()

		const step = editor.getInstanceState().isGridMode
			? shiftKey
				? gridSize * GRID_INCREMENT
				: gridSize
			: shiftKey
				? MAJOR_NUDGE_FACTOR
				: MINOR_NUDGE_FACTOR

		const selectedShapeIds = editor.getSelectedShapeIds()
		editor.nudgeShapes(selectedShapeIds, delta.mul(step))
		kickoutOccludedShapes(editor, selectedShapeIds)
	}

	private updateCroppingShapes(state: SimpleSelectState & { name: 'cropping' }) {
		const { editor } = this
		const { shape, cursorHandleOffset } = state.snapshot

		if (!shape) return
		const util = editor.getShapeUtil<TLImageShape>('image')
		if (!util) return

		const props = shape.props

		const currentPagePoint = editor.inputs.currentPagePoint.clone().sub(cursorHandleOffset)
		const originPagePoint = editor.inputs.originPagePoint.clone().sub(cursorHandleOffset)

		const change = currentPagePoint.clone().sub(originPagePoint).rot(-shape.rotation)

		const crop = props.crop ?? {
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		}
		const newCrop = structuredClone(crop)
		const newPoint = new Vec(shape.x, shape.y)
		const pointDelta = new Vec(0, 0)

		// original (uncropped) width and height of shape
		const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * props.w
		const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * props.h

		let hasCropChanged = false

		// Set y dimension
		switch (state.handle) {
			case 'top':
			case 'top_left':
			case 'top_right': {
				if (h < MIN_CROP_SIZE) break
				hasCropChanged = true
				// top
				newCrop.topLeft.y = newCrop.topLeft.y + change.y / h
				const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)

				if (heightAfterCrop < MIN_CROP_SIZE) {
					newCrop.topLeft.y = newCrop.bottomRight.y - MIN_CROP_SIZE / h
					pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
				} else {
					if (newCrop.topLeft.y <= 0) {
						newCrop.topLeft.y = 0
						pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
					} else {
						pointDelta.y = change.y
					}
				}
				break
			}
			case 'bottom':
			case 'bottom_left':
			case 'bottom_right': {
				if (h < MIN_CROP_SIZE) break
				hasCropChanged = true
				// bottom
				newCrop.bottomRight.y = Math.min(1, newCrop.bottomRight.y + change.y / h)
				const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)

				if (heightAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.y = newCrop.topLeft.y + MIN_CROP_SIZE / h
				}
				break
			}
		}

		// Set x dimension
		switch (state.handle) {
			case 'left':
			case 'top_left':
			case 'bottom_left': {
				if (w < MIN_CROP_SIZE) break
				hasCropChanged = true
				// left
				newCrop.topLeft.x = newCrop.topLeft.x + change.x / w
				const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)

				if (widthAfterCrop < MIN_CROP_SIZE) {
					newCrop.topLeft.x = newCrop.bottomRight.x - MIN_CROP_SIZE / w
					pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
				} else {
					if (newCrop.topLeft.x <= 0) {
						newCrop.topLeft.x = 0
						pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
					} else {
						pointDelta.x = change.x
					}
				}
				break
			}
			case 'right':
			case 'top_right':
			case 'bottom_right': {
				if (w < MIN_CROP_SIZE) break
				hasCropChanged = true
				// right
				newCrop.bottomRight.x = Math.min(1, newCrop.bottomRight.x + change.x / w)
				const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)

				if (widthAfterCrop < MIN_CROP_SIZE) {
					newCrop.bottomRight.x = newCrop.topLeft.x + MIN_CROP_SIZE / w
				}
				break
			}
		}
		if (!hasCropChanged) return

		newPoint.add(pointDelta.rot(shape.rotation))

		const partial: TLShapePartial<TLShape> = {
			id: shape.id,
			type: shape.type,
			x: newPoint.x,
			y: newPoint.y,
			props: {
				crop: newCrop,
				w: (newCrop.bottomRight.x - newCrop.topLeft.x) * w,
				h: (newCrop.bottomRight.y - newCrop.topLeft.y) * h,
			},
		}

		editor.updateShapes([partial])
		const cursorType = cursorTypeMap[state.handle]
		editor.setCursor({ type: cursorType, rotation: editor.getSelectionRotation() })
	}

	private cleanupCroppingState() {
		const { editor } = this
		if (!editor.getCroppingShapeId()) {
			editor.setCurrentTool('select.idle', {})
		}
	}

	private cancelCrop() {
		const { editor } = this
		editor.setCroppingShape(null)
		this.setState({ name: 'idle' }, {})
	}

	private nudgeCroppingImage(ephemeral = false) {
		const { editor } = this
		const {
			editor: {
				inputs: { keys },
			},
		} = this

		// We want to use the "actual" shift key state,
		// not the one that's in the editor.inputs.shiftKey,
		// because that one uses a short timeout on release
		const shiftKey = keys.has('ShiftLeft')

		const delta = new Vec(0, 0)

		if (keys.has('ArrowLeft')) delta.x += 1
		if (keys.has('ArrowRight')) delta.x -= 1
		if (keys.has('ArrowUp')) delta.y += 1
		if (keys.has('ArrowDown')) delta.y -= 1

		if (delta.equals(new Vec(0, 0))) return

		if (shiftKey) delta.mul(10)

		const shape = editor.getShape(editor.getCroppingShapeId()!) as ShapeWithCrop
		if (!shape) return
		const partial = getTranslateCroppedImageChange(editor, shape, delta)

		if (partial) {
			if (!ephemeral) {
				// We don't want to create new marks if the user
				// is just holding down the arrow keys
				editor.mark('translate crop')
			}

			editor.updateShapes<ShapeWithCrop>([partial])
		}
	}

	private startCloningTranslatingShapes(state: SimpleSelectState & { name: 'translating' }) {
		if (state.isCreating) return

		const { editor } = this

		if (state.didClone) {
			editor.bailToMark('translating')
		}

		editor.mark('translating')

		editor.duplicateShapes(state.selectionSnapshot.movingShapes.map((s) => s.id))
		const snapshot = getTranslatingSnapshot(editor)

		const next = {
			...state,
			isCloning: true,
			didClone: true,
			snapshot: snapshot,
		}

		this.setState<'translating'>(next)
		this.startTranslating(next)
		this.updateTranslatingShapes(next)
	}

	private stopCloningTranslatingShapes(state: SimpleSelectState & { name: 'translating' }) {
		if (state.isCreating) return

		const { editor } = this
		editor.bailToMark('translating')
		editor.mark('translating')

		const next = {
			...state,
			isCloning: false,
			snapshot: state.selectionSnapshot,
		}

		this.setState(next)
		this.updateTranslatingShapes(next)
	}

	private startTranslating(state: SimpleSelectState & { name: 'translating' }) {
		const { editor } = this

		const changes: TLShapePartial[] = []

		state.snapshot.movingShapes.forEach((shape) => {
			const util = editor.getShapeUtil(shape)
			const change = util.onTranslateStart?.(shape)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			editor.updateShapes(changes)
		}

		editor.setHoveredShape(null)
	}

	private updateTranslatingParentTransforms(state: SimpleSelectState & { name: 'translating' }) {
		const { editor } = this
		const { shapeSnapshots } = state.snapshot

		const movingShapes: TLShape[] = []

		shapeSnapshots.forEach((shapeSnapshot) => {
			const shape = editor.getShape(shapeSnapshot.shape.id)
			if (shape) {
				movingShapes.push(shape)
				shapeSnapshot.parentTransform = isPageId(shape.parentId)
					? null
					: Mat.Inverse(editor.getShapePageTransform(shape.parentId)!)
			}
		})
	}

	private updateTranslatingShapes(state: SimpleSelectState & { name: 'translating' }) {
		const { editor } = this
		const { snapshot, dragAndDropManager } = state

		const { movingShapes } = snapshot

		dragAndDropManager.updateDroppingNode(movingShapes, () =>
			this.updateTranslatingParentTransforms(state)
		)

		moveShapesToPoint({
			editor,
			snapshot,
		})

		const changes: TLShapePartial[] = []

		movingShapes.forEach((initialShape) => {
			const currentShape = editor.getShape(initialShape.id)
			if (!currentShape) return
			const change = editor.getShapeUtil(initialShape).onTranslate?.(initialShape, currentShape)
			if (change) {
				changes.push(change)
			}
		})

		if (changes.length > 0) {
			editor.updateShapes(changes)
		}
	}
}

const MAJOR_NUDGE_FACTOR = 10
const MINOR_NUDGE_FACTOR = 1
const GRID_INCREMENT = 5

const SKIPPED_KEYS_FOR_AUTO_EDITING = [
	'Delete',
	'Backspace',
	'[',
	']',
	'Enter',
	' ',
	'Shift',
	'Tab',
]
