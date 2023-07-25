import { EMPTY_ARRAY, atom, computed, transact } from '@tldraw/state'
import { ComputedCache, RecordType } from '@tldraw/store'
import {
	CameraRecordType,
	EmbedDefinition,
	InstancePageStateRecordType,
	PageRecordType,
	StyleProp,
	TLArrowShape,
	TLAsset,
	TLAssetId,
	TLAssetPartial,
	TLCursorType,
	TLDOCUMENT_ID,
	TLDocument,
	TLFrameShape,
	TLGroupShape,
	TLHandle,
	TLINSTANCE_ID,
	TLImageAsset,
	TLInstance,
	TLInstancePageState,
	TLPOINTER_ID,
	TLPage,
	TLPageId,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLStore,
	TLUnknownShape,
	TLVideoAsset,
	Vec2dModel,
	createShapeId,
	getDefaultColorTheme,
	getShapePropKeysByStyle,
	isPageId,
	isShape,
	isShapeId,
} from '@tldraw/tlschema'
import {
	JsonObject,
	annotateError,
	assert,
	compact,
	debounce,
	dedupe,
	deepCopy,
	getOwnProperty,
	hasOwnProperty,
	sortById,
	structuredClone,
} from '@tldraw/utils'
import EventEmitter from 'eventemitter3'
import { TLUser, createTLUser } from '../config/createTLUser'
import { checkShapesAndAddCore } from '../config/defaultShapes'
import {
	ANIMATION_MEDIUM_MS,
	CAMERA_MAX_RENDERING_INTERVAL,
	CAMERA_MOVING_TIMEOUT,
	CAMERA_SLIDE_FRICTION,
	COARSE_DRAG_DISTANCE,
	COLLABORATOR_IDLE_TIMEOUT,
	DEFAULT_ANIMATION_OPTIONS,
	DRAG_DISTANCE,
	FOLLOW_CHASE_PAN_SNAP,
	FOLLOW_CHASE_PAN_UNSNAP,
	FOLLOW_CHASE_PROPORTION,
	FOLLOW_CHASE_ZOOM_SNAP,
	FOLLOW_CHASE_ZOOM_UNSNAP,
	GRID_INCREMENT,
	HIT_TEST_MARGIN,
	INTERNAL_POINTER_IDS,
	MAJOR_NUDGE_FACTOR,
	MAX_PAGES,
	MAX_SHAPES_PER_PAGE,
	MAX_ZOOM,
	MINOR_NUDGE_FACTOR,
	MIN_ZOOM,
	SVG_PADDING,
	ZOOMS,
} from '../constants'
import { Box2d } from '../primitives/Box2d'
import { MatLike, Matrix2d, Matrix2dModel } from '../primitives/Matrix2d'
import { Vec2d, VecLike } from '../primitives/Vec2d'
import { EASINGS } from '../primitives/easings'
import { Geometry2d } from '../primitives/geometry/Geometry2d'
import { Group2d } from '../primitives/geometry/Group2d'
import { intersectPolygonPolygon } from '../primitives/intersect'
import { PI2, approximately, areAnglesCompatible, clamp, pointInPolygon } from '../primitives/utils'
import { ReadonlySharedStyleMap, SharedStyle, SharedStyleMap } from '../utils/SharedStylesMap'
import { WeakMapCache } from '../utils/WeakMapCache'
import { dataUrlToFile } from '../utils/assets'
import { getIncrementedName } from '../utils/getIncrementedName'
import { getReorderingShapesChanges } from '../utils/reorderShapes'
import {
	getIndexAbove,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBetween,
	sortByIndex,
} from '../utils/reordering/reordering'
import { applyRotationToSnapshotShapes, getRotationSnapshot } from '../utils/rotation'
import { uniqueId } from '../utils/uniqueId'
import { arrowBindingsIndex } from './derivations/arrowBindingsIndex'
import { parentsToChildrenWithIndexes } from './derivations/parentsToChildrenWithIndexes'
import { deriveShapeIdsInCurrentPage } from './derivations/shapeIdsInCurrentPage'
import { ClickManager } from './managers/ClickManager'
import { HistoryManager } from './managers/HistoryManager'
import { SnapManager } from './managers/SnapManager'
import { TextManager } from './managers/TextManager'
import { TickManager } from './managers/TickManager'
import { UserPreferencesManager } from './managers/UserPreferencesManager'
import { ShapeUtil, TLResizeMode, TLShapeUtilConstructor } from './shapes/ShapeUtil'
import { ArrowInfo } from './shapes/shared/arrow/arrow-types'
import { getCurvedArrowInfo } from './shapes/shared/arrow/curved-arrow'
import { getArrowTerminalsInArrowSpace, getIsArrowStraight } from './shapes/shared/arrow/shared'
import { getStraightArrowInfo } from './shapes/shared/arrow/straight-arrow'
import { RootState } from './tools/RootState'
import { StateNode, TLStateNodeConstructor } from './tools/StateNode'
import { SvgExportContext, SvgExportDef } from './types/SvgExportContext'
import { TLContent } from './types/clipboard-types'
import { TLEventMap } from './types/emit-types'
import { TLEventInfo, TLPinchEventInfo, TLPointerEventInfo } from './types/event-types'
import { RequiredKeys } from './types/misc-types'
import { TLResizeHandle } from './types/selection-types'

/** @public */
export type TLAnimationOptions = Partial<{
	duration: number
	easing: typeof EASINGS.easeInOutCubic
}>

/** @public */
export type TLViewportOptions = Partial<{
	/** Whether to animate the viewport change or not. Defaults to true. */
	stopFollowing: boolean
}>

/** @public */
export interface TLEditorOptions {
	/**
	 * The Store instance to use for keeping the app's data. This may be prepopulated, e.g. by loading
	 * from a server or database.
	 */
	store: TLStore
	/**
	 * An array of shapes to use in the editor. These will be used to create and manage shapes in the editor.
	 */
	shapeUtils: readonly TLShapeUtilConstructor<TLUnknownShape>[]
	/**
	 * An array of tools to use in the editor. These will be used to handle events and manage user interactions in the editor.
	 */
	tools: readonly TLStateNodeConstructor[]
	/**
	 * A user defined externally to replace the default user.
	 */
	user?: TLUser
	/**
	 * Should return a containing html element which has all the styles applied to the editor. If not
	 * given, the body element will be used.
	 */
	getContainer: () => HTMLElement

	initialState?: string
}

/** @public */
export class Editor extends EventEmitter<TLEventMap> {
	constructor({ store, user, shapeUtils, tools, getContainer, initialState }: TLEditorOptions) {
		super()

		this.store = store

		this.snaps = new SnapManager(this)

		this.user = new UserPreferencesManager(user ?? createTLUser())

		this.getContainer = getContainer ?? (() => document.body)

		this.textMeasure = new TextManager(this)

		class NewRoot extends RootState {
			static override initial = initialState ?? ''
		}

		this.root = new NewRoot(this)
		this.root.children = {}

		const allShapeUtils = checkShapesAndAddCore(shapeUtils)

		const shapeTypesInSchema = new Set(
			Object.keys(store.schema.types.shape.migrations.subTypeMigrations!)
		)
		for (const shapeUtil of allShapeUtils) {
			if (!shapeTypesInSchema.has(shapeUtil.type)) {
				throw Error(
					`Editor and store have different shapes: "${shapeUtil.type}" was passed into the editor but not the schema`
				)
			}
			shapeTypesInSchema.delete(shapeUtil.type)
		}
		if (shapeTypesInSchema.size > 0) {
			throw Error(
				`Editor and store have different shapes: "${
					[...shapeTypesInSchema][0]
				}" is present in the store schema but not provided to the editor`
			)
		}
		const _shapeUtils = {} as Record<string, ShapeUtil<any>>
		const _styleProps = {} as Record<string, Map<StyleProp<unknown>, string>>
		const allStylesById = new Map<string, StyleProp<unknown>>()

		for (const Util of allShapeUtils) {
			const util = new Util(this)
			_shapeUtils[Util.type] = util

			const propKeysByStyle = getShapePropKeysByStyle(Util.props ?? {})
			_styleProps[Util.type] = propKeysByStyle

			for (const style of propKeysByStyle.keys()) {
				if (!allStylesById.has(style.id)) {
					allStylesById.set(style.id, style)
				} else if (allStylesById.get(style.id) !== style) {
					throw Error(
						`Multiple style props with id "${style.id}" in use. Style prop IDs must be unique.`
					)
				}
			}
		}

		this.shapeUtils = _shapeUtils
		this.styleProps = _styleProps

		// Tools.
		// Accept tools from constructor parameters which may not conflict with the root note's default or
		// "baked in" tools, select and zoom.
		for (const Tool of [...tools]) {
			if (hasOwnProperty(this.root.children!, Tool.id)) {
				throw Error(`Can't override tool with id "${Tool.id}"`)
			}
			this.root.children![Tool.id] = new Tool(this, this.root)
		}

		if (typeof window !== 'undefined' && 'navigator' in window) {
			this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
			this.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
			this.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
			this.isFirefox = /firefox/i.test(navigator.userAgent)
			this.isAndroid = /android/i.test(navigator.userAgent)
		} else {
			this.isSafari = false
			this.isIos = false
			this.isChromeForIos = false
			this.isFirefox = false
			this.isAndroid = false
		}

		this.store.onBeforeDelete = (record) => {
			if (record.typeName === 'shape') {
				this._shapeWillBeDeleted(record)
			} else if (record.typeName === 'page') {
				this._pageWillBeDeleted(record)
			}
		}

		this.store.onAfterChange = (prev, next) => {
			this._updateDepth++
			if (this._updateDepth > 1000) {
				console.error('[onAfterChange] Maximum update depth exceeded, bailing out.')
			}
			if (prev.typeName === 'shape' && next.typeName === 'shape') {
				this._shapeDidChange(prev, next)
			} else if (
				prev.typeName === 'instance_page_state' &&
				next.typeName === 'instance_page_state'
			) {
				this._pageStateDidChange(prev, next)
			}

			this._updateDepth--
		}
		this.store.onAfterCreate = (record) => {
			if (record.typeName === 'shape' && this.isShapeOfType<TLArrowShape>(record, 'arrow')) {
				this._arrowDidUpdate(record)
			}
			if (record.typeName === 'page') {
				const cameraId = CameraRecordType.createId(record.id)
				const _pageStateId = InstancePageStateRecordType.createId(record.id)
				if (!this.store.has(cameraId)) {
					this.store.put([CameraRecordType.create({ id: cameraId })])
				}
				if (!this.store.has(_pageStateId)) {
					this.store.put([
						InstancePageStateRecordType.create({ id: _pageStateId, pageId: record.id }),
					])
				}
			}
		}

		this._currentPageShapeIds = deriveShapeIdsInCurrentPage(this.store, () => this.currentPageId)
		this._parentIdsToChildIds = parentsToChildrenWithIndexes(this.store)

		this.disposables.add(
			this.store.listen((changes) => {
				this.emit('change', changes)
			})
		)

		const container = this.getContainer()

		// We need to debounce this because when focus changes, the body
		// becomes focused for a brief moment. Debouncing means that we
		// check only when focus stops changing: when it settles, what
		// has it settled on? If it's settled on the container or something
		// inside of the container, then focus or preserve the current focus;
		// if not, then turn off focus. Turning off focus is a trigger to
		// also turn off keyboard shortcuts and other things.
		const updateFocus = debounce(() => {
			const { activeElement } = document
			const { isFocused } = this.instanceState
			const hasFocus = container === activeElement || container.contains(activeElement)
			if ((!isFocused && hasFocus) || (isFocused && !hasFocus)) {
				this.updateInstanceState({ isFocused: hasFocus })
			}
		}, 32)

		container.addEventListener('focusin', updateFocus)
		container.addEventListener('focus', updateFocus)
		container.addEventListener('focusout', updateFocus)
		container.addEventListener('blur', updateFocus)

		this.disposables.add(() => {
			container.removeEventListener('focusin', updateFocus)
			container.removeEventListener('focus', updateFocus)
			container.removeEventListener('focusout', updateFocus)
			container.removeEventListener('blur', updateFocus)
		})

		this.store.ensureStoreIsUsable()

		// clear ephemeral state
		this._setInstancePageState(
			{
				editingId: null,
				hoveredId: null,
				erasingIds: [],
			},
			true
		)

		if (initialState && this.root.children[initialState] === undefined) {
			throw Error(`No state found for initialState "${initialState}".`)
		}

		this.root.enter(undefined, 'initial')

		if (this.instanceState.followingUserId) {
			this.stopFollowingUser()
		}

		this.updateRenderingBounds()

		requestAnimationFrame(() => {
			this._tickManager.start()
		})
	}

	/**
	 * The editor's store
	 *
	 * @public
	 */
	readonly store: TLStore

	/**
	 * The root state of the statechart.
	 *
	 * @public
	 */
	readonly root: RootState

	/**
	 * A set of functions to call when the app is disposed.
	 *
	 * @public
	 */
	readonly disposables = new Set<() => void>()

	/** @internal */
	private _tickManager = new TickManager(this)

	/** @internal */
	private _updateDepth = 0

	/**
	 * A manager for the app's snapping feature.
	 *
	 * @public
	 */
	readonly snaps: SnapManager

	/**
	 * A manager for the user and their preferences.
	 *
	 * @public
	 */
	readonly user: UserPreferencesManager

	/**
	 * A helper for measuring text.
	 *
	 * @public
	 */
	readonly textMeasure: TextManager

	/**
	 * Whether the editor is running in Safari.
	 *
	 * @public
	 */
	readonly isSafari: boolean

	/**
	 * Whether the editor is running on iOS.
	 *
	 * @public
	 */
	readonly isIos: boolean

	/**
	 * Whether the editor is running on iOS.
	 *
	 * @public
	 */
	readonly isChromeForIos: boolean

	/**
	 * Whether the editor is running on Firefox.
	 *
	 * @public
	 */
	readonly isFirefox: boolean

	/**
	 * Whether the editor is running on Android.
	 *
	 * @public
	 */
	readonly isAndroid: boolean

	/**
	 * The current HTML element containing the editor.
	 *
	 * @example
	 * ```ts
	 * const container = editor.getContainer()
	 * ```
	 *
	 * @public
	 */
	getContainer: () => HTMLElement

	/**
	 * Dispose the editor.
	 *
	 * @public
	 */
	dispose() {
		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()
	}

	/* ------------------- Shape Utils ------------------ */

	/**
	 * A map of shape utility classes (TLShapeUtils) by shape type.
	 *
	 * @public
	 */
	shapeUtils: { readonly [K in string]?: ShapeUtil<TLUnknownShape> }

	styleProps: { [key: string]: Map<StyleProp<unknown>, string> }

	/**
	 * Get a shape util from a shape itself.
	 *
	 * @example
	 * ```ts
	 * const util = editor.getShapeUtil(myArrowShape)
	 * const util = editor.getShapeUtil('arrow')
	 * const util = editor.getShapeUtil<TLArrowShape>(myArrowShape)
	 * const util = editor.getShapeUtil(TLArrowShape)('arrow')
	 * ```
	 *
	 * @param shape - A shape, shape partial, or shape type.
	 *
	 * @public
	 */
	getShapeUtil<S extends TLUnknownShape>(shape: S | TLShapePartial<S>): ShapeUtil<S>
	getShapeUtil<S extends TLUnknownShape>(type: S['type']): ShapeUtil<S>
	getShapeUtil<T extends ShapeUtil>(type: T extends ShapeUtil<infer R> ? R['type'] : string): T
	getShapeUtil(arg: string | { type: string }) {
		const type = typeof arg === 'string' ? arg : arg.type
		const shapeUtil = getOwnProperty(this.shapeUtils, type)
		assert(shapeUtil, `No shape util found for type "${type}"`)
		return shapeUtil
	}

	/* --------------------- History -------------------- */

	/**
	 * A manager for the app's history.
	 *
	 * @readonly
	 */
	readonly history = new HistoryManager(
		this,
		() => this._complete(),
		(error) => {
			this.annotateError(error, { origin: 'history.batch', willCrashApp: true })
			this.crash(error)
		}
	)

	/**
	 * Undo to the last mark.
	 *
	 * @example
	 * ```ts
	 * editor.undo()
	 * ```
	 *
	 * @public
	 */
	undo() {
		return this.history.undo()
	}

	/**
	 * Whether the app can undo.
	 *
	 * @public
	 */
	@computed get canUndo() {
		return this.history.numUndos > 0
	}

	/**
	 * Redo to the next mark.
	 *
	 * @example
	 * ```ts
	 * editor.redo()
	 * ```
	 *
	 * @public
	 */
	redo() {
		this.history.redo()
		return this
	}

	/**
	 * Whether the app can redo.
	 *
	 * @public
	 */
	@computed get canRedo() {
		return this.history.numRedos > 0
	}

	/**
	 * Create a new "mark", or stopping point, in the undo redo history. Creating a mark will clear
	 * any redos.
	 *
	 * @example
	 * ```ts
	 * editor.mark()
	 * editor.mark('flip shapes')
	 * ```
	 *
	 * @param markId - The mark's id, usually the reason for adding the mark.
	 * @param onUndo - Whether to stop at the mark when undoing.
	 * @param onRedo - Whether to stop at the mark when redoing.
	 *
	 * @public
	 */
	mark(markId?: string, onUndo?: boolean, onRedo?: boolean) {
		return this.history.mark(markId, onUndo, onRedo)
	}

	/**
	 * Clear all marks in the undo stack back to the next mark.
	 *
	 * @example
	 * ```ts
	 * editor.bail()
	 * ```
	 *
	 * @public
	 */
	bail() {
		this.history.bail()
		return this
	}

	/**
	 * Clear all marks in the undo stack back to the mark with the provided mark id.
	 *
	 * @example
	 * ```ts
	 * editor.bailToMark('dragging')
	 * ```
	 *
	 * @public
	 */
	bailToMark(id: string) {
		this.history.bailToMark(id)
		return this
	}

	/**
	 * Run a function in a batch, which will be undone/redone as a single action.
	 *
	 * @example
	 * ```ts
	 * editor.batch(() => {
	 * 	editor.selectAll()
	 * 	editor.deleteShapes(editor.selectedIds)
	 * 	editor.createShapes(myShapes)
	 * 	editor.selectNone()
	 * })
	 *
	 * editor.undo() // will undo all of the above
	 * ```
	 *
	 * @public
	 */
	batch(fn: () => void) {
		this.history.batch(fn)
		return this
	}

	/* --------------------- Arrows --------------------- */
	// todo: move these to tldraw or replace with a bindings API

	/** @internal */
	@computed
	private get _arrowBindingsIndex() {
		return arrowBindingsIndex(this)
	}

	/**
	 * Get all arrows bound to a shape.
	 *
	 * @param shapeId - The id of the shape.
	 *
	 * @public
	 */
	getArrowsBoundTo(shapeId: TLShapeId) {
		return this._arrowBindingsIndex.value[shapeId] || EMPTY_ARRAY
	}

	/** @internal */
	private _reparentArrow(arrowId: TLShapeId) {
		const arrow = this.getShape<TLArrowShape>(arrowId)
		if (!arrow) return
		const { start, end } = arrow.props
		const startShape = start.type === 'binding' ? this.getShape(start.boundShapeId) : undefined
		const endShape = end.type === 'binding' ? this.getShape(end.boundShapeId) : undefined

		const parentPageId = this.getAncestorPageId(arrow)
		if (!parentPageId) return

		let nextParentId: TLParentId
		if (startShape && endShape) {
			// if arrow has two bindings, always parent arrow to closest common ancestor of the bindings
			nextParentId = this.findCommonAncestor([startShape, endShape]) ?? parentPageId
		} else if (startShape || endShape) {
			// if arrow has one binding, keep arrow on its own page
			nextParentId = parentPageId
		} else {
			return
		}

		if (nextParentId && nextParentId !== arrow.parentId) {
			this.reparentShapes([arrowId], nextParentId)
		}

		const reparentedArrow = this.getShape<TLArrowShape>(arrowId)
		if (!reparentedArrow) throw Error('no reparented arrow')

		const startSibling = this.getShapeNearestSibling(reparentedArrow, startShape)
		const endSibling = this.getShapeNearestSibling(reparentedArrow, endShape)

		let highestSibling: TLShape | undefined

		if (startSibling && endSibling) {
			highestSibling = startSibling.index > endSibling.index ? startSibling : endSibling
		} else if (startSibling && !endSibling) {
			highestSibling = startSibling
		} else if (endSibling && !startSibling) {
			highestSibling = endSibling
		} else {
			return
		}

		let finalIndex: string

		const higherSiblings = this.getSortedChildIds(highestSibling.parentId)
			.map((id) => this.getShape(id)!)
			.filter((sibling) => sibling.index > highestSibling!.index)

		if (higherSiblings.length) {
			// there are siblings above the highest bound sibling, we need to
			// insert between them.

			// if the next sibling is also a bound arrow though, we can end up
			// all fighting for the same indexes. so lets find the next
			// non-arrow sibling...
			const nextHighestNonArrowSibling = higherSiblings.find((sibling) => sibling.type !== 'arrow')

			if (
				// ...then, if we're above the last shape we want to be above...
				reparentedArrow.index > highestSibling.index &&
				// ...but below the next non-arrow sibling...
				(!nextHighestNonArrowSibling || reparentedArrow.index < nextHighestNonArrowSibling.index)
			) {
				// ...then we're already in the right place. no need to update!
				return
			}

			// otherwise, we need to find the index between the highest sibling
			// we want to be above, and the next highest sibling we want to be
			// below:
			finalIndex = getIndexBetween(highestSibling.index, higherSiblings[0].index)
		} else {
			// if there are no siblings above us, we can just get the next index:
			finalIndex = getIndexAbove(highestSibling.index)
		}

		if (finalIndex !== reparentedArrow.index) {
			this.updateShapes<TLArrowShape>([{ id: arrowId, type: 'arrow', index: finalIndex }])
		}
	}

	/** @internal */
	private _unbindArrowTerminal(arrow: TLArrowShape, handleId: 'start' | 'end') {
		const { x, y } = getArrowTerminalsInArrowSpace(this, arrow)[handleId]
		this.store.put([{ ...arrow, props: { ...arrow.props, [handleId]: { type: 'point', x, y } } }])
	}

	@computed
	private get arrowInfoCache() {
		return this.store.createComputedCache<ArrowInfo, TLArrowShape>('arrow infoCache', (shape) => {
			return getIsArrowStraight(shape)
				? getStraightArrowInfo(this, shape)
				: getCurvedArrowInfo(this, shape)
		})
	}

	getArrowInfo(shape: TLArrowShape) {
		return this.arrowInfoCache.get(shape.id)
	}

	// private _shapeWillUpdate = (prev: TLShape, next: TLShape) => {
	// 	const update = this.getShapeUtil(next).onUpdate?.(prev, next)
	// 	return update ?? next
	// }

	/** @internal */
	private _shapeWillBeDeleted(deletedShape: TLShape) {
		// if the deleted shape has a parent shape make sure we call it's onChildrenChange callback
		if (deletedShape.parentId && isShapeId(deletedShape.parentId)) {
			this._invalidParents.add(deletedShape.parentId)
		}
		// clean up any arrows bound to this shape
		const bindings = this._arrowBindingsIndex.value[deletedShape.id]
		if (bindings?.length) {
			for (const { arrowId, handleId } of bindings) {
				const arrow = this.getShape<TLArrowShape>(arrowId)
				if (!arrow) continue
				this._unbindArrowTerminal(arrow, handleId)
			}
		}
		const deletedIds = new Set([deletedShape.id])
		const updates = compact(
			this.pageStates.map((pageState) => {
				return this._cleanupInstancePageState(pageState, deletedIds)
			})
		)

		if (updates.length) {
			this.store.put(updates)
		}
	}

	/** @internal */
	private _arrowDidUpdate(arrow: TLArrowShape) {
		// if the shape is an arrow and its bound shape is on another page
		// or was deleted, unbind it
		for (const handle of ['start', 'end'] as const) {
			const terminal = arrow.props[handle]
			if (terminal.type !== 'binding') continue
			const boundShape = this.getShape(terminal.boundShapeId)
			const isShapeInSamePageAsArrow =
				this.getAncestorPageId(arrow) === this.getAncestorPageId(boundShape)
			if (!boundShape || !isShapeInSamePageAsArrow) {
				this._unbindArrowTerminal(arrow, handle)
			}
		}

		// always check the arrow parents
		this._reparentArrow(arrow.id)
	}

	/**
	 * _invalidParents is used to trigger the 'onChildrenChange' callback that shapes can have.
	 *
	 * @internal
	 */
	private readonly _invalidParents = new Set<TLShapeId>()

	/** @internal */
	private _complete() {
		for (const parentId of this._invalidParents) {
			this._invalidParents.delete(parentId)
			const parent = this.getShape(parentId)
			if (!parent) continue

			const util = this.getShapeUtil(parent)
			const changes = util.onChildrenChange?.(parent)

			if (changes?.length) {
				this.updateShapes(changes, true)
			}
		}

		this.emit('update')
	}

	/** @internal */
	private _shapeDidChange(prev: TLShape, next: TLShape) {
		if (this.isShapeOfType<TLArrowShape>(next, 'arrow')) {
			this._arrowDidUpdate(next)
		}

		// if the shape's parent changed and it is bound to an arrow, update the arrow's parent
		if (prev.parentId !== next.parentId) {
			const reparentBoundArrows = (id: TLShapeId) => {
				const boundArrows = this._arrowBindingsIndex.value[id]
				if (boundArrows?.length) {
					for (const arrow of boundArrows) {
						this._reparentArrow(arrow.arrowId)
					}
				}
			}
			reparentBoundArrows(next.id)
			this.visitDescendants(next.id, reparentBoundArrows)
		}

		// if this shape moved to a new page, clean up any previous page's instance state
		if (prev.parentId !== next.parentId && isPageId(next.parentId)) {
			const allMovingIds = new Set([prev.id])
			this.visitDescendants(prev.id, (id) => {
				allMovingIds.add(id)
			})

			for (const instancePageState of this.pageStates) {
				if (instancePageState.pageId === next.parentId) continue
				const nextPageState = this._cleanupInstancePageState(instancePageState, allMovingIds)

				if (nextPageState) {
					this.store.put([nextPageState])
				}
			}
		}

		if (prev.parentId && isShapeId(prev.parentId)) {
			this._invalidParents.add(prev.parentId)
		}

		if (next.parentId !== prev.parentId && isShapeId(next.parentId)) {
			this._invalidParents.add(next.parentId)
		}
	}

	/** @internal */
	private _pageStateDidChange(prev: TLInstancePageState, next: TLInstancePageState) {
		if (prev?.selectedIds !== next?.selectedIds) {
			// ensure that descendants and ancestors are not selected at the same time
			const filtered = next.selectedIds.filter((id) => {
				let parentId = this.getShape(id)?.parentId
				while (isShapeId(parentId)) {
					if (next.selectedIds.includes(parentId)) {
						return false
					}
					parentId = this.getShape(parentId)?.parentId
				}
				return true
			})

			let nextFocusLayerId: null | TLShapeId = null

			if (filtered.length > 0) {
				const commonGroupAncestor = this.findCommonAncestor(
					compact(filtered.map((id) => this.getShape(id))),
					(shape) => this.isShapeOfType<TLGroupShape>(shape, 'group')
				)

				if (commonGroupAncestor) {
					nextFocusLayerId = commonGroupAncestor
				}
			} else {
				if (next?.focusLayerId) {
					nextFocusLayerId = next.focusLayerId
				}
			}

			if (filtered.length !== next.selectedIds.length || nextFocusLayerId !== next.focusLayerId) {
				this.store.put([{ ...next, selectedIds: filtered, focusLayerId: nextFocusLayerId ?? null }])
			}
		}
	}

	/** @internal */
	private _pageWillBeDeleted(page: TLPage) {
		// page was deleted, need to check whether it's the current page and select another one if so
		if (this.instanceState.currentPageId !== page.id) return

		const backupPageId = this.pages.find((p) => p.id !== page.id)?.id
		if (!backupPageId) return
		this.store.put([{ ...this.instanceState, currentPageId: backupPageId }])

		// delete the camera and state for the page if necessary
		const cameraId = CameraRecordType.createId(page.id)
		const instance_PageStateId = InstancePageStateRecordType.createId(page.id)
		this.store.remove([cameraId, instance_PageStateId])
	}

	/* --------------------- Errors --------------------- */

	/** @internal */
	annotateError(
		error: unknown,
		{
			origin,
			willCrashApp,
			tags,
			extras,
		}: {
			origin: string
			willCrashApp: boolean
			tags?: Record<string, string | boolean | number>
			extras?: Record<string, unknown>
		}
	) {
		const defaultAnnotations = this.createErrorAnnotations(origin, willCrashApp)
		annotateError(error, {
			tags: { ...defaultAnnotations.tags, ...tags },
			extras: { ...defaultAnnotations.extras, ...extras },
		})
		if (willCrashApp) {
			this.store.markAsPossiblyCorrupted()
		}
	}

	/** @internal */
	createErrorAnnotations(
		origin: string,
		willCrashApp: boolean | 'unknown'
	): {
		tags: { origin: string; willCrashApp: boolean | 'unknown' }
		extras: {
			activeStateNode?: string
			selectedShapes?: TLUnknownShape[]
			editingShape?: TLUnknownShape
			inputs?: Record<string, unknown>
		}
	} {
		try {
			return {
				tags: {
					origin: origin,
					willCrashApp,
				},
				extras: {
					activeStateNode: this.root.path.value,
					selectedShapes: this.selectedShapes,
					editingShape: this.editingId ? this.getShape(this.editingId) : undefined,
					inputs: this.inputs,
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
	private _crashingError: unknown | null = null

	/**
	 * We can't use an `atom` here because there's a chance that when `crashAndReportError` is called,
	 * we're in a transaction that's about to be rolled back due to the same error we're currently
	 * reporting.
	 *
	 * Instead, to listen to changes to this value, you need to listen to app's `crash` event.
	 *
	 * @internal
	 */
	get crashingError() {
		return this._crashingError
	}

	/** @internal */
	crash(error: unknown) {
		this._crashingError = error
		this.store.markAsPossiblyCorrupted()
		this.emit('crash', { error })
	}

	/* ------------------- Statechart ------------------- */

	/**
	 * Get whether a certain tool (or other state node) is currently active.
	 *
	 * @example
	 * ```ts
	 * editor.isIn('select')
	 * editor.isIn('select.brushing')
	 * ```
	 *
	 * @param path - The path of active states, separated by periods.
	 *
	 * @public
	 */
	isIn(path: string): boolean {
		const ids = path.split('.').reverse()
		let state = this.root as StateNode
		while (ids.length > 0) {
			const id = ids.pop()
			if (!id) return true
			const current = state.current.value
			if (current?.id === id) {
				if (ids.length === 0) return true
				state = current
				continue
			} else return false
		}
		return false
	}

	/**
	 * Get whether the state node is in any of the given active paths.
	 *
	 * @example
	 * ```ts
	 * state.isInAny('select', 'erase')
	 * state.isInAny('select.brushing', 'erase.idle')
	 * ```
	 *
	 * @public
	 */
	isInAny(...paths: string[]): boolean {
		return paths.some((path) => this.isIn(path))
	}

	/**
	 * Set the selected tool.
	 *
	 * @example
	 * ```ts
	 * editor.setCurrentTool('hand')
	 * editor.setCurrentTool('hand', { date: Date.now() })
	 * ```
	 *
	 * @param id - The id of the tool to select.
	 * @param info - Arbitrary data to pass along into the transition.
	 *
	 * @public
	 */
	setCurrentTool(id: string, info = {}): this {
		this.root.transition(id, info)
		return this
	}
	/**
	 * The current selected tool.
	 *
	 * @public
	 */
	@computed get currentTool(): StateNode | undefined {
		return this.root.current.value
	}

	/**
	 * The id of the current selected tool.
	 *
	 * @public
	 */
	@computed get currentToolId(): string {
		const { currentTool } = this
		if (!currentTool) return ''
		return currentTool.currentToolIdMask ?? currentTool.id
	}

	/**
	 * Get a descendant by its path.
	 *
	 * @example
	 * ```ts
	 * state.getStateDescendant('select')
	 * state.getStateDescendant('select.brushing')
	 * ```
	 *
	 * @param path - The descendant's path of state ids, separated by periods.
	 *
	 * @public
	 */
	getStateDescendant(path: string): StateNode | undefined {
		const ids = path.split('.').reverse()
		let state = this.root as StateNode
		while (ids.length > 0) {
			const id = ids.pop()
			if (!id) return state
			const childState = state.children?.[id]
			if (!childState) return undefined
			state = childState
		}
		return state
	}

	/* ---------------- Document Settings --------------- */

	/**
	 * The global document settings that apply to all users.
	 *
	 * @public
	 **/
	@computed get documentSettings() {
		return this.store.get(TLDOCUMENT_ID)!
	}

	/**
	 * Update the global document settings that apply to all users.
	 *
	 * @public
	 **/
	updateDocumentSettings(settings: Partial<TLDocument>): this {
		this.store.put([{ ...this.documentSettings, ...settings }])
		return this
	}

	/* ----------------- Instance State ----------------- */

	/**
	 * The current instance's state.
	 *
	 * @public
	 */
	@computed get instanceState(): TLInstance {
		return this.store.get(TLINSTANCE_ID)!
	}

	/**
	 * Update the instance's state.
	 *
	 * @param partial - A partial object to update the instance state with.
	 * @param ephemeral - Whether the change is ephemeral. Ephemeral changes don't get added to the undo/redo stack. Defaults to false.
	 * @param squashing - Whether the change will be squashed into the existing history entry rather than creating a new one. Defaults to false.
	 *
	 * @public
	 */
	updateInstanceState(
		partial: Partial<Omit<TLInstance, 'currentPageId'>>,
		ephemeral = true,
		squashing = true
	) {
		this._updateInstanceState(partial, ephemeral, squashing)

		if (partial.isChangingStyle !== undefined) {
			clearTimeout(this._isChangingStyleTimeout)
			if (partial.isChangingStyle === true) {
				// If we've set to true, set a new reset timeout to change the value back to false after 2 seconds
				this._isChangingStyleTimeout = setTimeout(() => {
					this.updateInstanceState({ isChangingStyle: false })
				}, 2000)
			}
		}

		return this
	}

	/** @internal */
	private _updateInstanceState = this.history.createCommand(
		'updateInstanceState',
		(partial: Partial<Omit<TLInstance, 'currentPageId'>>, ephemeral = false, squashing = false) => {
			const prev = this.instanceState
			const next = { ...prev, ...partial }

			return {
				data: { prev, next },
				squashing,
				ephemeral,
			}
		},
		{
			do: ({ next }) => {
				this.store.put([next])
			},
			undo: ({ prev }) => {
				this.store.put([prev])
			},
			squash({ prev }, { next }) {
				return { prev, next }
			},
		}
	)

	/** @internal */
	private _isChangingStyleTimeout = -1 as any

	focus = () => {
		this.getContainer().focus()
	}

	blur = () => {
		this.getContainer().blur()
	}

	// Menus

	/**
	 * A set of strings representing any open menus. When menus are open,
	 * certain interactions will behave differently; for example, when a
	 * draw tool is selected and a menu is open, a pointer-down will not
	 * create a dot (because the user is probably trying to close the menu)
	 * however a pointer-down event followed by a drag will begin drawing
	 * a line (because the user is BOTH trying to close the menu AND start
	 * drawing a line).
	 *
	 * @public
	 */
	@computed get openMenus(): string[] {
		return this.instanceState.openMenus
	}

	/**
	 * Add an open menu.
	 *
	 * @example
	 * ```ts
	 * editor.addOpenMenu('menu-id')
	 * ```
	 *
	 * @public
	 */
	addOpenMenu(id: string): this {
		const menus = new Set(this.openMenus)
		if (!menus.has(id)) {
			menus.add(id)
			this.updateInstanceState({ openMenus: [...menus] })
		}
		return this
	}

	/**
	 * Delete an open menu.
	 *
	 * @example
	 * ```ts
	 * editor.deleteOpenMenu('menu-id')
	 * ```
	 *
	 * @public
	 */
	deleteOpenMenu(id: string): this {
		const menus = new Set(this.openMenus)
		if (menus.has(id)) {
			menus.delete(id)
			this.updateInstanceState({ openMenus: [...menus] })
		}
		return this
	}

	/**
	 * Get whether any menus are open.
	 *
	 * @example
	 * ```ts
	 * editor.isMenuOpen()
	 * ```
	 *
	 * @public
	 */
	@computed get isMenuOpen(): boolean {
		return this.openMenus.length > 0
	}

	/* ------------------- Page State ------------------- */

	/**
	 * Page states.
	 *
	 * @public
	 */
	@computed get pageStates(): TLInstancePageState[] {
		return this._pageStates.value
	}
	/** @internal */
	@computed private get _pageStates() {
		return this.store.query.records('instance_page_state')
	}

	/**
	 * The current page state.
	 *
	 * @public
	 */
	@computed get currentPageState(): TLInstancePageState {
		return this.store.get(this._currentPageStateId)!
	}
	/** @internal */
	@computed private get _currentPageStateId() {
		return InstancePageStateRecordType.createId(this.currentPageId)
	}

	/**
	 * Update this instance's page state.
	 *
	 * @example
	 * ```ts
	 * editor.updateInstancePageState({ id: 'page1', editingId: 'shape:123' })
	 * editor.updateInstancePageState({ id: 'page1', editingId: 'shape:123' }, true)
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 * @param ephemeral - Whether the command is ephemeral.
	 *
	 * @public
	 */
	updateCurrentPageState(
		partial: Partial<
			Omit<TLInstancePageState, 'selectedIds' | 'editingId' | 'pageId' | 'focusLayerId'>
		>,
		ephemeral = false
	): this {
		this._setInstancePageState(partial, ephemeral)
		return this
	}

	/** @internal */
	private _setInstancePageState = this.history.createCommand(
		'setInstancePageState',
		(partial: Partial<Omit<TLInstancePageState, 'selectedIds'>>, ephemeral = false) => {
			const prev = this.store.get(partial.id ?? this.currentPageState.id)!
			return { data: { prev, partial }, ephemeral }
		},
		{
			do: ({ prev, partial }) => {
				this.store.update(prev.id, (state) => ({ ...state, ...partial }))
			},
			undo: ({ prev }) => {
				this.store.update(prev.id, () => prev)
			},
		}
	)

	/**
	 * The current selected ids.
	 *
	 * @public
	 */
	@computed get selectedIds() {
		return this.currentPageState.selectedIds
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setSelectedIds(['id1'])
	 * editor.setSelectedIds(['id1', 'id2'])
	 * ```
	 *
	 * @param ids - The ids to select.
	 * @param squashing - Whether the change should create a new history entry or combine with the
	 *   previous (if the previous is the same type).
	 *
	 * @public
	 */
	setSelectedIds(ids: TLShapeId[], squashing = false) {
		this._setSelectedIds(ids, squashing)
		return this
	}

	/** @internal */
	private _setSelectedIds = this.history.createCommand(
		'setSelectedIds',
		(ids: TLShapeId[], squashing = false) => {
			const { selectedIds: prevSelectedIds } = this.currentPageState
			const prevSet = new Set(prevSelectedIds)

			if (ids.length === prevSet.size && ids.every((id) => prevSet.has(id))) return null

			return {
				data: { selectedIds: ids, prevSelectedIds },
				squashing,
				preservesRedoStack: true,
			}
		},
		{
			do: ({ selectedIds }) => {
				this.store.put([{ ...this.currentPageState, selectedIds }])
			},
			undo: ({ prevSelectedIds }) => {
				this.store.put([
					{
						...this.currentPageState,
						selectedIds: prevSelectedIds,
					},
				])
			},
			squash({ prevSelectedIds }, { selectedIds }) {
				return {
					selectedIds,
					prevSelectedIds,
				}
			},
		}
	)

	/**
	 * Determine whether or not any of a shape's ancestors are selected.
	 *
	 * @param id - The id of the shape to check.
	 *
	 * @public
	 */
	isAncestorSelected(id: TLShapeId): boolean
	isAncestorSelected(shape: TLShape): boolean
	isAncestorSelected(arg: TLShape | TLShapeId) {
		const shape = this.getShape(typeof arg === 'string' ? arg : arg.id)
		if (!shape) return false
		const { selectedIds } = this
		return !!this.findAncestor(shape, (parent) => selectedIds.includes(parent.id))
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.select('id1')
	 * editor.select('id1', 'id2')
	 * ```
	 *
	 * @param ids - The ids to select.
	 *
	 * @public
	 */
	select(...ids: TLShapeId[]): this
	select(...shapes: TLShape[]): this
	select(...arg: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof arg[0] === 'string'
				? (arg as TLShapeId[])
				: (arg as TLShape[]).map((shape) => shape.id)
		this.setSelectedIds(ids)
		return this
	}

	/**
	 * Remove a shape from the existing set of selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.deselect(shape.id)
	 * ```
	 *
	 * @public
	 */
	deselect(...ids: TLShapeId[]): this
	deselect(...shapes: TLShape[]): this
	deselect(..._ids: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof _ids[0] === 'string'
				? (_ids as TLShapeId[])
				: (_ids as TLShape[]).map((shape) => shape.id)
		const { selectedIds } = this
		if (selectedIds.length > 0 && ids.length > 0) {
			this.setSelectedIds(selectedIds.filter((id) => !ids.includes(id)))
		}
		return this
	}

	/**
	 * Select all direct children of the current page.
	 *
	 * @example
	 * ```ts
	 * editor.selectAll()
	 * ```
	 *
	 * @public
	 */
	selectAll() {
		const ids = this.getSortedChildIds(this.currentPageId)
		// page might have no shapes
		if (ids.length <= 0) return this
		this.setSelectedIds(this._getUnlockedShapeIds(ids))

		return this
	}

	/**
	 * Clear the selection.
	 *
	 * @example
	 * ```ts
	 * editor.selectNone()
	 * ```
	 *
	 * @public
	 */
	selectNone(): this {
		if (this.selectedIds.length > 0) {
			this.setSelectedIds([])
		}

		return this
	}

	/**
	 * An array containing all of the currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.selectedShapes
	 * ```
	 *
	 * @public
	 * @readonly
	 */
	@computed get selectedShapes(): TLShape[] {
		const { selectedIds } = this.currentPageState
		return compact(selectedIds.map((id) => this.store.get(id)))
	}

	/**
	 * The app's only selected shape.
	 *
	 * @example
	 * ```ts
	 * editor.onlySelectedShape
	 * ```
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected
	 *   shape.
	 *
	 * @public
	 * @readonly
	 */
	@computed get onlySelectedShape(): TLShape | null {
		const { selectedShapes } = this
		return selectedShapes.length === 1 ? selectedShapes[0] : null
	}

	/**
	 * The current page bounds of all the selected shapes (Not the same thing as the page bounds of
	 * the selection bounding box when the selection has been rotated)
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get selectedPageBounds(): Box2d | null {
		const {
			currentPageState: { selectedIds },
		} = this

		if (selectedIds.length === 0) return null

		return Box2d.Common(compact(selectedIds.map((id) => this.getPageBounds(id))))
	}

	/**
	 * The rotation of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionRotation(): number {
		const { selectedIds } = this
		if (selectedIds.length === 0) {
			return 0
		}
		if (selectedIds.length === 1) {
			return this.getPageTransform(this.selectedIds[0])!.rotation()
		}

		const allRotations = selectedIds.map((id) => this.getPageTransform(id)!.rotation())
		// if the rotations are all compatible with each other, return the rotation of any one of them
		if (allRotations.every((rotation) => Math.abs(rotation - allRotations[0]) < Math.PI / 180)) {
			return this.getPageTransform(selectedIds[0])!.rotation()
		}
		return 0
	}

	/**
	 * The bounds of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionBounds(): Box2d | undefined {
		const { selectedIds } = this

		if (selectedIds.length === 0) {
			return undefined
		}

		const { selectionRotation } = this
		if (selectionRotation === 0) {
			return this.selectedPageBounds!
		}

		if (selectedIds.length === 1) {
			const bounds = this.getGeometry(selectedIds[0]).bounds.clone()
			bounds.point = Matrix2d.applyToPoint(this.getPageTransform(selectedIds[0])!, bounds.point)
			return bounds
		}

		// need to 'un-rotate' all the outlines of the existing nodes so we can fit them inside a box
		const allPoints = this.selectedIds
			.flatMap((id) => {
				const pageTransform = this.getPageTransform(id)
				if (!pageTransform) return []
				return pageTransform.applyToPoints(this.getGeometry(id).vertices)
			})
			.map((p) => Vec2d.Rot(p, -selectionRotation))
		const box = Box2d.FromPoints(allPoints)
		// now position box so that it's top-left corner is in the right place
		box.point = box.point.rot(selectionRotation)
		return box
	}

	/**
	 * The center of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionPageCenter() {
		const { selectionBounds, selectionRotation } = this
		if (!selectionBounds) return null
		return Vec2d.RotWith(selectionBounds.center, selectionBounds.point, selectionRotation)
	}

	// Focus Layer Id

	/**
	 * The shape id of the current focus layer. Null when the focus layer id is the current page.
	 *
	 * @public
	 */
	get focusLayerId(): TLShapeId | TLPageId {
		return this.currentPageState.focusLayerId ?? this.currentPageId
	}

	setFocusLayerId(next: TLShapeId | TLPageId): this {
		this._setFocusLayerId(next)
		return this
	}
	/** @internal */
	private _setFocusLayerId = this.history.createCommand(
		'setFocusLayerId',
		(next: undefined | TLShapeId | TLPageId) => {
			next = isPageId(next as string) ? undefined : (next as TLShapeId | undefined)
			// When we first click an empty canvas we don't want this to show up in the undo stack
			if (!next && !this.canUndo) {
				return
			}
			const prev = this.currentPageState.focusLayerId
			return {
				data: {
					prev,
					next,
				},
				preservesRedoStack: true,
				squashing: true,
			}
		},
		{
			do: ({ next }) => {
				this.store.update(this.currentPageState.id, (s) => ({ ...s, focusLayerId: next ?? null }))
			},
			undo: ({ prev }) => {
				this.store.update(this.currentPageState.id, (s) => ({ ...s, focusLayerId: prev }))
			},
			squash({ prev }, { next }) {
				return { prev, next }
			},
		}
	)

	/**
	 * Exit the current focus layer, moving up to the next group if there is one.
	 *
	 * @public
	 */
	popFocusLayer(): this {
		const current = this.currentPageState.focusLayerId
		const focusedShape = current && this.getShape(current)

		if (focusedShape) {
			// If we have a focused layer, look for an ancestor of the focused shape that is a group
			const match = this.findAncestor(focusedShape, (shape) =>
				this.isShapeOfType<TLGroupShape>(shape, 'group')
			)
			// If we have an ancestor that can become a focused layer, set it as the focused layer
			this.setFocusLayerId(match?.id ?? this.currentPageId)
			this.select(focusedShape.id)
		} else {
			// If there's no focused shape, then clear the focus layer and clear selection
			this.setFocusLayerId(this.currentPageId)
			this.selectNone()
		}

		return this
	}

	/**
	 * The current editing shape's id.
	 *
	 * @public
	 */
	get editingId() {
		return this.currentPageState.editingId
	}
	setEditingId(id: TLShapeId | null): this {
		if (!id) {
			this._setInstancePageState({ editingId: null })
		} else {
			if (id !== this.editingId) {
				const shape = this.getShape(id)!
				const util = this.getShapeUtil(shape)
				if (shape && util.canEdit(shape)) {
					this._setInstancePageState({ editingId: id, hoveredId: null }, false)
				}
			}
		}
		return this
	}

	// Hovered Id

	/**
	 * The current hovered shape id.
	 *
	 * @readonly
	 * @public
	 */
	@computed get hoveredId() {
		return this.currentPageState.hoveredId
	}
	setHoveredId(id: TLShapeId | null): this {
		if (id === this.currentPageState.hoveredId) return this
		this.updateCurrentPageState({ hoveredId: id }, true)
		return this
	}
	@computed get hoveredShape() {
		return this.hoveredId ? this.getShape(this.hoveredId) : undefined
	}

	// Hinting ids

	/**
	 * The editor's current hinting ids.
	 *
	 * @public
	 */
	@computed get hintingIds() {
		return this.currentPageState.hintingIds
	}
	setHintingIds(ids: TLShapeId[]): this {
		// always ephemeral
		this.store.update(this.currentPageState.id, (s) => ({ ...s, hintingIds: dedupe(ids) }))
		return this
	}

	/**
	 * The editor's current erasing ids.
	 *
	 * @public
	 */
	@computed get erasingIds() {
		return this.currentPageState.erasingIds
	}

	setErasingIds(ids: TLShapeId[]): this {
		const erasingIds = this.erasingIdsSet
		if (ids.length === erasingIds.size && ids.every((id) => erasingIds.has(id))) return this
		this._setInstancePageState({ erasingIds: ids }, true)
		return this
	}

	/**
	 * A derived set containing the current erasing ids.
	 *
	 * @public
	 */
	@computed get erasingIdsSet() {
		return new Set<TLShapeId>(this.erasingIds)
	}

	/**
	 * The current cropping shape's id.
	 *
	 * @public
	 */
	get croppingId() {
		return this.currentPageState.croppingId
	}
	setCroppingId(id: TLShapeId | null): this {
		if (id !== this.croppingId) {
			if (!id) {
				this.updateCurrentPageState({ croppingId: null })
				if (this.isInAny('select.crop', 'select.pointing_crop_handle', 'select.cropping')) {
					this.setCurrentTool('select.idle')
				}
			} else {
				const shape = this.getShape(id)!
				const util = this.getShapeUtil(shape)
				if (shape && util.canCrop(shape)) {
					this.updateCurrentPageState({ croppingId: id })
				}
			}
		}
		return this
	}

	/** @internal */
	private _cleanupInstancePageState(
		prevPageState: TLInstancePageState,
		shapesNoLongerInPage: Set<TLShapeId>
	) {
		let nextPageState = null as null | TLInstancePageState

		const selectedIds = prevPageState.selectedIds.filter((id) => !shapesNoLongerInPage.has(id))
		if (selectedIds.length !== prevPageState.selectedIds.length) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.selectedIds = selectedIds
		}

		const erasingIds = prevPageState.erasingIds.filter((id) => !shapesNoLongerInPage.has(id))
		if (erasingIds.length !== prevPageState.erasingIds.length) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.erasingIds = erasingIds
		}

		if (prevPageState.hoveredId && shapesNoLongerInPage.has(prevPageState.hoveredId)) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.hoveredId = null
		}

		if (prevPageState.editingId && shapesNoLongerInPage.has(prevPageState.editingId)) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.editingId = null
		}

		const hintingIds = prevPageState.hintingIds.filter((id) => !shapesNoLongerInPage.has(id))
		if (hintingIds.length !== prevPageState.hintingIds.length) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.hintingIds = hintingIds
		}

		if (prevPageState.focusLayerId && shapesNoLongerInPage.has(prevPageState.focusLayerId)) {
			if (!nextPageState) nextPageState = { ...prevPageState }
			nextPageState.focusLayerId = null
		}
		return nextPageState
	}

	/* --------------------- Camera --------------------- */

	/** @internal */
	@computed
	private get cameraId() {
		return CameraRecordType.createId(this.currentPageId)
	}

	/**
	 * The current camera.
	 *
	 * @public
	 */
	@computed get camera() {
		return this.store.get(this.cameraId)!
	}

	/**
	 * The current camera zoom level.
	 *
	 * @public
	 */
	@computed get zoomLevel() {
		return this.camera.z
	}

	/** @internal */
	private _willSetInitialBounds = true

	/** @internal */
	private _setCamera(x: number, y: number, z = this.camera.z): this {
		const currentCamera = this.camera
		if (currentCamera.x === x && currentCamera.y === y && currentCamera.z === z) return this
		const nextCamera = { ...currentCamera, x, y, z }

		this.batch(() => {
			this.store.put([nextCamera])

			const { currentScreenPoint } = this.inputs

			this.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				point: currentScreenPoint,
				pointerId: INTERNAL_POINTER_IDS.CAMERA_MOVE,
				ctrlKey: this.inputs.ctrlKey,
				altKey: this.inputs.altKey,
				shiftKey: this.inputs.shiftKey,
				button: 0,
				isPen: this.instanceState.isPenMode ?? false,
			})

			this._tickCameraState()
		})

		return this
	}

	/**
	 * Set the current camera.
	 *
	 * @example
	 * ```ts
	 * editor.setCamera(0, 0)
	 * editor.setCamera(0, 0, 1)
	 * ```
	 *
	 * @param x - The camera's x position.
	 * @param y - The camera's y position.
	 * @param z - The camera's z position. Defaults to the current zoom.
	 * @param options - Options for the camera change.
	 *
	 * @public
	 */
	setCamera(
		x: number,
		y: number,
		z = this.camera.z,
		{ stopFollowing = true }: TLViewportOptions = {}
	): this {
		this.stopCameraAnimation()
		if (stopFollowing && this.instanceState.followingUserId) {
			this.stopFollowingUser()
		}
		x = Number.isNaN(x) ? 0 : x
		y = Number.isNaN(y) ? 0 : y
		z = Number.isNaN(z) ? 1 : z
		this._setCamera(x, y, z)
		return this
	}

	/**
	 * Animate the camera.
	 *
	 * @example
	 * ```ts
	 * editor.animateCamera(0, 0)
	 * editor.animateCamera(0, 0, 1)
	 * editor.animateCamera(0, 0, 1, { duration: 1000, easing: (t) => t * t })
	 * ```
	 *
	 * @param x - The camera's x position.
	 * @param y - The camera's y position.
	 * @param z - The camera's z position. Defaults to the current zoom.
	 * @param opts - Options for the animation.
	 *
	 * @public
	 */
	animateCamera(
		x: number,
		y: number,
		z = this.camera.z,
		opts: TLAnimationOptions = DEFAULT_ANIMATION_OPTIONS
	): this {
		x = Number.isNaN(x) ? 0 : x
		y = Number.isNaN(y) ? 0 : y
		z = Number.isNaN(z) ? 1 : z
		const { width, height } = this.viewportScreenBounds
		const w = width / z
		const h = height / z

		const targetViewport = new Box2d(-x, -y, w, h)

		return this._animateToViewport(targetViewport, opts)
	}

	/**
	 * Center the camera on a point (in page space).
	 *
	 * @example
	 * ```ts
	 * editor.centerOnPoint(100, 100)
	 * ```
	 *
	 * @param x - The x position of the point.
	 * @param y - The y position of the point.
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	centerOnPoint(x: number, y: number, opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const {
			viewportPageBounds: { width: pw, height: ph },
			camera,
		} = this

		if (opts?.duration) {
			this.animateCamera(-(x - pw / 2), -(y - ph / 2), camera.z, opts)
		} else {
			this.setCamera(-(x - pw / 2), -(y - ph / 2), camera.z)
		}
		return this
	}

	/**
	 * Move the camera to the nearest content.
	 *
	 * @public
	 */
	zoomToContent() {
		const bounds = this.selectedPageBounds ?? this.allShapesCommonBounds

		if (bounds) {
			this.zoomToBounds(
				bounds.minX,
				bounds.minY,
				bounds.width,
				bounds.height,
				Math.min(1, this.zoomLevel),
				{ duration: 220 }
			)
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToFit()
	 * ```
	 *
	 * @public
	 */
	zoomToFit(opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const ids = [...this.currentPageShapeIds]
		if (ids.length <= 0) return this

		const pageBounds = Box2d.Common(compact(ids.map((id) => this.getPageBounds(id))))
		this.zoomToBounds(
			pageBounds.minX,
			pageBounds.minY,
			pageBounds.width,
			pageBounds.height,
			undefined,
			opts
		)
		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.resetZoom()
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	resetZoom(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera
		const { x, y } = point
		if (opts?.duration) {
			this.animateCamera(cx + (x / 1 - x) - (x / cz - x), cy + (y / 1 - y) - (y / cz - y), 1, opts)
		} else {
			this.setCamera(cx + (x / 1 - x) - (x / cz - x), cy + (y / 1 - y) - (y / cz - y), 1)
		}

		return this
	}

	/**
	 * Zoom the camera in.
	 *
	 * @example
	 * ```ts
	 * editor.zoomIn()
	 * editor.zoomIn(editor.viewportScreenCenter, { duration: 120 })
	 * editor.zoomIn(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomIn(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera

		let zoom = MAX_ZOOM

		for (let i = 1; i < ZOOMS.length; i++) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz <= (z2 - z1) / 2) continue
			zoom = z2
			break
		}

		const { x, y } = point
		if (opts?.duration) {
			this.animateCamera(
				cx + (x / zoom - x) - (x / cz - x),
				cy + (y / zoom - y) - (y / cz - y),
				zoom,
				opts
			)
		} else {
			this.setCamera(cx + (x / zoom - x) - (x / cz - x), cy + (y / zoom - y) - (y / cz - y), zoom)
		}

		return this
	}

	/**
	 * Zoom the camera out.
	 *
	 * @example
	 * ```ts
	 * editor.zoomOut()
	 * editor.zoomOut(editor.viewportScreenCenter, { duration: 120 })
	 * editor.zoomOut(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomOut(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera

		let zoom = MIN_ZOOM

		for (let i = ZOOMS.length - 1; i > 0; i--) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz >= (z2 - z1) / 2) continue
			zoom = z1
			break
		}

		const { x, y } = point

		if (opts?.duration) {
			this.animateCamera(
				cx + (x / zoom - x) - (x / cz - x),
				cy + (y / zoom - y) - (y / cz - y),
				zoom,
				opts
			)
		} else {
			this.setCamera(cx + (x / zoom - x) - (x / cz - x), cy + (y / zoom - y) - (y / cz - y), zoom)
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current selection in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToSelection()
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomToSelection(opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const ids = this.selectedIds
		if (ids.length <= 0) return this

		const selectedBounds = Box2d.Common(compact(ids.map((id) => this.getPageBounds(id))))

		this.zoomToBounds(
			selectedBounds.minX,
			selectedBounds.minY,
			selectedBounds.width,
			selectedBounds.height,
			Math.max(1, this.camera.z),
			opts
		)

		return this
	}

	/**
	 * Pan or pan/zoom the selected ids into view. This method tries to not change the zoom if possible.
	 *
	 * @param ids - The ids of the shapes to pan and zoom into view.
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	panZoomIntoView(ids: TLShapeId[], opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		if (ids.length <= 0) return this
		const selectedBounds = Box2d.Common(compact(ids.map((id) => this.getPageBounds(id))))

		const { viewportPageBounds } = this

		if (viewportPageBounds.h < selectedBounds.h || viewportPageBounds.w < selectedBounds.w) {
			this.zoomToBounds(
				selectedBounds.minX,
				selectedBounds.minY,
				selectedBounds.width,
				selectedBounds.height,
				this.camera.z,
				opts
			)

			return this
		} else {
			const insetViewport = this.viewportPageBounds.clone().expandBy(-32 / this.zoomLevel)

			let offsetX = 0
			let offsetY = 0
			if (insetViewport.maxY < selectedBounds.maxY) {
				// off bottom
				offsetY = insetViewport.maxY - selectedBounds.maxY
			} else if (insetViewport.minY > selectedBounds.minY) {
				// off top
				offsetY = insetViewport.minY - selectedBounds.minY
			} else {
				// inside y-bounds
			}

			if (insetViewport.maxX < selectedBounds.maxX) {
				// off right
				offsetX = insetViewport.maxX - selectedBounds.maxX
			} else if (insetViewport.minX > selectedBounds.minX) {
				// off left
				offsetX = insetViewport.minX - selectedBounds.minX
			} else {
				// inside x-bounds
			}

			const { camera } = this

			if (opts?.duration) {
				this.animateCamera(camera.x + offsetX, camera.y + offsetY, camera.z, opts)
			} else {
				this.setCamera(camera.x + offsetX, camera.y + offsetY, camera.z)
			}
		}

		return this
	}

	/**
	 * Zoom the camera to fit a bounding box (in page space).
	 *
	 * @example
	 * ```ts
	 * editor.zoomToBounds(0, 0, 100, 100)
	 * ```
	 *
	 * @param x - The bounding box's x position.
	 * @param y - The bounding box's y position.
	 * @param width - The bounding box's width.
	 * @param height - The bounding box's height.
	 * @param targetZoom - The desired zoom level. Defaults to 0.1.
	 *
	 * @public
	 */
	zoomToBounds(
		x: number,
		y: number,
		width: number,
		height: number,
		targetZoom?: number,
		opts?: TLAnimationOptions
	): this {
		if (!this.instanceState.canMoveCamera) return this

		const { viewportScreenBounds } = this

		const inset = Math.min(256, viewportScreenBounds.width * 0.28)

		let zoom = clamp(
			Math.min(
				(viewportScreenBounds.width - inset) / width,
				(viewportScreenBounds.height - inset) / height
			),
			MIN_ZOOM,
			MAX_ZOOM
		)

		if (targetZoom !== undefined) {
			zoom = Math.min(targetZoom, zoom)
		}

		if (opts?.duration) {
			this.animateCamera(
				-x + (viewportScreenBounds.width - width * zoom) / 2 / zoom,
				-y + (viewportScreenBounds.height - height * zoom) / 2 / zoom,
				zoom,
				opts
			)
		} else {
			this.setCamera(
				-x + (viewportScreenBounds.width - width * zoom) / 2 / zoom,
				-y + (viewportScreenBounds.height - height * zoom) / 2 / zoom,
				zoom
			)
		}

		return this
	}

	/**
	 * Pan the camera.
	 *
	 * @example
	 * ```ts
	 * editor.pan(100, 100)
	 * editor.pan(100, 100, { duration: 1000 })
	 * ```
	 *
	 * @param dx - The amount to pan on the x axis.
	 * @param dy - The amount to pan on the y axis.
	 * @param opts - The animation options
	 */
	pan(dx: number, dy: number, opts?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { camera } = this
		const { x: cx, y: cy, z: cz } = camera
		const d = new Vec2d(dx, dy).div(cz)

		if (opts?.duration ?? 0 > 0) {
			return this.animateCamera(cx + d.x, cy + d.y, cz, opts)
		} else {
			this.setCamera(cx + d.x, cy + d.y, cz)
		}

		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @public
	 */
	stopCameraAnimation() {
		this.emit('stop-camera-animation')

		return this
	}

	/** @internal */
	private _viewportAnimation = null as null | {
		elapsed: number
		duration: number
		easing: (t: number) => number
		start: Box2d
		end: Box2d
	}

	/** @internal */
	private _animateViewport(ms: number) {
		if (!this._viewportAnimation) return

		const cancel = () => {
			this.removeListener('tick', this._animateViewport)
			this.removeListener('stop-camera-animation', cancel)
			this._viewportAnimation = null
		}

		this.once('stop-camera-animation', cancel)

		this._viewportAnimation.elapsed += ms

		const { elapsed, easing, duration, start, end } = this._viewportAnimation

		if (elapsed > duration) {
			const z = this.viewportScreenBounds.width / end.width
			const x = -end.x
			const y = -end.y

			this._setCamera(x, y, z)
			cancel()
			return
		}

		const remaining = duration - elapsed
		const t = easing(1 - remaining / duration)

		const left = start.minX + (end.minX - start.minX) * t
		const top = start.minY + (end.minY - start.minY) * t
		const right = start.maxX + (end.maxX - start.maxX) * t
		const bottom = start.maxY + (end.maxY - start.maxY) * t

		const easedViewport = new Box2d(left, top, right - left, bottom - top)

		const z = this.viewportScreenBounds.width / easedViewport.width
		const x = -easedViewport.x
		const y = -easedViewport.y

		this._setCamera(x, y, z)
	}

	/** @internal */
	private _animateToViewport(targetViewportPage: Box2d, opts = {} as TLAnimationOptions) {
		const { duration = 0, easing = EASINGS.easeInOutCubic } = opts
		const {
			user: { animationSpeed },
			viewportPageBounds,
		} = this

		// If we have an existing animation, then stop it; also stop following any user
		this.stopCameraAnimation()
		if (this.instanceState.followingUserId) {
			this.stopFollowingUser()
		}

		if (duration === 0 || animationSpeed === 0) {
			// If we have no animation, then skip the animation and just set the camera
			return this._setCamera(
				-targetViewportPage.x,
				-targetViewportPage.y,
				this.viewportScreenBounds.width / targetViewportPage.width
			)
		}

		// Set our viewport animation
		this._viewportAnimation = {
			elapsed: 0,
			duration: duration / animationSpeed,
			easing,
			start: viewportPageBounds.clone(),
			end: targetViewportPage,
		}

		// On each tick, animate the viewport
		this.addListener('tick', this._animateViewport)

		return this
	}

	/**
	 * Slide the camera in a certain direction.
	 *
	 * @param opts - Options for the slide
	 * @public
	 */
	slideCamera(
		opts = {} as {
			speed: number
			direction: Vec2d
			friction: number
			speedThreshold?: number
		}
	) {
		if (!this.instanceState.canMoveCamera) return this

		this.stopCameraAnimation()

		const { animationSpeed } = this.user

		if (animationSpeed === 0) return

		const { speed, friction, direction, speedThreshold = 0.01 } = opts
		let currentSpeed = Math.min(speed, 1)

		const cancel = () => {
			this.removeListener('tick', moveCamera)
			this.removeListener('stop-camera-animation', cancel)
		}

		this.once('stop-camera-animation', cancel)

		const moveCamera = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.camera
			const movementVec = direction.clone().mul((currentSpeed * elapsed) / cz)

			// Apply friction
			currentSpeed *= 1 - friction
			if (currentSpeed < speedThreshold) {
				cancel()
			} else {
				this._setCamera(cx + movementVec.x, cy + movementVec.y, cz)
			}
		}

		this.addListener('tick', moveCamera)

		return this
	}

	/**
	 * Animate the camera to a user's cursor position.
	 * This also briefly show the user's cursor if it's not currently visible.
	 *
	 * @param userId - The id of the user to aniamte to.
	 * @public
	 */
	animateToUser(userId: string) {
		const presences = this.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const presence = [...presences.value]
			.sort((a, b) => {
				return a.lastActivityTimestamp - b.lastActivityTimestamp
			})
			.pop()

		if (!presence) return

		this.batch(() => {
			// If we're following someone, stop following them
			if (this.instanceState.followingUserId !== null) {
				this.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.currentPageId
			if (!isOnSamePage) {
				this.setCurrentPageId(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			const options = isOnSamePage ? { duration: 500 } : undefined

			const position = presence.cursor

			this.centerOnPoint(position.x, position.y, options)

			// Highlight the user's cursor
			const { highlightedUserIds } = this.instanceState
			this.updateInstanceState({ highlightedUserIds: [...highlightedUserIds, userId] })

			// Unhighlight the user's cursor after a few seconds
			setTimeout(() => {
				const highlightedUserIds = [...this.instanceState.highlightedUserIds]
				const index = highlightedUserIds.indexOf(userId)
				if (index < 0) return
				highlightedUserIds.splice(index, 1)
				this.updateInstanceState({ highlightedUserIds })
			}, COLLABORATOR_IDLE_TIMEOUT)
		})
	}

	/**
	 * Animate the camera to a shape.
	 *
	 * @public
	 */
	animateToShape(shapeId: TLShapeId, opts: TLAnimationOptions = DEFAULT_ANIMATION_OPTIONS): this {
		if (!this.instanceState.canMoveCamera) return this

		const activeArea = this.viewportScreenBounds.clone().expandBy(-32)
		const viewportAspectRatio = activeArea.width / activeArea.height

		const shapePageBounds = this.getPageBounds(shapeId)

		if (!shapePageBounds) return this

		const shapeAspectRatio = shapePageBounds.width / shapePageBounds.height

		const targetViewportPage = shapePageBounds.clone()

		const z = shapePageBounds.width / activeArea.width
		targetViewportPage.width += (activeArea.minX + activeArea.maxX) * z
		targetViewportPage.height += (activeArea.minY + activeArea.maxY) * z
		targetViewportPage.x -= activeArea.minX * z
		targetViewportPage.y -= activeArea.minY * z

		if (shapeAspectRatio > viewportAspectRatio) {
			targetViewportPage.height = shapePageBounds.width / viewportAspectRatio
			targetViewportPage.y -= (targetViewportPage.height - shapePageBounds.height) / 2
		} else {
			targetViewportPage.width = shapePageBounds.height * viewportAspectRatio
			targetViewportPage.x -= (targetViewportPage.width - shapePageBounds.width) / 2
		}

		return this._animateToViewport(targetViewportPage, opts)
	}

	// Viewport

	/**
	 * Update the viewport. The viewport will measure the size and screen position of its container
	 * element. This should be done whenever the container's position on the screen changes.
	 *
	 * @example
	 * ```ts
	 * editor.updateViewportScreenBounds()
	 * editor.updateViewportScreenBounds(true)
	 * ```
	 *
	 * @param center - (optional) Whether to preserve the viewport page center as the viewport changes.
	 *
	 * @public
	 */
	updateViewportScreenBounds(center = false) {
		const container = this.getContainer()

		if (!container) return this
		const rect = container.getBoundingClientRect()
		const screenBounds = new Box2d(0, 0, Math.max(rect.width, 1), Math.max(rect.height, 1))

		const boundsAreEqual = screenBounds.equals(this.viewportScreenBounds)

		// Get the current value
		const { _willSetInitialBounds } = this

		if (boundsAreEqual) {
			this._willSetInitialBounds = false
		} else {
			if (_willSetInitialBounds) {
				// If we have just received the initial bounds, don't center the camera.
				this._willSetInitialBounds = false
				this.updateInstanceState({ screenBounds: screenBounds.toJson() }, true, true)
			} else {
				const { zoomLevel } = this
				if (center) {
					const before = this.viewportPageCenter
					this.updateInstanceState({ screenBounds: screenBounds.toJson() }, true, true)
					const after = this.viewportPageCenter
					if (!this.instanceState.followingUserId) {
						this.pan((after.x - before.x) * zoomLevel, (after.y - before.y) * zoomLevel)
					}
				} else {
					const before = this.screenToPage(0, 0)
					this.updateInstanceState({ screenBounds: screenBounds.toJson() }, true, true)
					const after = this.screenToPage(0, 0)
					if (!this.instanceState.followingUserId) {
						this.pan((after.x - before.x) * zoomLevel, (after.y - before.y) * zoomLevel)
					}
				}
			}
		}

		this._tickCameraState()
		this.updateRenderingBounds()

		const { editingId } = this

		if (editingId) {
			this.panZoomIntoView([editingId])
		}

		return this
	}

	/**
	 * The bounds of the editor's viewport in screen space.
	 *
	 * @public
	 */
	@computed get viewportScreenBounds() {
		const { x, y, w, h } = this.instanceState.screenBounds
		return new Box2d(x, y, w, h)
	}

	/**
	 * The center of the editor's viewport in screen space.
	 *
	 * @public
	 */
	@computed get viewportScreenCenter() {
		return this.viewportScreenBounds.center
	}

	/**
	 * The current viewport in page space.
	 *
	 * @public
	 */
	@computed get viewportPageBounds() {
		const { x, y, w, h } = this.viewportScreenBounds
		const tl = this.screenToPage(x, y)
		const br = this.screenToPage(x + w, y + h)
		return new Box2d(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
	}

	/**
	 * The center of the viewport in page space.
	 *
	 * @public
	 */
	@computed get viewportPageCenter() {
		return this.viewportPageBounds.center
	}

	/**
	 * Convert a point in screen space to a point in page space.
	 *
	 * @example
	 * ```ts
	 * editor.screenToPage(100, 100)
	 * ```
	 *
	 * @param x - The x coordinate of the point in screen space.
	 * @param y - The y coordinate of the point in screen space.
	 * @param camera - The camera to use. Defaults to the current camera.
	 *
	 * @public
	 */
	screenToPage(x: number, y: number, z = 0.5, camera: Vec2dModel = this.camera) {
		const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = camera
		return {
			x: (x - screenBounds.x) / cz - cx,
			y: (y - screenBounds.y) / cz - cy,
			z,
		}
	}

	/**
	 * Convert a point in page space to a point in screen space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToScreen(100, 100)
	 * ```
	 *
	 * @param x - The x coordinate of the point in screen space.
	 * @param y - The y coordinate of the point in screen space.
	 * @param camera - The camera to use. Defaults to the current camera.
	 *
	 * @public
	 */
	pageToScreen(x: number, y: number, z = 0.5, camera: Vec2dModel = this.camera) {
		const { x: cx, y: cy, z: cz = 1 } = camera
		return {
			x: x + cx * cz,
			y: y + cy * cz,
			z,
		}
	}

	// Following

	/**
	 * Start viewport-following a user.
	 *
	 * @param userId - The id of the user to follow.
	 *
	 * @public
	 */
	startFollowingUser(userId: string) {
		const leaderPresences = this.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const thisUserId = this.user.id

		if (!thisUserId) {
			console.warn('You should set the userId for the current instance before following a user')
		}

		// If the leader is following us, then we can't follow them
		if (leaderPresences.value.some((p) => p.followingUserId === thisUserId)) {
			return
		}

		transact(() => {
			this.stopFollowingUser()

			this.updateInstanceState({ followingUserId: userId }, true)
		})

		const cancel = () => {
			this.removeListener('frame', moveTowardsUser)
			this.removeListener('stop-following', cancel)
		}

		let isCaughtUp = false

		const moveTowardsUser = () => {
			// Stop following if we can't find the user
			const leaderPresence = [...leaderPresences.value]
				.sort((a, b) => {
					return a.lastActivityTimestamp - b.lastActivityTimestamp
				})
				.pop()
			if (!leaderPresence) {
				this.stopFollowingUser()
				return
			}

			// Change page if leader is on a different page
			const isOnSamePage = leaderPresence.currentPageId === this.currentPageId
			const chaseProportion = isOnSamePage ? FOLLOW_CHASE_PROPORTION : 1
			if (!isOnSamePage) {
				this.setCurrentPageId(leaderPresence.currentPageId, { stopFollowing: false })
			}

			// Get the bounds of the follower (me) and the leader (them)
			const { center, width, height } = this.viewportPageBounds
			const leaderScreen = Box2d.From(leaderPresence.screenBounds)
			const leaderWidth = leaderScreen.width / leaderPresence.camera.z
			const leaderHeight = leaderScreen.height / leaderPresence.camera.z
			const leaderCenter = new Vec2d(
				leaderWidth / 2 - leaderPresence.camera.x,
				leaderHeight / 2 - leaderPresence.camera.y
			)

			// At this point, let's check if we're following someone who's following us.
			// If so, we can't try to contain their entire viewport
			// because that would become a feedback loop where we zoom, they zoom, etc.
			const isFollowingFollower = leaderPresence.followingUserId === thisUserId

			// Figure out how much to zoom
			const desiredWidth = width + (leaderWidth - width) * chaseProportion
			const desiredHeight = height + (leaderHeight - height) * chaseProportion
			const ratio = !isFollowingFollower
				? Math.min(width / desiredWidth, height / desiredHeight)
				: height / desiredHeight

			const targetZoom = clamp(this.camera.z * ratio, MIN_ZOOM, MAX_ZOOM)
			const targetWidth = this.viewportScreenBounds.w / targetZoom
			const targetHeight = this.viewportScreenBounds.h / targetZoom

			// Figure out where to move the camera
			const displacement = leaderCenter.sub(center)
			const targetCenter = Vec2d.Add(center, Vec2d.Mul(displacement, chaseProportion))

			// Now let's assess whether we've caught up to the leader or not
			const distance = Vec2d.Sub(targetCenter, center).len()
			const zoomChange = Math.abs(targetZoom - this.camera.z)

			// If we're chasing the leader...
			// Stop chasing if we're close enough
			if (distance < FOLLOW_CHASE_PAN_SNAP && zoomChange < FOLLOW_CHASE_ZOOM_SNAP) {
				isCaughtUp = true
				return
			}

			// If we're already caught up with the leader...
			// Only start moving again if we're far enough away
			if (
				isCaughtUp &&
				distance < FOLLOW_CHASE_PAN_UNSNAP &&
				zoomChange < FOLLOW_CHASE_ZOOM_UNSNAP
			) {
				return
			}

			// Update the camera!
			isCaughtUp = false
			this.stopCameraAnimation()
			this.setCamera(
				-(targetCenter.x - targetWidth / 2),
				-(targetCenter.y - targetHeight / 2),
				targetZoom,
				{ stopFollowing: false }
			)
		}

		this.once('stop-following', cancel)
		this.addListener('frame', moveTowardsUser)

		return this
	}

	/**
	 * Stop viewport-following a user.
	 *
	 * @public
	 */
	stopFollowingUser() {
		this.updateInstanceState({ followingUserId: null }, true)
		this.emit('stop-following')
		return this
	}

	// Camera state

	private _cameraState = atom('camera state', 'idle' as 'idle' | 'moving')

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @public
	 */
	@computed get cameraState() {
		return this._cameraState.value
	}

	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.

	private _cameraStateTimeoutRemaining = 0
	private _lastUpdateRenderingBoundsTimestamp = Date.now()

	private _decayCameraStateTimeout = (elapsed: number) => {
		this._cameraStateTimeoutRemaining -= elapsed

		if (this._cameraStateTimeoutRemaining <= 0) {
			this.off('tick', this._decayCameraStateTimeout)
			this._cameraState.set('idle')
			this.updateRenderingBounds()
		}
	}

	private _tickCameraState = () => {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = CAMERA_MOVING_TIMEOUT

		const now = Date.now()

		// If the state is idle, then start the tick
		if (this._cameraState.__unsafe__getWithoutCapture() === 'idle') {
			this._lastUpdateRenderingBoundsTimestamp = now // don't render right away
			this._cameraState.set('moving')
			this.on('tick', this._decayCameraStateTimeout)
		} else {
			if (now - this._lastUpdateRenderingBoundsTimestamp > CAMERA_MAX_RENDERING_INTERVAL) {
				this.updateRenderingBounds()
			}
		}
	}

	private computeUnorderedRenderingShapes(
		ids: TLParentId[],
		{
			renderingBounds,
			renderingBoundsExpanded,
			erasingIdsSet,
			editingId,
		}: {
			renderingBounds?: Box2d
			renderingBoundsExpanded?: Box2d
			erasingIdsSet?: Set<TLShapeId>
			editingId?: TLShapeId | null
		} = {}
	) {
		// Here we get the shape as well as any of its children, as well as their
		// opacities. If the shape is being erased, and none of its ancestors are
		// being erased, then we reduce the opacity of the shape and all of its
		// ancestors; but we don't apply this effect more than once among a set
		// of descendants so that it does not compound.

		// This is designed to keep all the shapes in a single list which
		// allows the DOM nodes to be reused even when they become children
		// of other nodes.

		const renderingShapes: {
			id: TLShapeId
			shape: TLShape
			util: ShapeUtil
			index: number
			backgroundIndex: number
			opacity: number
			isCulled: boolean
			isInViewport: boolean
			maskedPageBounds: Box2d | undefined
		}[] = []

		let nextIndex = MAX_SHAPES_PER_PAGE
		let nextBackgroundIndex = 0

		const addShapeById = (id: TLParentId, parentOpacity: number, isAncestorErasing: boolean) => {
			if (PageRecordType.isId(id)) {
				for (const childId of this.getSortedChildIds(id)) {
					addShapeById(childId, parentOpacity, isAncestorErasing)
				}
				return
			}

			const shape = this.getShape(id)
			if (!shape) return

			let opacity = shape.opacity * parentOpacity
			let isShapeErasing = false

			if (!isAncestorErasing && erasingIdsSet?.has(id)) {
				isShapeErasing = true
				opacity *= 0.32
			}

			// If a child is outside of its parent's clipping bounds, then bounds will be undefined.
			const maskedPageBounds = this.getMaskedPageBounds(id)

			// Whether the shape is on screen. Use the "strict" viewport here.
			const isInViewport = maskedPageBounds
				? renderingBounds?.includes(maskedPageBounds) ?? true
				: false

			// Whether the shape should actually be culled / unmounted.
			// - Use the "expanded" rendering viewport to include shapes that are just off-screen.
			// - Editing shapes should never be culled.
			const isCulled = maskedPageBounds
				? (editingId !== id && !renderingBoundsExpanded?.includes(maskedPageBounds)) ?? true
				: true

			const util = this.getShapeUtil(shape)

			renderingShapes.push({
				id,
				shape,
				util,
				index: nextIndex,
				backgroundIndex: nextBackgroundIndex,
				opacity,
				isCulled,
				isInViewport,
				maskedPageBounds,
			})

			nextIndex += 1
			nextBackgroundIndex += 1

			const childIds = this.getSortedChildIds(id)
			if (!childIds.length) return

			let backgroundIndexToRestore = null
			if (util.providesBackgroundForChildren(shape)) {
				backgroundIndexToRestore = nextBackgroundIndex
				nextBackgroundIndex = nextIndex
				nextIndex += MAX_SHAPES_PER_PAGE
			}

			for (const childId of childIds) {
				addShapeById(childId, opacity, isAncestorErasing || isShapeErasing)
			}

			if (backgroundIndexToRestore !== null) {
				nextBackgroundIndex = backgroundIndexToRestore
			}
		}

		for (const id of ids) {
			addShapeById(id, 1, false)
		}

		return renderingShapes
	}

	/**
	 * Get the shapes that should be displayed in the current viewport.
	 *
	 * @public
	 */
	@computed get renderingShapes() {
		const renderingShapes = this.computeUnorderedRenderingShapes([this.currentPageId], {
			renderingBounds: this.renderingBounds,
			renderingBoundsExpanded: this.renderingBoundsExpanded,
			erasingIdsSet: this.erasingIdsSet,
			editingId: this.editingId,
		})

		// Its IMPORTANT that the result be sorted by id AND include the index
		// that the shape should be displayed at. Steve, this is the past you
		// telling the present you not to change this.

		// We want to sort by id because moving elements about in the DOM will
		// cause the element to get removed by react as it moves the DOM node. This
		// causes <iframes/> to re-render which is hella annoying and a perf
		// drain. By always sorting by 'id' we keep the shapes always in the
		// same order; but we later use index to set the element's 'z-index'
		// to change the "rendered" position in z-space.
		return renderingShapes.sort(sortById)
	}

	/**
	 * The current rendering bounds in page space, used for checking which shapes are "on screen".
	 *
	 * @public
	 */
	@computed get renderingBounds() {
		return this._renderingBounds.value
	}

	/** @internal */
	private readonly _renderingBounds = atom('rendering viewport', new Box2d())

	/**
	 * The current rendering bounds in page space, expanded slightly. Used for determining which shapes
	 * to render and which to "cull".
	 *
	 * @public
	 */
	@computed get renderingBoundsExpanded() {
		return this._renderingBoundsExpanded.value
	}

	/** @internal */
	private readonly _renderingBoundsExpanded = atom('rendering viewport expanded', new Box2d())

	/**
	 * Update the rendering bounds. This should be called when the viewport has stopped changing, such
	 * as at the end of a pan, zoom, or animation.
	 *
	 * @example
	 * ```ts
	 * editor.updateRenderingBounds()
	 * ```
	 *
	 *
	 * @internal
	 */
	updateRenderingBounds(): this {
		const { viewportPageBounds } = this
		if (viewportPageBounds.equals(this._renderingBounds.__unsafe__getWithoutCapture())) return this
		this._renderingBounds.set(viewportPageBounds.clone())
		this._renderingBoundsExpanded.set(viewportPageBounds.clone().expandBy(100 / this.zoomLevel))
		return this
	}

	/* --------------------- Pages ---------------------- */

	/** @internal */
	@computed private get _pages() {
		return this.store.query.records('page')
	}

	/**
	 * Info about the project's current pages.
	 *
	 * @public
	 */
	@computed get pages(): TLPage[] {
		return this._pages.value.sort(sortByIndex)
	}

	/**
	 * The current page.
	 *
	 * @public
	 */
	get currentPage(): TLPage {
		const page = this.getPage(this.currentPageId)!
		return page
	}

	/**
	 * The current page id.
	 *
	 * @public
	 */
	get currentPageId(): TLPageId {
		return this.instanceState.currentPageId
	}

	/**
	 * Get a page.
	 *
	 * @example
	 * ```ts
	 * editor.getPage(myPage.id)
	 * ```
	 *
	 * @public
	 */
	getPage(page: TLPage): TLPage | undefined
	getPage(id: TLPageId): TLPage | undefined
	getPage(id: TLPageId | TLPage): TLPage | undefined {
		return this.store.get(typeof id === 'string' ? id : id.id)
	}

	/**
	 * A cache of shape ids in the current page.
	 *
	 * @internal
	 */
	private readonly _currentPageShapeIds: ReturnType<typeof deriveShapeIdsInCurrentPage>

	/**
	 * An array of all of the shapes on the current page.
	 *
	 * @public
	 */
	get currentPageShapeIds() {
		return this._currentPageShapeIds.value
	}

	/**
	 * Get the ids of shapes on a page.
	 *
	 * @example
	 * ```ts
	 * const idsOnPage1 = editor.getShapeIdsInPage('page1')
	 * const idsOnPage2 = editor.getShapeIdsInPage('page2')
	 * ```
	 *
	 * @param pageId - The id of the page.
	 *
	 * @public
	 **/
	getShapeIdsInPage(pageId: TLPageId): Set<TLShapeId> {
		const result = this.store.query.exec('shape', { parentId: { eq: pageId } })
		return this.getShapeAndDescendantIds(result.map((s) => s.id))
	}

	/**
	 * Set the current page.
	 *
	 * @example
	 * ```ts
	 * editor.setCurrentPageId('page1')
	 * ```
	 *
	 * @param pageId - The id of the page to set as the current page.
	 * @param options - Options for setting the current page.
	 *
	 * @public
	 */
	setCurrentPageId(pageId: TLPageId, { stopFollowing = true }: TLViewportOptions = {}): this {
		this._setCurrentPageId(pageId, { stopFollowing })
		return this
	}
	/** @internal */
	private _setCurrentPageId = this.history.createCommand(
		'setCurrentPage',
		(pageId: TLPageId, { stopFollowing = true }: TLViewportOptions = {}) => {
			if (!this.store.has(pageId)) {
				console.error("Tried to set the current page id to a page that doesn't exist.")
				return
			}

			if (stopFollowing && this.instanceState.followingUserId) {
				this.stopFollowingUser()
			}

			return {
				data: { toId: pageId, fromId: this.currentPageId },
				squashing: true,
				preservesRedoStack: true,
			}
		},
		{
			do: ({ toId }) => {
				if (!this.store.has(toId)) {
					// in multiplayer contexts this page might have been deleted
					return
				}
				if (!this.pageStates.find((p) => p.pageId === toId)) {
					const camera = CameraRecordType.create({
						id: CameraRecordType.createId(toId),
					})
					this.store.put([
						camera,
						InstancePageStateRecordType.create({
							id: InstancePageStateRecordType.createId(toId),
							pageId: toId,
						}),
					])
				}

				this.store.put([{ ...this.instanceState, currentPageId: toId }])

				this.updateRenderingBounds()
			},
			undo: ({ fromId }) => {
				if (!this.store.has(fromId)) {
					// in multiplayer contexts this page might have been deleted
					return
				}
				this.store.put([{ ...this.instanceState, currentPageId: fromId }])

				this.updateRenderingBounds()
			},
			squash: ({ fromId }, { toId }) => {
				return { toId, fromId }
			},
		}
	)

	/**
	 * Update a page.
	 *
	 * @example
	 * ```ts
	 * editor.updatePage({ id: 'page2', name: 'Page 2' })
	 * ```
	 *
	 * @param partial - The partial of the shape to update.
	 *
	 * @public
	 */
	updatePage(partial: RequiredKeys<TLPage, 'id'>, squashing = false): this {
		this._updatePage(partial, squashing)
		return this
	}
	/** @internal */
	private _updatePage = this.history.createCommand(
		'updatePage',
		(partial: RequiredKeys<TLPage, 'id'>, squashing = false) => {
			if (this.instanceState.isReadonly) return null

			const prev = this.getPage(partial.id)

			if (!prev) return null

			return { data: { prev, partial }, squashing }
		},
		{
			do: ({ partial }) => {
				this.store.update(partial.id, (page) => ({ ...page, ...partial }))
			},
			undo: ({ prev, partial }) => {
				this.store.update(partial.id, () => prev)
			},
			squash(prevData, nextData) {
				return {
					prev: { ...prevData.prev, ...nextData.prev },
					partial: nextData.partial,
				}
			},
		}
	)

	/**
	 * Create a page.
	 *
	 * @example
	 * ```ts
	 * editor.createPage('New Page')
	 * editor.createPage('New Page', 'page1')
	 * ```
	 *
	 * @param id - The new page's id.
	 * @param title - The new page's title.
	 *
	 * @public
	 */
	createPage(
		title: string,
		id: TLPageId = PageRecordType.createId(),
		belowPageIndex?: string
	): this {
		this._createPage(title, id, belowPageIndex)
		return this
	}
	/** @internal */
	private _createPage = this.history.createCommand(
		'createPage',
		(title: string, id: TLPageId = PageRecordType.createId(), belowPageIndex?: string) => {
			if (this.instanceState.isReadonly) return null
			if (this.pages.length >= MAX_PAGES) return null
			const pageInfo = this.pages
			const topIndex = belowPageIndex ?? pageInfo[pageInfo.length - 1]?.index ?? 'a1'
			const bottomIndex = pageInfo[pageInfo.findIndex((p) => p.index === topIndex) + 1]?.index

			title = getIncrementedName(
				title,
				pageInfo.map((p) => p.name)
			)

			const newPage = PageRecordType.create({
				id,
				name: title,
				index:
					bottomIndex && topIndex !== bottomIndex
						? getIndexBetween(topIndex, bottomIndex)
						: getIndexAbove(topIndex),
				meta: {},
			})

			const newCamera = CameraRecordType.create({
				id: CameraRecordType.createId(newPage.id),
			})

			const newTabPageState = InstancePageStateRecordType.create({
				id: InstancePageStateRecordType.createId(newPage.id),
				pageId: newPage.id,
			})

			return {
				data: {
					prevSelectedPageId: this.currentPageId,
					newPage,
					newTabPageState,
					newCamera,
				},
			}
		},
		{
			do: ({ newPage, newTabPageState, newCamera }) => {
				this.store.put([
					newPage,
					newCamera,
					newTabPageState,
					{ ...this.instanceState, currentPageId: newPage.id },
				])
				this.updateRenderingBounds()
			},
			undo: ({ newPage, prevSelectedPageId, newTabPageState, newCamera }) => {
				if (this.pages.length === 1) return
				this.store.remove([newTabPageState.id, newPage.id, newCamera.id])

				if (this.store.has(prevSelectedPageId) && this.currentPageId !== prevSelectedPageId) {
					this.store.put([{ ...this.instanceState, currentPageId: prevSelectedPageId }])
				}

				this.updateRenderingBounds()
			},
		}
	)

	/**
	 * Delete a page.
	 *
	 * @example
	 * ```ts
	 * editor.deletePage('page1')
	 * ```
	 *
	 * @param id - The id of the page to delete.
	 *
	 * @public
	 */
	deletePage(id: TLPageId): this {
		this._deletePage(id)
		return this
	}
	/** @internal */
	private _deletePage = this.history.createCommand(
		'delete_page',
		(id: TLPageId) => {
			if (this.instanceState.isReadonly) return null
			const { pages } = this
			if (pages.length === 1) return null

			const deletedPage = this.getPage(id)
			const deletedPageStates = this.pageStates.filter((s) => s.pageId === id)

			if (!deletedPage) return null

			if (id === this.currentPageId) {
				const index = pages.findIndex((page) => page.id === id)
				const next = pages[index - 1] ?? pages[index + 1]
				this.setCurrentPageId(next.id)
			}

			return { data: { id, deletedPage, deletedPageStates } }
		},
		{
			do: ({ deletedPage, deletedPageStates }) => {
				const { pages } = this
				if (pages.length === 1) return

				if (deletedPage.id === this.currentPageId) {
					const index = pages.findIndex((page) => page.id === deletedPage.id)
					const next = pages[index - 1] ?? pages[index + 1]
					this.setCurrentPageId(next.id)
				}

				this.store.remove(deletedPageStates.map((s) => s.id)) // remove the page state
				this.store.remove([deletedPage.id]) // remove the page
				this.updateRenderingBounds()
			},
			undo: ({ deletedPage, deletedPageStates }) => {
				this.store.put([deletedPage])
				this.store.put(deletedPageStates)
				this.updateRenderingBounds()
			},
		}
	)

	/**
	 * Duplicate a page.
	 *
	 * @param id - The id of the page to duplicate. Defaults to the current page.
	 * @param createId - The id of the new page. Defaults to a new id.
	 *
	 * @public
	 */
	duplicatePage(id: TLPageId = this.currentPageId, createId: TLPageId = PageRecordType.createId()) {
		if (this.pages.length >= MAX_PAGES) return this
		const page = this.getPage(id)
		if (!page) return this

		const camera = { ...this.camera }
		const content = this.getContent(this.getSortedChildIds(page.id))

		this.batch(() => {
			this.createPage(page.name + ' Copy', createId, page.index)
			this.setCurrentPageId(createId)
			this.setCamera(camera.x, camera.y, camera.z)

			// will change page automatically
			if (content) {
				return this.putContent(content)
			}
		})

		return this
	}

	/**
	 * Rename a page.
	 *
	 * @example
	 * ```ts
	 * editor.renamePage('page1', 'My Page')
	 * ```
	 *
	 * @param id - The id of the page to rename.
	 * @param name - The new name.
	 *
	 * @public
	 */
	renamePage(id: TLPageId, name: string, squashing = false) {
		if (this.instanceState.isReadonly) return this
		this.updatePage({ id, name }, squashing)
		return this
	}

	/* --------------------- Assets --------------------- */

	/** @internal */
	@computed private get _assets() {
		return this.store.query.records('asset')
	}

	/**
	 * Get all assets in the editor.
	 *
	 * @public
	 */
	get assets() {
		return this._assets.value
	}

	/**
	 * Create one or more assets.
	 *
	 * @example
	 * ```ts
	 * editor.createAssets([...myAssets])
	 * ```
	 *
	 * @param assets - The assets to create.
	 *
	 * @public
	 */
	createAssets(assets: TLAsset[]) {
		this._createAssets(assets)
		return this
	}
	/** @internal */
	private _createAssets = this.history.createCommand(
		'createAssets',
		(assets: TLAsset[]) => {
			if (this.instanceState.isReadonly) return null
			if (assets.length <= 0) return null

			return { data: { assets } }
		},
		{
			do: ({ assets }) => {
				this.store.put(assets)
			},
			undo: ({ assets }) => {
				// todo: should we actually remove assets here? or on cleanup elsewhere?
				this.store.remove(assets.map((a) => a.id))
			},
		}
	)

	/**
	 * Update one or more assets.
	 *
	 * @example
	 * ```ts
	 * editor.updateAssets([{ id: 'asset1', name: 'New name' }])
	 * ```
	 *
	 * @param assets - The assets to update.
	 *
	 * @public
	 */
	updateAssets(assets: TLAssetPartial[]) {
		this._updateAssets(assets)
		return this
	}
	/** @internal */
	private _updateAssets = this.history.createCommand(
		'updateAssets',
		(assets: TLAssetPartial[]) => {
			if (this.instanceState.isReadonly) return
			if (assets.length <= 0) return

			const snapshots: Record<string, TLAsset> = {}

			return { data: { snapshots, assets } }
		},
		{
			do: ({ assets, snapshots }) => {
				this.store.put(
					assets.map((a) => {
						const asset = this.store.get(a.id)!
						snapshots[a.id] = asset

						return {
							...asset,
							...a,
						}
					})
				)
			},
			undo: ({ snapshots }) => {
				this.store.put(Object.values(snapshots))
			},
		}
	)

	/**
	 * Delete one or more assets.
	 *
	 * @example
	 * ```ts
	 * editor.deleteAssets(['asset1', 'asset2'])
	 * ```
	 *
	 * @param ids - The assets to delete.
	 *
	 * @public
	 */
	deleteAssets(ids: TLAssetId[]) {
		this._deleteAssets(ids)
		return this
	}
	/** @internal */
	private _deleteAssets = this.history.createCommand(
		'deleteAssets',
		(ids: TLAssetId[]) => {
			if (this.instanceState.isReadonly) return
			if (ids.length <= 0) return

			const prev = compact(ids.map((id) => this.store.get(id)))

			return { data: { ids, prev } }
		},
		{
			do: ({ ids }) => {
				this.store.remove(ids)
			},
			undo: ({ prev }) => {
				this.store.put(prev)
			},
		}
	)

	/**
	 * Get an asset by its id.
	 *
	 * @example
	 * ```ts
	 * editor.getAsset('asset1')
	 * ```
	 *
	 * @param id - The id of the asset.
	 *
	 * @public
	 */
	getAsset(id: TLAssetId): TLAsset | undefined
	getAsset(asset: TLAsset): TLAsset | undefined
	getAsset(id: TLAssetId | TLAsset): TLAsset | undefined {
		return this.store.get(typeof id === 'string' ? id : id.id) as TLAsset | undefined
	}

	/* --------------------- Shapes --------------------- */

	@computed
	private get _geometryCache(): ComputedCache<Geometry2d, TLShape> {
		return this.store.createComputedCache('bounds', (shape) => {
			return this.getShapeUtil(shape).getGeometry(shape)
		})
	}

	/**
	 * Get the geometry of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getGeometry(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the geometry for.
	 *
	 * @public
	 */
	getGeometry<T extends Geometry2d>(id: TLShapeId): T
	getGeometry<T extends Geometry2d>(shape: TLShape): T
	getGeometry<T extends Geometry2d>(id: TLShape | TLShapeId): T {
		return this._geometryCache.get(typeof id === 'string' ? id : id.id)! as T
	}

	@computed
	private get _outlineSegmentsCache(): ComputedCache<Vec2d[][], TLShape> {
		return this.store.createComputedCache('outline-segments', (shape) => {
			return this.getShapeUtil(shape).getOutlineSegments(shape)
		})
	}

	/**
	 * Get the local outline segments of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getOutlineSegments(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the outline segments for.
	 *
	 * @public
	 */
	getOutlineSegments<T extends TLShape>(shape: T): Vec2d[][]
	getOutlineSegments<T extends TLShape>(id: T['id']): Vec2d[][]
	getOutlineSegments<T extends TLShape>(shape: T | T['id']): Vec2d[][] {
		return (
			this._outlineSegmentsCache.get(typeof shape === 'string' ? shape : shape.id) ?? EMPTY_ARRAY
		)
	}

	@computed
	private get handlesCache(): ComputedCache<TLHandle[] | undefined, TLShape> {
		return this.store.createComputedCache('handles', (shape) => {
			return this.getShapeUtil(shape).getHandles?.(shape)
		})
	}

	/**
	 * Get the handles (if any) for a shape.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	getHandles<T extends TLShape>(id: T['id']): TLHandle[] | undefined
	getHandles<T extends TLShape>(shape: T): TLHandle[] | undefined
	getHandles<T extends TLShape>(shape: T | T['id']): TLHandle[] | undefined {
		return this.handlesCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the local transform for a shape as a matrix model. This transform reflects both its
	 * translation (x, y) from from either its parent's top left corner, if the shape's parent is
	 * another shape, or else from the 0,0 of the page, if the shape's parent is the page; and the
	 * shape's rotation.
	 *
	 * @example
	 * ```ts
	 * editor.getTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the local transform for.
	 *
	 * @public
	 */
	getTransform(shape: TLShape) {
		return Matrix2d.Compose(Matrix2d.Translate(shape.x, shape.y), Matrix2d.Rotate(shape.rotation))
	}

	/**
	 * A cache of page transforms.
	 *
	 * @internal
	 */
	@computed private get _pageTransformCache(): ComputedCache<Matrix2d, TLShape> {
		return this.store.createComputedCache<Matrix2d, TLShape>('pageTransformCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return this.getTransform(shape)
			}

			// If the shape's parent doesn't exist yet (e.g. when merging in changes from remote in the wrong order)
			// then we can't compute the transform yet, so just return the identity matrix.
			// In the future we should look at creating a store update mechanism that understands and preserves
			// ordering.
			const parent = this._pageTransformCache.get(shape.parentId) ?? Matrix2d.Identity()

			return Matrix2d.Compose(parent, this.getTransform(shape))
		})
	}

	/**
	 * Get the local transform of a shape's parent as a matrix model.
	 *
	 * @example
	 * ```ts
	 * editor.getParentTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the parent transform for.
	 *
	 * @public
	 */
	getParentTransform(shape: TLShape) {
		if (isPageId(shape.parentId)) {
			return Matrix2d.Identity()
		}
		return this._pageTransformCache.get(shape.parentId) ?? Matrix2d.Identity()
	}

	/**
	 * Get the page transform (or absolute transform) of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getPageTransform(myShape)
	 * editor.getPageTransform(myShapeId)
	 * ```
	 *
	 * @param shape - The shape to get the page transform for.
	 *
	 * @public
	 */
	getPageTransform(id: TLShapeId): Matrix2d | undefined
	getPageTransform(shape: TLShape): Matrix2d | undefined
	getPageTransform(shape: TLShape | TLShapeId): Matrix2d | undefined {
		return this._pageTransformCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of axis aligned page bounding boxes.
	 *
	 * @internal
	 */
	@computed private get _pageBoundsCache(): ComputedCache<Box2d, TLShape> {
		return this.store.createComputedCache<Box2d, TLShape>('pageBoundsCache', (shape) => {
			const pageTransform = this._pageTransformCache.get(shape.id)

			if (!pageTransform) return new Box2d()

			const result = Box2d.FromPoints(
				Matrix2d.applyToPoints(pageTransform, this.getGeometry(shape).vertices)
			)

			return result
		})
	}

	/**
	 * Get the page (or absolute) bounds of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getPageBounds(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the bounds for.
	 *
	 * @public
	 */
	getPageBounds(shape: TLShape): Box2d | undefined
	getPageBounds(id: TLShapeId): Box2d | undefined
	getPageBounds(shape: TLShape | TLShapeId): Box2d | undefined {
		return this._pageBoundsCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of clip paths used for clipping.
	 *
	 * @internal
	 */
	@computed private get _clipPathCache(): ComputedCache<string, TLShape> {
		return this.store.createComputedCache<string, TLShape>('clipPathCache', (shape) => {
			const pageMask = this._pageMaskCache.get(shape.id)
			if (!pageMask) return undefined
			const pageTransform = this._pageTransformCache.get(shape.id)
			if (!pageTransform) return undefined

			if (pageMask.length === 0) {
				return `polygon(0px 0px, 0px 0px, 0px 0px)`
			}

			const localMask = Matrix2d.applyToPoints(Matrix2d.Inverse(pageTransform), pageMask)

			return `polygon(${localMask.map((p) => `${p.x}px ${p.y}px`).join(',')})`
		})
	}

	/**
	 * Get the clip path for a shape.
	 *
	 * @example
	 * ```ts
	 * const clipPath = editor.getClipPathBy(shape)
	 * const clipPath = editor.getClipPathBy(shape.id)
	 * ```
	 *
	 * @param id - The shape id.
	 *
	 * @returns The clip path or undefined.
	 *
	 * @public
	 */
	getClipPath(shape: TLShape): string | undefined
	getClipPath(id: TLShapeId): string | undefined
	getClipPath(shape: TLShape | TLShapeId): string | undefined {
		return this._clipPathCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of page masks used for clipping.
	 *
	 * @internal
	 */
	@computed private get _pageMaskCache(): ComputedCache<Vec2d[], TLShape> {
		return this.store.createComputedCache<Vec2d[], TLShape>('pageMaskCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return undefined
			}

			const frameAncestors = this.getAncestorsById(shape.id).filter((shape) =>
				this.isShapeOfType<TLFrameShape>(shape, 'frame')
			)

			if (frameAncestors.length === 0) return undefined

			const pageMask = frameAncestors
				.map<Vec2d[] | undefined>((s) =>
					// Apply the frame transform to the frame outline to get the frame outline in page space
					this._pageTransformCache.get(s.id)!.applyToPoints(this.getGeometry(s).vertices)
				)
				.reduce((acc, b) => {
					if (!(b && acc)) return undefined
					const intersection = intersectPolygonPolygon(acc, b)
					if (intersection) {
						return intersection.map(Vec2d.Cast)
					}
					return undefined
				})

			return pageMask
		})
	}

	/**
	 * Get the page mask for a shape.
	 *
	 * @example
	 * ```ts
	 * const pageMask = editor.getPageMask(shape.id)
	 * ```
	 *
	 * @param id - The id of the shape to get the page mask for.
	 *
	 * @returns The page mask for the shape.
	 *
	 * @public
	 */
	getPageMask(id: TLShapeId): VecLike[] | undefined
	getPageMask(shape: TLShape): VecLike[] | undefined
	getPageMask(shape: TLShapeId | TLShape): VecLike[] | undefined {
		return this._pageMaskCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the page (or absolute) bounds of a shape, incorporating any masks. For example, if the
	 * shape were the child of a frame and was half way out of the frame, the bounds would be the half
	 * of the shape that was in the frame.
	 *
	 * @example
	 * ```ts
	 * editor.getMaskedPageBounds(myShape)
	 * editor.getMaskedPageBounds(myShapeId)
	 * ```
	 *
	 * @param shape - The shape to get the masked bounds for.
	 *
	 * @public
	 */
	getMaskedPageBounds(id: TLShapeId): Box2d | undefined
	getMaskedPageBounds(shape: TLShape): Box2d | undefined
	getMaskedPageBounds(id: TLShapeId | TLShape): Box2d | undefined {
		if (typeof id !== 'string') id = id.id
		const pageBounds = this._pageBoundsCache.get(id)
		if (!pageBounds) return
		const pageMask = this._pageMaskCache.get(id)
		if (pageMask) {
			const intersection = intersectPolygonPolygon(pageMask, pageBounds.corners)
			if (!intersection) return
			return Box2d.FromPoints(intersection)
		}

		return pageBounds
	}

	/**
	 * Get the ancestors of a shape.
	 *
	 * @example
	 * ```ts
	 * const ancestors = editor.getAncestors(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the ancestors for.
	 *
	 * @public
	 */
	getAncestors(shape: TLShape, acc: TLShape[] = []): TLShape[] {
		const parentId = shape.parentId
		if (isPageId(parentId)) {
			acc.reverse()
			return acc
		}

		const parent = this.store.get(parentId)
		if (!parent) return acc
		acc.push(parent)
		return this.getAncestors(parent, acc)
	}

	/**
	 * Get the ancestors of a shape by its id.
	 *
	 * @example
	 * ```ts
	 * const ancestors = editor.getAncestorsById(myShape)
	 * ```
	 *
	 * @param id - The id of the shape to get the ancestors for.
	 *
	 * @public
	 */
	getAncestorsById(id: TLShapeId, acc: TLShape[] = []): TLShape[] {
		const shape = this.getShape(id)
		if (!shape) return acc
		return this.getAncestors(shape, acc)
	}

	/**
	 * Find the first ancestor matching the given predicate
	 *
	 * @example
	 * ```ts
	 * const ancestor = editor.findAncestor(myShape)
	 * ```
	 *
	 * @param shape - The shape to check the ancestors for.
	 *
	 * @public
	 */
	findAncestor(shape: TLShape, predicate: (parent: TLShape) => boolean): TLShape | undefined {
		const parentId = shape.parentId

		if (isPageId(parentId)) {
			return undefined
		}

		const parent = this.getShape(parentId)

		if (parent) {
			if (predicate(parent)) {
				return parent
			}
			return this.findAncestor(parent, predicate)
		}

		return undefined
	}

	/**
	 * Returns true if the the given shape has the given ancestor.
	 *
	 * @param shape - The shape.
	 * @param ancestorId - The id of the ancestor.
	 *
	 * @public
	 */
	hasAncestor(shape: TLShape | undefined, ancestorId: TLShapeId): boolean {
		if (!shape) return false
		if (shape.parentId === ancestorId) return true
		return this.hasAncestor(this.getParentShape(shape), ancestorId)
	}

	/**
	 * Get the common ancestor of two or more shapes that matches a predicate.
	 *
	 * @param shapes - The shapes to check.
	 * @param predicate - The predicate to match.
	 */
	findCommonAncestor(
		shapes: TLShape[],
		predicate?: (shape: TLShape) => boolean
	): TLShapeId | undefined {
		if (shapes.length === 0) {
			return
		}
		if (shapes.length === 1) {
			const parentId = shapes[0].parentId
			if (isPageId(parentId)) {
				return
			}
			return predicate ? this.findAncestor(shapes[0], predicate)?.id : parentId
		}

		const [nodeA, ...others] = shapes
		let ancestor = this.getParentShape(nodeA)
		while (ancestor) {
			// TODO: this is not ideal, optimize
			if (predicate && !predicate(ancestor)) {
				ancestor = this.getParentShape(ancestor)
				continue
			}
			if (others.every((shape) => this.hasAncestor(shape, ancestor!.id))) {
				return ancestor!.id
			}
			ancestor = this.getParentShape(ancestor)
		}
		return undefined
	}

	/**
	 * Check whether a shape or its parent is locked.
	 *
	 * @param id - The id of the shape to check.
	 *
	 * @public
	 */
	isShapeOrAncestorLocked(shape?: TLShape): boolean {
		if (shape === undefined) return false
		if (shape.isLocked) return true
		return this.isShapeOrAncestorLocked(this.getParentShape(shape))
	}

	/**
	 * The common bounds of all of the shapes on the page.
	 *
	 * @public
	 */
	@computed get allShapesCommonBounds(): Box2d | undefined {
		let commonBounds: Box2d | undefined

		this.currentPageShapeIds.forEach((shapeId) => {
			const bounds = this.getMaskedPageBounds(shapeId)
			if (!bounds) return
			if (!commonBounds) {
				commonBounds = bounds
			} else {
				commonBounds = commonBounds.expand(bounds)
			}
		})

		return commonBounds
	}

	/**
	 * Get the corners of a shape in page space.
	 *
	 * @example
	 * ```ts
	 * const corners = editor.getPageCorners(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the corners for.
	 *
	 * @public
	 */
	getPageCorners(shape: TLShape): Vec2d[] {
		const ancestors = this.getAncestors(shape)
		const corners = this.getGeometry(shape).bounds.corners

		const transform = Matrix2d.Compose(
			...ancestors.flatMap((s) => [Matrix2d.Translate(s.x, s.y), Matrix2d.Rotate(s.rotation)]),
			Matrix2d.Translate(shape.x, shape.y),
			Matrix2d.Rotate(shape.rotation, 0, 0)
		)

		return Matrix2d.applyToPoints(transform, corners)
	}

	/**
	 * Get the top-most selected shape at the given point, ignoring groups.
	 *
	 * @param point - The point to check.
	 *
	 * @returns The top-most selected shape at the given point, or undefined if there is no shape at the point.
	 */
	getSelectedShapeAtPoint(point: Vec2d): TLShape | undefined {
		const { selectedIds } = this
		return this.sortedShapesArray
			.filter((shape) => shape.type !== 'group' && selectedIds.includes(shape.id))
			.findLast((shape) => this.isPointInShape(shape, point, { hitInside: true, margin: 0 }))
	}

	/**
	 * Get the shape at the current point.
	 *
	 * @param point - The point to check.
	 * @param opts - Options for the check: `hitInside` to check if the point is inside the shape, `margin` to check if the point is within a margin of the shape, `hitFrameInside` to check if the point is inside the frame, and `filter` to filter the shapes to check.
	 *
	 * @returns The shape at the given point, or undefined if there is no shape at the point.
	 */
	getShapeAtPoint(
		point: Vec2d,
		opts = {} as {
			hitInside?: boolean
			margin?: number
			ignoreGroups?: boolean
			hitFrameInside?: boolean
			filter?: (shape: TLShape) => boolean
		}
	): TLShape | undefined {
		// are we inside of a shape but not hovering it?
		const { viewportPageBounds, zoomLevel, sortedShapesArray } = this
		const { filter, margin = 0, hitInside = false, hitFrameInside = false } = opts

		let inHollowSmallestArea = Infinity
		let inHollowSmallestAreaHit: TLShape | null = null

		let inMarginClosestToEdgeDistance = Infinity
		let inMarginClosestToEdgeHit: TLShape | null = null

		const shapesToCheck = sortedShapesArray.filter((shape) => {
			if (this.isShapeOfType(shape, 'group')) return false
			const pageMask = this.getPageMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) return false
			if (filter) return filter(shape)
			return true
		})

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			let geometry = this.getGeometry(shape)

			const pointInShapeSpace = this.getPointInShapeSpace(shape, point)
			const distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)

			// On the rare case that we've hit a frame, test again hitInside to be forced true;
			// this prevents clicks from passing through the body of a frame to shapes behhind it.
			if (this.isShapeOfType(shape, 'frame')) {
				// If the hit is within the frame's outer margin, then select the frame
				if (Math.abs(distance) <= margin) {
					return inMarginClosestToEdgeHit || shape
				}

				if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
					// Once we've hit a frame, we want to end the search. If we have hit a shape
					// already, then this would either be above the frame or a child of the frame,
					// so we want to return that. Otherwise, the point is in the empty space of the
					// frame. If `hitFrameInside` is true (e.g. used drawing an arrow into the
					// frame) we the frame itself; other wise, (e.g. when hovering or pointing)
					// we would want to return null.
					return (
						inMarginClosestToEdgeHit ||
						inHollowSmallestAreaHit ||
						(hitFrameInside ? shape : undefined)
					)
				}
				continue
			}

			if (geometry instanceof Group2d) {
				geometry = geometry.children[0]
			}

			if (geometry.isClosed) {
				// For closed shapes, the distance will be positive if outside of
				// the shape or negative if inside of the shape. If the distance
				// is greater than the margin, then it's a miss. Otherwise...
				if (distance <= margin) {
					if (geometry.isFilled) {
						// If the shape is filled, then it's a hit. Remember, we're
						// starting from the TOP-MOST shape in z-index order, so any
						// other hits would be occluded by the shape.
						return inMarginClosestToEdgeHit || shape
					} else {
						// If the shape is bigger than the viewport, then skip it.
						if (this.getPageBounds(shape)!.contains(viewportPageBounds)) continue

						// For hollow shapes...
						if (Math.abs(distance) < margin) {
							// We want to preference shapes where we're inside of the
							// shape margin; and we would want to hit the shape with the
							// edge closest to the point.
							if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
								inMarginClosestToEdgeDistance = Math.abs(distance)
								inMarginClosestToEdgeHit = shape
							}
						} else if (!inMarginClosestToEdgeHit) {
							// If we're not within margin distnce to any edge, and if the
							// shape is hollow, then we want to hit the shape with the
							// smallest area. (There's a bug here with self-intersecting
							// shapes, like a closed drawing of an "8", but that's a bigger
							// problem to solve.)
							const { area } = geometry
							if (area < inHollowSmallestArea) {
								inHollowSmallestArea = area
								inHollowSmallestAreaHit = shape
							}
						}
					}
				}
			} else {
				// For open shapes (e.g. lines or draw shapes) always use the margin.
				// If the distance is less than the margin, return the shape as the hit.
				if (distance < HIT_TEST_MARGIN / zoomLevel) {
					return shape
				}
			}
		}

		// If we haven't hit any filled shapes or frames, then return either
		// the shape who we hit within the margin (and of those, the one that
		// had the shortest distance between the point and the shape edge),
		// or else the hollow shape with the smallest area—or if we didn't hit
		// any margins or any hollow shapes, then null.
		return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
	}

	/**
	 * Test whether a point (in page space) will will a shape. This method takes into account masks,
	 * such as when a shape is the child of a frame and is partially clipped by the frame.
	 *
	 * @example
	 * ```ts
	 * editor.isPointInShape({ x: 100, y: 100 }, myShape)
	 * ```
	 *
	 * @param shape - The shape to test against.
	 * @param point - The page point to test (in page space).
	 * @param hitInside - Whether to count as a hit if the point is inside of a closed shape.
	 *
	 * @public
	 */
	isPointInShape(
		shape: TLShape,
		point: VecLike,
		opts?: { margin?: number; hitInside?: boolean }
	): boolean
	isPointInShape(
		id: TLShapeId,
		point: VecLike,
		opts?: { margin?: number; hitInside?: boolean }
	): boolean
	isPointInShape(
		id: TLShape | TLShapeId,
		point: VecLike,
		opts = {} as {
			margin?: number
			hitInside?: boolean
		}
	): boolean {
		const { hitInside = false, margin = 0 } = opts
		if (typeof id !== 'string') id = id.id
		// If the shape is masked, and if the point falls outside of that
		// mask, then it's defintely a miss—we don't need to test further.
		const pageMask = this.getPageMask(id)
		if (pageMask && !pointInPolygon(point, pageMask)) return false

		return this.getGeometry(id).hitTestPoint(
			this.getPointInShapeSpace(id, point),
			margin,
			hitInside
		)
	}

	/**
	 * Get the shapes, if any, at a given page point.
	 *
	 * @example
	 * ```ts
	 * editor.getShapesAtPoint({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The page point to test.
	 *
	 * @public
	 */
	getShapesAtPoint(
		point: VecLike,
		opts = {} as { hitInside?: boolean; exact?: boolean }
	): TLShape[] {
		return this.shapesArray.filter((shape) => this.isPointInShape(shape, point, opts))
	}

	/**
	 * Convert a point in page space to a point in the local space of a shape. For example, if a
	 * shape's page point were `{ x: 100, y: 100 }`, a page point at `{ x: 110, y: 110 }` would be at
	 * `{ x: 10, y: 10 }` in the shape's local space.
	 *
	 * @example
	 * ```ts
	 * editor.getPointInShapeSpace(myShape, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the point in the local space of.
	 * @param point - The page point to get in the local space of the shape.
	 *
	 * @public
	 */
	getPointInShapeSpace(shape: TLShape, point: VecLike): Vec2d
	getPointInShapeSpace(id: TLShapeId, point: VecLike): Vec2d
	getPointInShapeSpace(id: TLShape | TLShapeId, point: VecLike): Vec2d {
		return this._pageTransformCache
			.get(typeof id === 'string' ? id : id.id)!
			.clone()
			.invert()
			.applyToPoint(point)
	}

	/**
	 * Convert a delta in page space to a point in the local space of a shape. For example, if a
	 * shape's page point were `{ x: 100, y: 100 }`, a page point at `{ x: 110, y: 110 }` would be at
	 * `{ x: 10, y: 10 }` in the shape's local space.
	 *
	 * @example
	 * ```ts
	 * editor.getPointInShapeSpace(myShape.id, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the point in the local space of.
	 * @param point - The page point to get in the local space of the shape.
	 *
	 * @public
	 */
	getPointInParentSpace(shapeId: TLShapeId, point: VecLike): Vec2d {
		const shape = this.getShape(shapeId)!
		if (!shape) {
			return new Vec2d(0, 0)
		}
		if (isPageId(shape.parentId)) return Vec2d.From(point)

		const parentTransform = this.getPageTransform(shape.parentId)
		if (!parentTransform) return Vec2d.From(point)

		return Matrix2d.applyToPoint(Matrix2d.Inverse(parentTransform), point)
	}

	/**
	 * Convert a delta in page space to a delta in the local space of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getDeltaInShapeSpace(myShape, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the delta in the local space of.
	 * @param delta - The page delta to convert.
	 *
	 * @public
	 */
	getDeltaInShapeSpace(shape: TLShape, delta: VecLike): Vec2d {
		const pageTransform = this.getPageTransform(shape)
		if (!pageTransform) return Vec2d.From(delta)
		return Vec2d.Rot(delta, -pageTransform.rotation())
	}

	/**
	 * Convert a delta in page space to a delta in the parent space of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getDeltaInParentSpace(myShape, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the delta in the parent space of.
	 * @param delta - The page delta to convert.
	 *
	 * @public
	 */
	getDeltaInParentSpace(shape: TLShape, delta: VecLike): Vec2d {
		if (isPageId(shape.parentId)) return Vec2d.From(delta)

		const parent = this.getShape(shape.parentId)
		if (!parent) return Vec2d.From(delta)

		return this.getDeltaInShapeSpace(parent, delta)
	}

	/**
	 * An array containing all of the shapes in the current page.
	 *
	 * @example
	 * ```ts
	 * editor.shapesArray
	 * ```
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get shapesArray() {
		return Array.from(this.currentPageShapeIds, (id) => this.store.get(id)! as TLShape)
	}

	/**
	 * An array containing all of the shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @example
	 * ```ts
	 * editor.sortedShapesArray
	 * ```
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get sortedShapesArray(): TLShape[] {
		// todo: consider making into a function call that includes options for selected-only, rendering, etc.
		// todo: consider making a derivation or something, or merging with rendering shapes
		const shapes = new Set(this.shapesArray.sort(sortByIndex))

		const results: TLShape[] = []

		function pushShapeWithDescendants(shape: TLShape): void {
			results.push(shape)
			shapes.delete(shape)

			shapes.forEach((otherShape) => {
				if (otherShape.parentId === shape.id) {
					pushShapeWithDescendants(otherShape)
				}
			})
		}

		shapes.forEach((shape) => {
			const parent = this.getShape(shape.parentId)
			if (!isShape(parent)) {
				pushShapeWithDescendants(shape)
			}
		})

		return results
	}

	/**
	 * Get whether a shape matches the type of a TLShapeUtil.
	 *
	 * @example
	 * ```ts
	 * const isArrowShape = isShapeOfType<TLArrowShape>(someShape, 'arrow')
	 * ```
	 *
	 * @param util - the TLShapeUtil constructor to test against
	 * @param shape - the shape to test
	 *
	 * @public
	 */
	isShapeOfType<T extends TLUnknownShape>(shape: TLUnknownShape, type: T['type']): shape is T {
		return shape.type === type
	}

	/**
	 * Get a shape by its id.
	 *
	 * @example
	 * ```ts
	 * editor.getShape('box1')
	 * ```
	 *
	 * @param id - The id of the shape to get.
	 *
	 * @public
	 */
	getShape<T extends TLShape = TLShape>(id: TLParentId): T | undefined
	getShape<T extends TLShape = TLShape>(shape: TLShape): T | undefined
	getShape<T extends TLShape = TLShape>(id: TLShape | TLParentId): T | undefined {
		if (id === undefined) throw Error()
		if (typeof id !== 'string') id = id.id
		if (!isShapeId(id)) return undefined
		return this.store.get(id) as T
	}

	/**
	 * Get the parent shape for a given shape. Returns undefined if the shape is the direct child of
	 * the page.
	 *
	 * @example
	 * ```ts
	 * editor.getParentShape(myShape)
	 * ```
	 *
	 * @public
	 */
	getParentShape(shape?: TLShape): TLShape | undefined {
		if (shape === undefined || !isShapeId(shape.parentId)) return undefined
		return this.store.get(shape.parentId)
	}

	/**
	 * If siblingShape and targetShape are siblings, this returns targetShape. If targetShape has an
	 * ancestor who is a sibling of siblingShape, this returns that ancestor. Otherwise, this returns
	 * undefined.
	 *
	 * @internal
	 */
	private getShapeNearestSibling(
		siblingShape: TLShape,
		targetShape: TLShape | undefined
	): TLShape | undefined {
		if (!targetShape) {
			return undefined
		}
		if (targetShape.parentId === siblingShape.parentId) {
			return targetShape
		}

		const ancestor = this.findAncestor(
			targetShape,
			(ancestor) => ancestor.parentId === siblingShape.parentId
		)

		return ancestor
	}

	/**
	 * Get whether the given shape is the descendant of the given page.
	 *
	 * @example
	 * ```ts
	 * editor.isShapeInPage(myShape)
	 * editor.isShapeInPage(myShape, 'page1')
	 * ```
	 *
	 * @param shape - The shape to check.
	 * @param pageId - The id of the page to check against. Defaults to the current page.
	 *
	 * @public
	 */
	isShapeInPage(shape: TLShape, pageId = this.currentPageId): boolean {
		let shapeIsInPage = false

		if (shape.parentId === pageId) {
			shapeIsInPage = true
		} else {
			let parent = this.getShape(shape.parentId)
			isInPageSearch: while (parent) {
				if (parent.parentId === pageId) {
					shapeIsInPage = true
					break isInPageSearch
				}
				parent = this.getShape(parent.parentId)
			}
		}

		return shapeIsInPage
	}

	/**
	 * Get the id of the containing page for a given shape.
	 *
	 * @param shape - The shape to get the page id for.
	 *
	 * @returns The id of the page that contains the shape, or undefined if the shape is undefined.
	 *
	 * @public
	 */
	getAncestorPageId(shape?: TLShape): TLPageId | undefined {
		if (shape === undefined) return undefined
		if (isPageId(shape.parentId)) {
			return shape.parentId
		} else {
			return this.getAncestorPageId(this.getShape(shape.parentId))
		}
	}

	// Parents and children

	/**
	 * A cache of parents to children.
	 *
	 * @internal
	 */
	private readonly _parentIdsToChildIds: ReturnType<typeof parentsToChildrenWithIndexes>

	/**
	 * Reparent shapes to a new parent. This operation preserves the shape's current page positions /
	 * rotations.
	 *
	 * @example
	 * ```ts
	 * editor.reparentShapes([box1, box2], 'frame1')
	 * editor.reparentShapes([box1.id, box2.id], 'frame1')
	 * editor.reparentShapes([box1.id, box2.id], 'frame1', 4)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) of the shapes to reparent.
	 * @param parentId - The id of the new parent shape.
	 * @param insertIndex - (optional) The index to insert the children.
	 *
	 * @public
	 */
	reparentShapes(shapes: TLShape[], parentId: TLParentId, insertIndex?: string): this
	reparentShapes(ids: TLShapeId[], parentId: TLParentId, insertIndex?: string): this
	reparentShapes(_ids: TLShapeId[] | TLShape[], parentId: TLParentId, insertIndex?: string) {
		const ids =
			typeof _ids[0] === 'string' ? (_ids as TLShapeId[]) : _ids.map((s) => (s as TLShape).id)
		const changes: TLShapePartial[] = []

		const parentTransform = isPageId(parentId)
			? Matrix2d.Identity()
			: this.getPageTransform(parentId)!

		const parentPageRotation = parentTransform.rotation()

		let indices: string[] = []

		const sibs = compact(this.getSortedChildIds(parentId).map((id) => this.getShape(id)))

		if (insertIndex) {
			const sibWithInsertIndex = sibs.find((s) => s.index === insertIndex)
			if (sibWithInsertIndex) {
				// If there's a sibling with the same index as the insert index...
				const sibAbove = sibs[sibs.indexOf(sibWithInsertIndex) + 1]
				if (sibAbove) {
					// If the sibling has a sibling above it, insert the shapes
					// between the sibling and its sibling above it.
					indices = getIndicesBetween(insertIndex, sibAbove.index, ids.length)
				} else {
					// Or if the sibling is the top sibling, insert the shapes
					// above the sibling
					indices = getIndicesAbove(insertIndex, ids.length)
				}
			} else {
				// If there's no collision, then we can start at the insert index
				const sibAbove = sibs.sort(sortByIndex).find((s) => s.index > insertIndex)

				if (sibAbove) {
					// If the siblings include a sibling with a higher index, insert the shapes
					// between the insert index and the sibling with the higher index.
					indices = getIndicesBetween(insertIndex, sibAbove.index, ids.length)
				} else {
					// Otherwise, we're at the top of the order, so insert the shapes above
					// the insert index.
					indices = getIndicesAbove(insertIndex, ids.length)
				}
			}
		} else {
			// If insert index is not specified, start the index at the top.
			const sib = sibs.length && sibs[sibs.length - 1]
			indices = sib ? getIndicesAbove(sib.index, ids.length) : getIndices(ids.length)
		}

		const invertedParentTransform = parentTransform.clone().invert()

		let id: TLShapeId
		for (let i = 0; i < ids.length; i++) {
			id = ids[i]
			const shape = this.getShape(id)
			if (!shape) continue
			const pageTransform = this.getPageTransform(shape)!
			if (!pageTransform) continue
			const pagePoint = pageTransform.point()

			if (!shape || !pagePoint) continue

			const newPoint = invertedParentTransform.applyToPoint(pagePoint)
			const newRotation = pageTransform.rotation() - parentPageRotation

			changes.push({
				id: shape.id,
				type: shape.type,
				parentId: parentId,
				x: newPoint.x,
				y: newPoint.y,
				rotation: newRotation,
				index: indices[i],
			})
		}

		this.updateShapes(changes)
		return this
	}

	/**
	 * Get the index above the highest child of a given parent.
	 *
	 * @param parentId - The id of the parent.
	 *
	 * @returns The index.
	 *
	 * @public
	 */
	getHighestIndexForParent(parentId: TLShapeId | TLPageId) {
		const children = this._parentIdsToChildIds.value[parentId]

		if (!children || children.length === 0) {
			return 'a1'
		}
		return getIndexAbove(children[children.length - 1][1])
	}

	/**
	 * A cache of children for each parent.
	 *
	 * @internal
	 */
	private _childIdsCache = new WeakMapCache<any[], TLShapeId[]>()

	/**
	 * Get an array of all the children of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getSortedChildIds('frame1')
	 * ```
	 *
	 * @param parentId - The id of the parent shape.
	 *
	 * @public
	 */
	getSortedChildIds(parentId: TLParentId): TLShapeId[] {
		const withIndices = this._parentIdsToChildIds.value[parentId]
		if (!withIndices) return EMPTY_ARRAY
		return this._childIdsCache.get(withIndices, () => withIndices.map(([id]) => id))
	}

	/**
	 * Run a visitor function for all descendants of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.visitDescendants('frame1', myCallback)
	 * ```
	 *
	 * @param parentId - The id of the parent shape.
	 * @param visitor - The visitor function.
	 *
	 * @public
	 */
	visitDescendants(parentId: TLParentId, visitor: (id: TLShapeId) => void | false) {
		const children = this.getSortedChildIds(parentId)
		for (const id of children) {
			if (visitor(id) === false) continue
			this.visitDescendants(id, visitor)
		}
	}

	/**
	 * Get the shape ids of all descendants of the given shapes (including the shapes themselves).
	 *
	 * @param ids - The ids of the shapes to get descendants of.
	 *
	 * @returns The decscendant ids.
	 *
	 * @public
	 */
	getShapeAndDescendantIds(ids: TLShapeId[]): Set<TLShapeId> {
		const idsToInclude = new Set<TLShapeId>()

		const idsToCheck = [...ids]

		while (idsToCheck.length > 0) {
			const id = idsToCheck.pop()
			if (!id) break
			if (idsToInclude.has(id)) continue
			idsToInclude.add(id)
			this.getSortedChildIds(id).forEach((id) => {
				idsToCheck.push(id)
			})
		}

		return idsToInclude
	}

	/**
	 * Get the id of what should be the parent of a new shape at a given point. The parent can be a page or shape.
	 *
	 * @param point - The point to find the parent for.
	 * @param shapeType - The type of shape that will be created.
	 *
	 * @returns The id of the parent.
	 *
	 * @public
	 */
	getParentIdForNewShapeAtPoint(point: VecLike, shapeType: TLShape['type']) {
		const shapes = this.sortedShapesArray

		for (let i = shapes.length - 1; i >= 0; i--) {
			const shape = shapes[i]
			const util = this.getShapeUtil(shape)
			if (!util.canReceiveNewChildrenOfType(shape, shapeType)) continue
			const maskedPageBounds = this.getMaskedPageBounds(shape.id)
			if (
				maskedPageBounds &&
				maskedPageBounds.containsPoint(point) &&
				this.getGeometry(shape).hitTestPoint(this.getPointInShapeSpace(shape, point), 0, true)
			) {
				return shape.id
			}
		}

		return this.focusLayerId
	}

	/**
	 * Get the shape that some shapes should be dropped on at a given point.
	 *
	 * @param point - The point to find the parent for.
	 * @param droppingShapes - The shapes that are being dropped.
	 *
	 * @returns The shape to drop on.
	 *
	 * @public
	 */
	getDroppingShape(point: VecLike, droppingShapes: TLShape[] = []) {
		const shapes = this.sortedShapesArray

		for (let i = shapes.length - 1; i >= 0; i--) {
			const shape = shapes[i]
			// don't allow dropping a shape on itself or one of it's children
			if (droppingShapes.find((s) => s.id === shape.id || this.hasAncestor(shape, s.id))) continue
			const util = this.getShapeUtil(shape)
			if (!util.canDropShapes(shape, droppingShapes)) continue
			const maskedPageBounds = this.getMaskedPageBounds(shape.id)
			if (
				maskedPageBounds &&
				maskedPageBounds.containsPoint(point) &&
				this.getGeometry(shape).hitTestPoint(this.getPointInShapeSpace(shape, point), 0, true)
			) {
				return shape
			}
		}

		return undefined
	}

	/**
	 * Get the shape that should be selected when you click on a given shape, assuming there is
	 * nothing already selected. It will not return anything higher than or including the current
	 * focus layer.
	 *
	 * @param shape - The shape to get the outermost selectable shape for.
	 * @param filter - A function to filter the selectable shapes.
	 *
	 * @returns The outermost selectable shape.
	 *
	 * @public
	 */
	getOutermostSelectableShape(shape: TLShape, filter?: (shape: TLShape) => boolean): TLShape {
		let match = shape
		let node = shape as TLShape | undefined

		const focusLayerShape = this.focusLayerId ? this.getShape(this.focusLayerId) : undefined

		while (node) {
			if (
				this.isShapeOfType<TLGroupShape>(node, 'group') &&
				this.focusLayerId !== node.id &&
				!this.hasAncestor(focusLayerShape, node.id) &&
				(filter?.(node) ?? true)
			) {
				match = node
			} else if (this.focusLayerId === node.id) {
				break
			}
			node = this.getParentShape(node)
		}

		return match
	}

	/* -------------------- Commands -------------------- */

	/**
	 * Rotate shapes by a delta in radians.
	 * Note: Currently, this assumes that the shapes are your currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.rotateShapesBy(editor.selectedIds, Math.PI)
	 * editor.rotateShapesBy(editor.selectedIds, Math.PI / 2)
	 * ```
	 *
	 * @param ids - The ids of the shapes to move.
	 * @param delta - The delta in radians to apply to the selection rotation.
	 */
	rotateShapesBy(ids: TLShapeId[], delta: number): this {
		if (ids.length <= 0) return this

		const snapshot = getRotationSnapshot({ editor: this })
		if (!snapshot) return this
		applyRotationToSnapshotShapes({ delta, snapshot, editor: this, stage: 'one-off' })

		return this
	}

	/**
	 * Move shapes by a delta.
	 *
	 * @example
	 * ```ts
	 * editor.nudgeShapes(['box1', 'box2'], { x: 0, y: 1 })
	 * editor.nudgeShapes(['box1', 'box2'], { x: 0, y: 1 }, true)
	 * ```
	 *
	 * @param ids - The ids of the shapes to move.
	 * @param direction - The direction in which to move the shapes.
	 * @param major - Whether this is a major nudge, e.g. a shift + arrow nudge.
	 */
	nudgeShapes(ids: TLShapeId[], direction: Vec2dModel, major = false, ephemeral = false): this {
		if (ids.length <= 0) return this
		const { gridSize } = this.documentSettings

		const step = this.instanceState.isGridMode
			? major
				? gridSize * GRID_INCREMENT
				: gridSize
			: major
			? MAJOR_NUDGE_FACTOR
			: MINOR_NUDGE_FACTOR

		const steppedDelta = Vec2d.Mul(direction, step)
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = this.getShape(id)

			if (!shape) {
				throw Error(`Could not find a shape with the id ${id}.`)
			}

			const localDelta = this.getDeltaInParentSpace(shape, steppedDelta)
			const translateStartChanges = this.getShapeUtil(shape).onTranslateStart?.(shape)

			changes.push(
				translateStartChanges
					? {
							...translateStartChanges,
							x: shape.x + localDelta.x,
							y: shape.y + localDelta.y,
					  }
					: {
							id,
							x: shape.x + localDelta.x,
							y: shape.y + localDelta.y,
							type: shape.type,
					  }
			)
		}

		this.updateShapes(changes, ephemeral)

		return this
	}

	/**
	 * Duplicate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.duplicateShapes()
	 * editor.duplicateShapes(['id1', 'id2'])
	 * editor.duplicateShapes(['id1', 'id2'], { x: 8, y: 8 })
	 * ```
	 *
	 * @param ids - The ids of the shapes to duplicate. Defaults to the ids of the selected shapes.
	 * @param offset - The offset (in pixels) to apply to the duplicated shapes.
	 *
	 * @public
	 */
	duplicateShapes(ids: TLShapeId[] = this.selectedIds, offset?: VecLike): this {
		if (ids.length <= 0) return this

		const initialIds = new Set(ids)
		const idsToCreate: TLShapeId[] = []
		const idsToCheck = [...ids]

		while (idsToCheck.length > 0) {
			const id = idsToCheck.pop()
			if (!id) break
			idsToCreate.push(id)
			this.getSortedChildIds(id).forEach((childId) => idsToCheck.push(childId))
		}

		idsToCreate.reverse()

		const idsMap = new Map<any, TLShapeId>(idsToCreate.map((id) => [id, createShapeId()]))

		const shapesToCreate = compact(
			idsToCreate.map((id) => {
				const shape = this.getShape(id)

				if (!shape) {
					return null
				}

				const createId = idsMap.get(id)!

				let ox = 0
				let oy = 0

				if (offset && initialIds.has(id)) {
					const parentTransform = this.getParentTransform(shape)
					const vec = new Vec2d(offset.x, offset.y).rot(
						-Matrix2d.Decompose(parentTransform).rotation
					)
					ox = vec.x
					oy = vec.y
				}

				const parentId = shape.parentId ?? this.currentPageId
				const siblings = this.getSortedChildIds(parentId)
				const currentIndex = siblings.indexOf(shape.id)
				const siblingAboveId = siblings[currentIndex + 1]
				const siblingAbove = siblingAboveId ? this.getShape(siblingAboveId) : null

				const index = siblingAbove
					? getIndexBetween(shape.index, siblingAbove.index)
					: getIndexAbove(shape.index)

				let newShape: TLShape = deepCopy(shape)

				if (
					this.isShapeOfType<TLArrowShape>(shape, 'arrow') &&
					this.isShapeOfType<TLArrowShape>(newShape, 'arrow')
				) {
					const info = this.getArrowInfo(shape)
					let newStartShapeId: TLShapeId | undefined = undefined
					let newEndShapeId: TLShapeId | undefined = undefined

					if (shape.props.start.type === 'binding') {
						newStartShapeId = idsMap.get(shape.props.start.boundShapeId)

						if (!newStartShapeId) {
							if (info?.isValid) {
								const { x, y } = info.start.point
								newShape.props.start = {
									type: 'point',
									x,
									y,
								}
							} else {
								const { start } = getArrowTerminalsInArrowSpace(this, shape)
								newShape.props.start = {
									type: 'point',
									x: start.x,
									y: start.y,
								}
							}
						}
					}

					if (shape.props.end.type === 'binding') {
						newEndShapeId = idsMap.get(shape.props.end.boundShapeId)
						if (!newEndShapeId) {
							if (info?.isValid) {
								const { x, y } = info.end.point
								newShape.props.end = {
									type: 'point',
									x,
									y,
								}
							} else {
								const { end } = getArrowTerminalsInArrowSpace(this, shape)
								newShape.props.start = {
									type: 'point',
									x: end.x,
									y: end.y,
								}
							}
						}
					}

					const infoAfter = getIsArrowStraight(newShape)
						? getStraightArrowInfo(this, newShape)
						: getCurvedArrowInfo(this, newShape)

					if (info?.isValid && infoAfter?.isValid && !getIsArrowStraight(shape)) {
						const mpA = Vec2d.Med(info.start.handle, info.end.handle)
						const distA = Vec2d.Dist(info.middle, mpA)
						const distB = Vec2d.Dist(infoAfter.middle, mpA)
						if (newShape.props.bend < 0) {
							newShape.props.bend += distB - distA
						} else {
							newShape.props.bend -= distB - distA
						}
					}

					if (newShape.props.start.type === 'binding' && newStartShapeId) {
						newShape.props.start.boundShapeId = newStartShapeId
					}

					if (newShape.props.end.type === 'binding' && newEndShapeId) {
						newShape.props.end.boundShapeId = newEndShapeId
					}
				}

				newShape = { ...newShape, id: createId, x: shape.x + ox, y: shape.y + oy, index }

				return newShape
			})
		)

		shapesToCreate.forEach((shape) => {
			if (isShapeId(shape.parentId)) {
				if (idsMap.has(shape.parentId)) {
					shape.parentId = idsMap.get(shape.parentId)!
				}
			}
		})

		this.history.batch(() => {
			const maxShapesReached =
				shapesToCreate.length + this.currentPageShapeIds.size > MAX_SHAPES_PER_PAGE

			if (maxShapesReached) {
				alertMaxShapes(this)
			}

			const newShapes = maxShapesReached
				? shapesToCreate.slice(0, MAX_SHAPES_PER_PAGE - this.currentPageShapeIds.size)
				: shapesToCreate

			const ids = newShapes.map((s) => s.id)

			this.createShapes(newShapes)
			this.setSelectedIds(ids)

			if (offset !== undefined) {
				// If we've offset the duplicated shapes, check to see whether their new bounds is entirely
				// contained in the current viewport. If not, then animate the camera to be centered on the
				// new shapes.
				const { viewportPageBounds, selectedPageBounds } = this
				if (selectedPageBounds && !viewportPageBounds.contains(selectedPageBounds)) {
					this.centerOnPoint(selectedPageBounds.center.x, selectedPageBounds.center.y, {
						duration: ANIMATION_MEDIUM_MS,
					})
				}
			}
		})

		return this
	}

	/**
	 * Move shapes to page.
	 *
	 * @example
	 * ```ts
	 * editor.moveShapesToPage(['box1', 'box2'], 'page1')
	 * ```
	 *
	 * @param ids - The ids of the shapes to move.
	 * @param pageId - The id of the page where the shapes will be moved.
	 *
	 * @public
	 */
	moveShapesToPage(ids: TLShapeId[], pageId: TLPageId): this {
		if (ids.length === 0) return this
		if (this.instanceState.isReadonly) return this

		const { currentPageId } = this

		if (pageId === currentPageId) return this
		if (!this.store.has(pageId)) return this

		// Basically copy the shapes
		const content = this.getContent(ids)

		// Just to be sure
		if (!content) return this

		// If there is no space on pageId, or if the selected shapes
		// would take the new page above the limit, don't move the shapes
		if (this.getShapeIdsInPage(pageId).size + content.shapes.length > MAX_SHAPES_PER_PAGE) {
			alertMaxShapes(this, pageId)
			return this
		}

		const fromPageZ = this.camera.z

		this.history.batch(() => {
			// Delete the shapes on the current page
			this.deleteShapes(ids)

			// Move to the next page
			this.setCurrentPageId(pageId)

			// Put the shape content onto the new page; parents and indices will
			// be taken care of by the putContent method; make sure to pop any focus
			// layers so that the content will be put onto the page.
			this.setFocusLayerId(this.currentPageId)
			this.selectNone()
			this.putContent(content, { select: true, preserveIds: true, preservePosition: true })

			// Force the new page's camera to be at the same zoom level as the
			// "from" page's camera, then center the "to" page's camera on the
			// pasted shapes
			const {
				center: { x, y },
			} = this.selectionBounds!
			this.setCamera(this.camera.x, this.camera.y, fromPageZ)
			this.centerOnPoint(x, y)
		})

		return this
	}

	/**
	 * Toggle the lock state of one or more shapes. If there is a mix of locked and unlocked shapes, all shapes will be locked.
	 *
	 * @param ids - The ids of the shapes to toggle. Defaults to selected shapes.
	 *
	 * @public
	 */
	toggleLock(ids: TLShapeId[] = this.selectedIds): this {
		if (this.instanceState.isReadonly || ids.length === 0) return this

		let allLocked = true,
			allUnlocked = true
		const shapes: TLShape[] = []
		for (const id of ids) {
			const shape = this.getShape(id)
			if (shape) {
				shapes.push(shape)
				if (shape.isLocked) {
					allUnlocked = false
				} else {
					allLocked = false
				}
			}
		}
		if (allUnlocked) {
			this.updateShapes(shapes.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true })))
			this.setSelectedIds([])
		} else if (allLocked) {
			this.updateShapes(
				shapes.map((shape) => ({ id: shape.id, type: shape.type, isLocked: false }))
			)
		} else {
			this.updateShapes(shapes.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true })))
		}

		return this
	}

	/**
	 * Send shapes to the back of the page's object list.
	 *
	 * @example
	 * ```ts
	 * editor.sendToBack(['id1', 'id2'])
	 * editor.sendToBack(box1, box2)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 *
	 * @public
	 */
	sendToBack(shapes: TLShape[]): this
	sendToBack(ids: TLShapeId[]): this
	sendToBack(ids: TLShapeId[] | TLShape[]): this {
		if (typeof ids[0] !== 'string') ids = (ids as TLShape[]).map((s) => s.id)
		const changes = getReorderingShapesChanges(this, 'toBack', ids as TLShapeId[])
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Send shapes backward in the page's object list.
	 *
	 * @example
	 * ```ts
	 * editor.sendBackward(['id1', 'id2'])
	 * editor.sendBackward([box1, box2])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 *
	 * @public
	 */
	sendBackward(shapes: TLShape[]): this
	sendBackward(ids: TLShapeId[]): this
	sendBackward(ids: TLShapeId[] | TLShape[]): this {
		if (typeof ids[0] !== 'string') ids = (ids as TLShape[]).map((s) => s.id)
		const changes = getReorderingShapesChanges(this, 'backward', ids as TLShapeId[])
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Bring shapes forward in the page's object list.
	 *
	 * @example
	 * ```ts
	 * editor.bringForward(['id1', 'id2'])
	 * editor.bringForward(box1,  box2)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 *
	 * @public
	 */
	bringForward(shapes: TLShape[]): this
	bringForward(ids: TLShapeId[]): this
	bringForward(ids: TLShapeId[] | TLShape[]): this {
		if (typeof ids[0] !== 'string') ids = (ids as TLShape[]).map((s) => s.id)
		const changes = getReorderingShapesChanges(this, 'forward', ids as TLShapeId[])
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Bring shapes to the front of the page's object list.
	 *
	 * @example
	 * ```ts
	 * editor.bringToFront(['id1', 'id2'])
	 * editor.bringToFront([box1, box2])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 *
	 * @public
	 */
	bringToFront(shapes: TLShape[]): this
	bringToFront(ids: TLShapeId[]): this
	bringToFront(ids: TLShapeId[] | TLShape[]): this {
		if (typeof ids[0] !== 'string') ids = (ids as TLShape[]).map((s) => s.id)
		const changes = getReorderingShapesChanges(this, 'toFront', ids as TLShapeId[])
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Flip shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.flipShapes('horizontal')
	 * editor.flipShapes('horizontal', ['box1', 'box2'])
	 * ```
	 *
	 * @param operation - Whether to flip horizontally or vertically.
	 * @param ids - The ids of the shapes to flip. Defaults to selected shapes.
	 *
	 * @public
	 */
	flipShapes(operation: 'horizontal' | 'vertical', ids: TLShapeId[] = this.selectedIds) {
		if (this.instanceState.isReadonly) return this

		let shapes = compact(ids.map((id) => this.getShape(id)))

		if (!shapes.length) return this

		shapes = compact(
			shapes
				.map((shape) => {
					if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
						return this.getSortedChildIds(shape.id).map((id) => this.getShape(id))
					}

					return shape
				})
				.flat()
		)

		const scaleOriginPage = Box2d.Common(compact(shapes.map((id) => this.getPageBounds(id)))).center

		this.batch(() => {
			for (const shape of shapes) {
				const bounds = this.getGeometry(shape).bounds
				const initialPageTransform = this.getPageTransform(shape.id)
				if (!initialPageTransform) continue
				this.resizeShape(
					shape.id,
					{ x: operation === 'horizontal' ? -1 : 1, y: operation === 'vertical' ? -1 : 1 },
					{
						initialBounds: bounds,
						initialPageTransform,
						initialShape: shape,
						mode: 'scale_shape',
						scaleOrigin: scaleOriginPage,
						scaleAxisRotation: 0,
					}
				)
			}
		})

		return this
	}

	/**
	 * Stack shape.
	 *
	 * @example
	 * ```ts
	 * editor.stackShapes('horizontal')
	 * editor.stackShapes('horizontal', ['box1', 'box2'])
	 * editor.stackShapes('horizontal', ['box1', 'box2'], 20)
	 * ```
	 *
	 * @param operation - Whether to stack horizontally or vertically.
	 * @param ids - The ids of the shapes to stack. Defaults to selected shapes.
	 * @param gap - A specific gap to use when stacking.
	 *
	 * @public
	 */
	stackShapes(ids: TLShapeId[], operation: 'horizontal' | 'vertical', gap?: number): this
	stackShapes(shapes: TLShape[], operation: 'horizontal' | 'vertical', gap?: number): this
	stackShapes(_ids: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical', gap?: number) {
		const ids =
			typeof _ids[0] === 'string' ? (_ids as TLShapeId[]) : (_ids as TLShape[]).map((s) => s.id)
		if (this.instanceState.isReadonly) return this

		const shapes = compact(ids.map((id) => this.getShape(id))).filter((shape) => {
			if (!shape) return false

			if (this.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
				if (shape.props.start.type === 'binding' || shape.props.end.type === 'binding') {
					return false
				}
			}

			return true
		})

		const len = shapes.length

		if ((gap === undefined && len < 3) || len < 2) return this

		const pageBounds = Object.fromEntries(
			shapes.map((shape) => [shape.id, this.getPageBounds(shape)!])
		)

		let val: 'x' | 'y'
		let min: 'minX' | 'minY'
		let max: 'maxX' | 'maxY'
		let dim: 'width' | 'height'

		if (operation === 'horizontal') {
			val = 'x'
			min = 'minX'
			max = 'maxX'
			dim = 'width'
		} else {
			val = 'y'
			min = 'minY'
			max = 'maxY'
			dim = 'height'
		}

		let shapeGap: number

		if (gap === undefined) {
			const gaps: { gap: number; count: number }[] = []

			shapes.sort((a, b) => pageBounds[a.id][min] - pageBounds[b.id][min])

			// Collect all of the gaps between shapes. We want to find
			// patterns (equal gaps between shapes) and use the most common
			// one as the gap for all of the shapes.
			for (let i = 0; i < len - 1; i++) {
				const shape = shapes[i]
				const nextShape = shapes[i + 1]

				const bounds = pageBounds[shape.id]
				const nextBounds = pageBounds[nextShape.id]

				const gap = nextBounds[min] - bounds[max]

				const current = gaps.find((g) => g.gap === gap)

				if (current) {
					current.count++
				} else {
					gaps.push({ gap, count: 1 })
				}
			}

			// Which gap is the most common?
			let maxCount = 0
			gaps.forEach((g) => {
				if (g.count > maxCount) {
					maxCount = g.count
					shapeGap = g.gap
				}
			})

			// If there is no most-common gap, use the average gap.
			if (maxCount === 1) {
				shapeGap = Math.max(0, gaps.reduce((a, c) => a + c.gap * c.count, 0) / (len - 1))
			}
		} else {
			// If a gap was provided, then use that instead.
			shapeGap = gap
		}

		const changes: TLShapePartial[] = []

		let v = pageBounds[shapes[0].id][max]

		shapes.forEach((shape, i) => {
			if (i === 0) return

			const delta = { x: 0, y: 0 }
			delta[val] = v + shapeGap - pageBounds[shape.id][val]

			const parent = this.getParentShape(shape)
			const localDelta = parent
				? Vec2d.Rot(delta, -this.getPageTransform(parent)!.decompose().rotation)
				: delta

			const translateStartChanges = this.getShapeUtil(shape).onTranslateStart?.(shape)

			changes.push(
				translateStartChanges
					? {
							...translateStartChanges,
							[val]: shape[val] + localDelta[val],
					  }
					: {
							id: shape.id as any,
							type: shape.type,
							[val]: shape[val] + localDelta[val],
					  }
			)

			v += pageBounds[shape.id][dim] + shapeGap
		})

		this.updateShapes(changes)
		return this
	}

	/**
	 * Pack shapes into a grid centered on their current position. Based on potpack
	 * (https://github.com/mapbox/potpack)
	 * @param ids - The ids of the shapes to pack. Defaults to selected shapes.
	 * @param padding - The padding to apply to the packed shapes.
	 */
	packShapes(ids: TLShapeId[] = this.currentPageState.selectedIds, padding = 16) {
		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapes = compact(
			ids
				.map((id) => this.getShape(id))
				.filter((shape) => {
					if (!shape) return false

					if (this.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
						if (shape.props.start.type === 'binding' || shape.props.end.type === 'binding') {
							return false
						}
					}

					return true
				})
		)
		const shapePageBounds: Record<string, Box2d> = {}
		const nextShapePageBounds: Record<string, Box2d> = {}

		let shape: TLShape,
			bounds: Box2d,
			area = 0

		for (let i = 0; i < shapes.length; i++) {
			shape = shapes[i]
			bounds = this.getPageBounds(shape)!
			shapePageBounds[shape.id] = bounds
			nextShapePageBounds[shape.id] = bounds.clone()
			area += bounds.width * bounds.height
		}

		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		const maxWidth = commonBounds.width

		// sort the shapes by height, descending
		shapes.sort((a, b) => shapePageBounds[b.id].height - shapePageBounds[a.id].height)

		// Start with is (sort of) the square of the area
		const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)

		// first shape fills the width and is infinitely tall
		const spaces: Box2d[] = [new Box2d(commonBounds.x, commonBounds.y, startWidth, Infinity)]

		let width = 0
		let height = 0
		let space: Box2d
		let last: Box2d

		for (let i = 0; i < shapes.length; i++) {
			shape = shapes[i]
			bounds = nextShapePageBounds[shape.id]

			// starting at the back (smaller shapes)
			for (let i = spaces.length - 1; i >= 0; i--) {
				space = spaces[i]

				// find a space that is big enough to contain the shape
				if (bounds.width > space.width || bounds.height > space.height) continue

				// add the shape to its top-left corner
				bounds.x = space.x
				bounds.y = space.y

				height = Math.max(height, bounds.maxY)
				width = Math.max(width, bounds.maxX)

				if (bounds.width === space.width && bounds.height === space.height) {
					// remove the space on a perfect fit
					last = spaces.pop()!
					if (i < spaces.length) spaces[i] = last
				} else if (bounds.height === space.height) {
					// fit the shape into the space (width)
					space.x += bounds.width + padding
					space.width -= bounds.width + padding
				} else if (bounds.width === space.width) {
					// fit the shape into the space (height)
					space.y += bounds.height + padding
					space.height -= bounds.height + padding
				} else {
					// split the space into two spaces
					spaces.push(
						new Box2d(
							space.x + (bounds.width + padding),
							space.y,
							space.width - (bounds.width + padding),
							bounds.height
						)
					)
					space.y += bounds.height + padding
					space.height -= bounds.height + padding
				}
				break
			}
		}

		const commonAfter = Box2d.Common(Object.values(nextShapePageBounds))
		const centerDelta = Vec2d.Sub(commonBounds.center, commonAfter.center)

		let nextBounds: Box2d

		const changes: TLShapePartial<any>[] = []

		for (let i = 0; i < shapes.length; i++) {
			shape = shapes[i]
			bounds = shapePageBounds[shape.id]
			nextBounds = nextShapePageBounds[shape.id]

			const delta = this.getDeltaInParentSpace(
				shape,
				Vec2d.Sub(nextBounds.point, bounds.point).add(centerDelta)
			)

			const change: TLShapePartial = {
				id: shape.id,
				type: shape.type,
				x: shape.x + delta.x,
				y: shape.y + delta.y,
			}

			const translateStartChange = this.getShapeUtil(shape).onTranslateStart?.({
				...shape,
				...change,
			})

			if (translateStartChange) {
				changes.push({ ...change, ...translateStartChange })
			} else {
				changes.push(change)
			}
		}

		if (changes.length) {
			this.updateShapes(changes)
		}

		return this
	}

	/**
	 * Align shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.alignShapes('left')
	 * editor.alignShapes('left', ['box1', 'box2'])
	 * ```
	 *
	 * @param operation - The align operation to apply.
	 * @param ids - The ids of the shapes to align. Defaults to selected shapes.
	 *
	 * @public
	 */
	alignShapes(
		operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom',
		ids: TLShapeId[] = this.currentPageState.selectedIds
	) {
		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapes = compact(ids.map((id) => this.getShape(id)))
		const shapePageBounds = Object.fromEntries(
			shapes.map((shape) => [shape.id, this.getPageBounds(shape)])
		)
		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		const changes: TLShapePartial[] = []

		shapes.forEach((shape) => {
			const pageBounds = shapePageBounds[shape.id]
			if (!pageBounds) return

			const delta = { x: 0, y: 0 }

			switch (operation) {
				case 'top': {
					delta.y = commonBounds.minY - pageBounds.minY
					break
				}
				case 'center-vertical': {
					delta.y = commonBounds.midY - pageBounds.minY - pageBounds.height / 2
					break
				}
				case 'bottom': {
					delta.y = commonBounds.maxY - pageBounds.minY - pageBounds.height
					break
				}
				case 'left': {
					delta.x = commonBounds.minX - pageBounds.minX
					break
				}
				case 'center-horizontal': {
					delta.x = commonBounds.midX - pageBounds.minX - pageBounds.width / 2
					break
				}
				case 'right': {
					delta.x = commonBounds.maxX - pageBounds.minX - pageBounds.width
					break
				}
			}

			const parent = this.getParentShape(shape)
			const localDelta = parent
				? Vec2d.Rot(delta, -this.getPageTransform(parent)!.decompose().rotation)
				: delta

			const translateChanges = this.getShapeUtil(shape).onTranslateStart?.(shape)

			changes.push(
				translateChanges
					? {
							...translateChanges,
							x: shape.x + localDelta.x,
							y: shape.y + localDelta.y,
					  }
					: {
							id: shape.id,
							type: shape.type,
							x: shape.x + localDelta.x,
							y: shape.y + localDelta.y,
					  }
			)
		})

		this.updateShapes(changes)
		return this
	}

	/**
	 * Distribute shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.distributeShapes('left')
	 * editor.distributeShapes('left', ['box1', 'box2'])
	 * ```
	 *
	 * @param operation - Whether to distribute shapes horizontally or vertically.
	 * @param ids - The ids of the shapes to distribute. Defaults to selected shapes.
	 *
	 * @public
	 */
	distributeShapes(
		operation: 'horizontal' | 'vertical',
		ids: TLShapeId[] = this.currentPageState.selectedIds
	) {
		if (this.instanceState.isReadonly) return this
		if (ids.length < 3) return this

		const len = ids.length
		const shapes = compact(ids.map((id) => this.getShape(id)))
		const pageBounds = Object.fromEntries(
			shapes.map((shape) => [shape.id, this.getPageBounds(shape)!])
		)

		let val: 'x' | 'y'
		let min: 'minX' | 'minY'
		let max: 'maxX' | 'maxY'
		let mid: 'midX' | 'midY'
		let dim: 'width' | 'height'

		if (operation === 'horizontal') {
			val = 'x'
			min = 'minX'
			max = 'maxX'
			mid = 'midX'
			dim = 'width'
		} else {
			val = 'y'
			min = 'minY'
			max = 'maxY'
			mid = 'midY'
			dim = 'height'
		}
		const changes: TLShapePartial[] = []

		// Clustered
		const first = shapes.sort((a, b) => pageBounds[a.id][min] - pageBounds[b.id][min])[0]
		const last = shapes.sort((a, b) => pageBounds[b.id][max] - pageBounds[a.id][max])[0]

		const midFirst = pageBounds[first.id][mid]
		const step = (pageBounds[last.id][mid] - midFirst) / (len - 1)
		const v = midFirst + step

		shapes
			.filter((shape) => shape !== first && shape !== last)
			.sort((a, b) => pageBounds[a.id][mid] - pageBounds[b.id][mid])
			.forEach((shape, i) => {
				const delta = { x: 0, y: 0 }
				delta[val] = v + step * i - pageBounds[shape.id][dim] / 2 - pageBounds[shape.id][val]

				const parent = this.getParentShape(shape)
				const localDelta = parent
					? Vec2d.Rot(delta, -this.getPageTransform(parent)!.rotation())
					: delta
				const translateStartChanges = this.getShapeUtil(shape).onTranslateStart?.(shape)

				changes.push(
					translateStartChanges
						? {
								...translateStartChanges,
								[val]: shape[val] + localDelta[val],
						  }
						: {
								id: shape.id,
								type: shape.type,
								[val]: shape[val] + localDelta[val],
						  }
				)
			})

		this.updateShapes(changes)
		return this
	}

	/**
	 * Stretch shape sizes and positions to fill their common bounding box.
	 *
	 * @example
	 * ```ts
	 * editor.stretchShapes('horizontal')
	 * editor.stretchShapes('horizontal', ['box1', 'box2'])
	 * ```
	 *
	 * @param operation - Whether to stretch shapes horizontally or vertically.
	 * @param ids - The ids of the shapes to stretch. Defaults to selected shapes.
	 *
	 * @public
	 */
	stretchShapes(
		operation: 'horizontal' | 'vertical',
		ids: TLShapeId[] = this.currentPageState.selectedIds
	) {
		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapes = compact(ids.map((id) => this.getShape(id)))
		const shapeBounds = Object.fromEntries(ids.map((id) => [id, this.getGeometry(id).bounds]))
		const shapePageBounds = Object.fromEntries(ids.map((id) => [id, this.getPageBounds(id)!]))
		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		const changes: TLShapePartial[] = []

		switch (operation) {
			case 'vertical': {
				this.batch(() => {
					for (const shape of shapes) {
						const pageRotation = this.getPageTransform(shape)!.rotation()
						if (pageRotation % PI2) continue
						const bounds = shapeBounds[shape.id]
						const pageBounds = shapePageBounds[shape.id]
						const localOffset = this.getDeltaInParentSpace(
							shape,
							new Vec2d(0, commonBounds.minY - pageBounds.minY)
						)
						const { x, y } = Vec2d.Add(localOffset, shape)
						this.updateShapes([{ id: shape.id, type: shape.type, x, y }], true)
						const scale = new Vec2d(1, commonBounds.height / pageBounds.height)
						this.resizeShape(shape.id, scale, {
							initialBounds: bounds,
							scaleOrigin: new Vec2d(pageBounds.center.x, commonBounds.minY),
							scaleAxisRotation: 0,
						})
					}
				})
				break
			}
			case 'horizontal': {
				this.batch(() => {
					for (const shape of shapes) {
						const bounds = shapeBounds[shape.id]
						const pageBounds = shapePageBounds[shape.id]
						const pageRotation = this.getPageTransform(shape)!.rotation()
						if (pageRotation % PI2) continue
						const localOffset = this.getDeltaInParentSpace(
							shape,
							new Vec2d(commonBounds.minX - pageBounds.minX, 0)
						)
						const { x, y } = Vec2d.Add(localOffset, shape)
						this.updateShapes([{ id: shape.id, type: shape.type, x, y }], true)
						const scale = new Vec2d(commonBounds.width / pageBounds.width, 1)
						this.resizeShape(shape.id, scale, {
							initialBounds: bounds,
							scaleOrigin: new Vec2d(commonBounds.minX, pageBounds.center.y),
							scaleAxisRotation: 0,
						})
					}
				})

				break
			}
		}

		this.updateShapes(changes)
		return this
	}

	/**
	 * Resize a shape.
	 *
	 * @param id - The id of the shape to resize.
	 * @param scale - The scale factor to apply to the shape.
	 * @param options - Additional options.
	 *
	 * @public
	 */
	resizeShape(
		id: TLShapeId,
		scale: VecLike,
		options: {
			initialBounds?: Box2d
			scaleOrigin?: VecLike
			scaleAxisRotation?: number
			initialShape?: TLShape
			initialPageTransform?: MatLike
			dragHandle?: TLResizeHandle
			mode?: TLResizeMode
		} = {}
	) {
		if (this.instanceState.isReadonly) return this

		if (!Number.isFinite(scale.x)) scale = new Vec2d(1, scale.y)
		if (!Number.isFinite(scale.y)) scale = new Vec2d(scale.x, 1)

		const initialShape = options.initialShape ?? this.getShape(id)
		if (!initialShape) return this

		const scaleOrigin = options.scaleOrigin ?? this.getPageBounds(id)?.center
		if (!scaleOrigin) return this

		const pageTransform = options.initialPageTransform
			? Matrix2d.Cast(options.initialPageTransform)
			: this.getPageTransform(id)
		if (!pageTransform) return this

		const pageRotation = pageTransform.rotation()

		if (pageRotation == null) return this

		const scaleAxisRotation = options.scaleAxisRotation ?? pageRotation

		const initialBounds = options.initialBounds ?? this.getGeometry(id).bounds

		if (!initialBounds) return this

		if (!areAnglesCompatible(pageRotation, scaleAxisRotation)) {
			// shape is awkwardly rotated, keep the aspect ratio locked and adopt the scale factor
			// from whichever axis is being scaled the least, to avoid the shape getting bigger
			// than the bounds of the selection
			// const minScale = Math.min(Math.abs(scale.x), Math.abs(scale.y))
			return this._resizeUnalignedShape(id, scale, {
				...options,
				initialBounds,
				scaleOrigin,
				scaleAxisRotation,
				initialPageTransform: pageTransform,
				initialShape,
			})
		}

		const util = this.getShapeUtil(initialShape)

		if (util.isAspectRatioLocked(initialShape)) {
			if (Math.abs(scale.x) > Math.abs(scale.y)) {
				scale = new Vec2d(scale.x, Math.sign(scale.y) * Math.abs(scale.x))
			} else {
				scale = new Vec2d(Math.sign(scale.x) * Math.abs(scale.y), scale.y)
			}
		}

		if (util.onResize && util.canResize(initialShape)) {
			// get the model changes from the shape util
			const newPagePoint = this._scalePagePoint(
				Matrix2d.applyToPoint(pageTransform, new Vec2d(0, 0)),
				scaleOrigin,
				scale,
				scaleAxisRotation
			)

			const newLocalPoint = this.getPointInParentSpace(initialShape.id, newPagePoint)

			// resize the shape's local bounding box
			const myScale = new Vec2d(scale.x, scale.y)
			// the shape is aligned with the rest of the shapes in the selection, but may be
			// 90deg offset from the main rotation of the selection, in which case
			// we need to flip the width and height scale factors
			const areWidthAndHeightAlignedWithCorrectAxis = approximately(
				(pageRotation - scaleAxisRotation) % Math.PI,
				0
			)
			myScale.x = areWidthAndHeightAlignedWithCorrectAxis ? scale.x : scale.y
			myScale.y = areWidthAndHeightAlignedWithCorrectAxis ? scale.y : scale.x

			// adjust initial model for situations where the parent has moved during the resize
			// e.g. groups
			const initialPagePoint = Matrix2d.applyToPoint(pageTransform, new Vec2d())

			// need to adjust the shape's x and y points in case the parent has moved since start of resizing
			const { x, y } = this.getPointInParentSpace(initialShape.id, initialPagePoint)

			this.updateShapes(
				[
					{
						id,
						type: initialShape.type as any,
						x: newLocalPoint.x,
						y: newLocalPoint.y,
						...util.onResize(
							{ ...initialShape, x, y },
							{
								newPoint: newLocalPoint,
								handle: options.dragHandle ?? 'bottom_right',
								// don't set isSingle to true for children
								mode: options.mode ?? 'scale_shape',
								scaleX: myScale.x,
								scaleY: myScale.y,
								initialBounds,
								initialShape,
							}
						),
					},
				],
				true
			)
		} else {
			const initialPageCenter = Matrix2d.applyToPoint(pageTransform, initialBounds.center)
			// get the model changes from the shape util
			const newPageCenter = this._scalePagePoint(
				initialPageCenter,
				scaleOrigin,
				scale,
				scaleAxisRotation
			)

			const initialPageCenterInParentSpace = this.getPointInParentSpace(
				initialShape.id,
				initialPageCenter
			)
			const newPageCenterInParentSpace = this.getPointInParentSpace(initialShape.id, newPageCenter)

			const delta = Vec2d.Sub(newPageCenterInParentSpace, initialPageCenterInParentSpace)
			// apply the changes to the model
			this.updateShapes(
				[
					{
						id,
						type: initialShape.type as any,
						x: initialShape.x + delta.x,
						y: initialShape.y + delta.y,
					},
				],
				true
			)
		}

		return this
	}

	/** @internal */
	private _resizeUnalignedShape(
		id: TLShapeId,
		scale: VecLike,
		options: {
			initialBounds: Box2d
			scaleOrigin: VecLike
			scaleAxisRotation: number
			initialShape: TLShape
			initialPageTransform: MatLike
		}
	) {
		const { type } = options.initialShape
		// If a shape is not aligned with the scale axis we need to treat it differently to avoid skewing.
		// Instead of skewing we normalize the scale aspect ratio (i.e. keep the same scale magnitude in both axes)
		// and then after applying the scale to the shape we also rotate it if required and translate it so that it's center
		// point ends up in the right place.

		const shapeScale = new Vec2d(scale.x, scale.y)

		// // make sure we are constraining aspect ratio, and using the smallest scale axis to avoid shapes getting bigger
		// // than the selection bounding box
		if (Math.abs(scale.x) > Math.abs(scale.y)) {
			shapeScale.x = Math.sign(scale.x) * Math.abs(scale.y)
		} else {
			shapeScale.y = Math.sign(scale.y) * Math.abs(scale.x)
		}

		// first we can scale the shape about its center point
		this.resizeShape(id, shapeScale, {
			initialShape: options.initialShape,
			initialBounds: options.initialBounds,
		})

		// then if the shape is flipped in one axis only, we need to apply an extra rotation
		// to make sure the shape is mirrored correctly
		if (Math.sign(scale.x) * Math.sign(scale.y) < 0) {
			let { rotation } = Matrix2d.Decompose(options.initialPageTransform)
			rotation -= 2 * rotation
			this.updateShapes([{ id, type, rotation }], true)
		}

		// Next we need to translate the shape so that it's center point ends up in the right place.
		// To do that we first need to calculate the center point of the shape in page space before the scale was applied.
		const preScaleShapePageCenter = Matrix2d.applyToPoint(
			options.initialPageTransform,
			options.initialBounds.center
		)

		// And now we scale the center point by the original scale factor
		const postScaleShapePageCenter = this._scalePagePoint(
			preScaleShapePageCenter,
			options.scaleOrigin,
			scale,
			options.scaleAxisRotation
		)

		// now calculate how far away the shape is from where it needs to be
		const pageBounds = this.getPageBounds(id)!
		const pageTransform = this.getPageTransform(id)!
		const currentPageCenter = pageBounds.center
		const shapePageTransformOrigin = pageTransform.point()
		if (!currentPageCenter || !shapePageTransformOrigin) return this
		const pageDelta = Vec2d.Sub(postScaleShapePageCenter, currentPageCenter)

		// and finally figure out what the shape's new position should be
		const postScaleShapePagePoint = Vec2d.Add(shapePageTransformOrigin, pageDelta)
		const { x, y } = this.getPointInParentSpace(id, postScaleShapePagePoint)

		this.updateShapes([{ id, type, x, y }], true)

		return this
	}

	/** @internal */
	private _scalePagePoint(
		point: VecLike,
		scaleOrigin: VecLike,
		scale: VecLike,
		scaleAxisRotation: number
	) {
		const relativePoint = Vec2d.RotWith(point, scaleOrigin, -scaleAxisRotation).sub(scaleOrigin)

		// calculate the new point position relative to the scale origin
		const newRelativePagePoint = Vec2d.MulV(relativePoint, scale)

		// and rotate it back to page coords to get the new page point of the resized shape
		const destination = Vec2d.Add(newRelativePagePoint, scaleOrigin).rotWith(
			scaleOrigin,
			scaleAxisRotation
		)

		return destination
	}

	/**
	 * Get the initial meta value for a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getInitialMetaForShape = (shape) => {
	 *   if (shape.type === 'note') {
	 *     return { createdBy: myCurrentUser.id }
	 *   }
	 * }
	 * ```
	 *
	 * @param shape - The shape to get the initial meta for.
	 *
	 * @public
	 */
	getInitialMetaForShape(_shape: TLShape): JsonObject {
		return {}
	}

	/**
	 * Create a single shape.
	 *
	 * @example
	 * ```ts
	 * editor.createShape({ id: 'box1', type: 'text', props: { text: "ok" } })
	 * ```
	 *
	 * @param partials - The shape partials to create.
	 * @param select - Whether to select the created shapes. Defaults to false.
	 *
	 * @public
	 */
	createShape<T extends TLUnknownShape>(partial: TLShapePartial<T>, select = false) {
		this._createShapes([partial], select)
		return this
	}

	/**
	 * Create shapes.
	 *
	 * @example
	 * ```ts
	 * editor.createShapes([{ id: 'box1', type: 'text', props: { text: "ok" } }])
	 * ```
	 *
	 * @param partials - The shape partials to create.
	 * @param select - Whether to select the created shapes. Defaults to false.
	 *
	 * @public
	 */
	createShapes<T extends TLUnknownShape>(partials: TLShapePartial<T>[], select = false) {
		if (!Array.isArray(partials)) {
			throw Error('Editor.createShapes: must provide an array of shapes or shape partials')
		}
		this._createShapes(partials, select)
		return this
	}

	/** @internal */
	private _createShapes = this.history.createCommand(
		'createShapes',
		(partials: TLShapePartial[], select = false) => {
			if (this.instanceState.isReadonly) return null
			if (partials.length <= 0) return null

			const { currentPageShapeIds: shapeIds } = this

			const maxShapesReached = partials.length + shapeIds.size > MAX_SHAPES_PER_PAGE

			if (maxShapesReached) {
				// can't create more shapes than fit on the page
				alertMaxShapes(this)
				return
			}

			if (partials.length === 0) return null

			const prevSelectedIds = select ? this.selectedIds : undefined

			return {
				data: {
					currentPageId: this.currentPageId,
					createdIds: partials.map((p) => p.id),
					prevSelectedIds,
					partials,
					select,
				},
			}
		},
		{
			do: ({ createdIds, partials, select }) => {
				const { focusLayerId } = this

				// 1. Parents

				// Make sure that each partial will become the child of either the
				// page or another shape that exists (or that will exist) in this page.

				const { sortedShapesArray } = this
				partials = partials.map((partial) => {
					// If the partial does not provide the parentId OR if the provided
					// parentId is NOT in the store AND NOT among the other shapes being
					// created, then we need to find a parent for the shape. This can be
					// another shape that exists under that point and which can receive
					// children of the creating shape's type, or else the page itself.
					if (
						!partial.parentId ||
						!(this.store.has(partial.parentId) || partials.some((p) => p.id === partial.parentId))
					) {
						partial = { ...partial }

						const parentId =
							sortedShapesArray.findLast(
								(parent) =>
									// parent.type === 'frame'
									this.getShapeUtil(parent).canReceiveNewChildrenOfType(parent, partial.type) &&
									this.isPointInShape(
										parent,
										// If no parent is provided, then we can treat the
										// shape's provided x/y as being in the page's space.
										{ x: partial.x ?? 0, y: partial.y ?? 0 },
										{
											margin: 0,
											hitInside: true,
										}
									)
							)?.id ?? this.focusLayerId

						partial.parentId = parentId

						// If the parent is a shape (rather than a page) then insert the
						// shapes into the shape's children. Adjust the point and page rotation to be
						// preserved relative to the parent.
						if (isShapeId(parentId)) {
							const point = this.getPointInShapeSpace(this.getShape(parentId)!, {
								x: partial.x ?? 0,
								y: partial.y ?? 0,
							})
							partial.x = point.x
							partial.y = point.y
							partial.rotation =
								-this.getPageTransform(parentId)!.rotation() + (partial.rotation ?? 0)
						}

						// a shape cannot be it's own parent. This was a rare issue with frames/groups in the syncFuzz tests.
						if (partial.parentId === partial.id) {
							partial.parentId = focusLayerId
						}
					}

					return partial
				})

				// 2. Indices

				// Get the highest index among the parents of each of the
				// the shapes being created; we'll increment from there.

				const parentIndices = new Map<string, string>()

				const shapeRecordsToCreate: TLShape[] = []

				for (const partial of partials) {
					const util = this.getShapeUtil(partial)

					// If an index is not explicitly provided, then add the
					// shapes to the top of their parents' children; using the
					// value in parentsMappedToIndex, get the index above, use it,
					// and set it back to parentsMappedToIndex for next time.
					let index = partial.index

					if (!index) {
						// Hello bug-seeker: have you just created a frame and then a shape
						// and found that the shape is automatically the child of the frame?
						// this is the reason why! It would be harder to have each shape specify
						// the frame as the parent when creating a shape inside of a frame, so
						// we do it here.
						const parentId = partial.parentId ?? focusLayerId

						if (!parentIndices.has(parentId)) {
							parentIndices.set(parentId, this.getHighestIndexForParent(parentId))
						}
						index = parentIndices.get(parentId)!
						parentIndices.set(parentId, getIndexAbove(index))
					}

					// The initial props starts as the shape utility's default props
					const initialProps = util.getDefaultProps()

					// We then look up each key in the tab state's styles; and if it's there,
					// we use the value from the tab state's styles instead of the default.
					for (const [style, propKey] of this.styleProps[partial.type]) {
						;(initialProps as any)[propKey] = this.getStyleForNextShape(style)
					}

					// When we create the shape, take in the partial (the props coming into the
					// function) and merge it with the default props.
					let shapeRecordToCreate = (
						this.store.schema.types.shape as RecordType<
							TLShape,
							'type' | 'props' | 'index' | 'parentId'
						>
					).create({
						...partial,
						index,
						opacity: partial.opacity ?? this.instanceState.opacityForNextShape,
						parentId: partial.parentId ?? focusLayerId,
						props: 'props' in partial ? { ...initialProps, ...partial.props } : initialProps,
					})

					if (shapeRecordToCreate.index === undefined) {
						throw Error('no index!')
					}

					const next = this.getShapeUtil(shapeRecordToCreate).onBeforeCreate?.(shapeRecordToCreate)

					if (next) {
						shapeRecordToCreate = next
					}

					shapeRecordsToCreate.push(shapeRecordToCreate)
				}

				// Add meta properties, if any, to the shapes
				shapeRecordsToCreate.forEach((shape) => {
					shape.meta = {
						...this.getInitialMetaForShape(shape),
						...shape.meta,
					}
				})

				this.store.put(shapeRecordsToCreate)

				// If we're also selecting the newly created shapes, attempt to select all of them;

				// the engine will filter out any shapes that are descendants of other new shapes.
				if (select) {
					this.store.update(this.currentPageState.id, (state) => ({
						...state,
						selectedIds: createdIds,
					}))
				}
			},
			undo: ({ createdIds, prevSelectedIds }) => {
				this.store.remove(createdIds)

				if (prevSelectedIds) {
					this.store.update(this.currentPageState.id, (state) => ({
						...state,
						selectedIds: prevSelectedIds,
					}))
				}
			},
		}
	)

	private animatingShapes = new Map<TLShapeId, string>()

	/**
	 * Animate a shape.
	 *
	 * @example
	 * ```ts
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 })
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 }, { duration: 100, ease: t => t*t })
	 * ```
	 *
	 * @param partial - The shape partial to update.
	 * @param options - (optional) The animation's options.
	 *
	 * @public
	 */
	animateShape(
		partial: TLShapePartial | null | undefined,
		options?: Partial<{
			/** The animation's duration in milliseconds. */
			duration: number
			/** The animation's easing function. */
			ease: (t: number) => number
		}>
	) {
		return this.animateShapes([partial], options)
	}

	/**
	 * Animate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }])
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }], { duration: 100, ease: t => t*t })
	 * ```
	 *
	 * @param partials - The shape partials to update.
	 * @param options - (optional) The animation's options.
	 *
	 * @public
	 */
	animateShapes(
		partials: (TLShapePartial | null | undefined)[],
		options: {
			/** The animation's duration in milliseconds. */
			duration?: number
			/** The animation's easing function. */
			ease?: (t: number) => number
		} = {}
	) {
		const { duration = 500, ease = EASINGS.linear } = options

		const animationId = uniqueId()

		let remaining = duration
		let t: number

		type FromTo = { prop: string; from: number; to: number }
		type ShapeAnimation = { partial: TLShapePartial; values: FromTo[] }

		const animations: ShapeAnimation[] = []

		partials.forEach((partial) => {
			if (!partial) return

			const result: ShapeAnimation = {
				partial,
				values: [],
			}

			const shape = this.getShape(partial.id)!

			if (!shape) return

			for (const key of ['x', 'y', 'rotation'] as const) {
				if (partial[key] !== undefined && shape[key] !== partial[key]) {
					result.values.push({ prop: key, from: shape[key], to: partial[key] as number })
				}
			}

			animations.push(result)
			this.animatingShapes.set(shape.id, animationId)
		})

		let value: ShapeAnimation

		const handleTick = (elapsed: number) => {
			remaining -= elapsed

			if (remaining < 0) {
				const { animatingShapes } = this
				const partialsToUpdate = partials.filter(
					(p) => p && animatingShapes.get(p.id) === animationId
				)
				if (partialsToUpdate.length) {
					this.updateShapes(partialsToUpdate, false)
					// update shapes also removes the shape from animating shapes
				}

				this.removeListener('tick', handleTick)
				return
			}

			t = ease(1 - remaining / duration)

			const { animatingShapes } = this

			try {
				const tPartials: TLShapePartial[] = []

				for (let i = 0; i < animations.length; i++) {
					value = animations[i]

					if (animatingShapes.get(value.partial.id) === animationId) {
						tPartials.push({
							id: value.partial.id,
							type: value.partial.type,
							...value.values.reduce((acc, { prop, from, to }) => {
								acc[prop] = from + (to - from) * t
								return acc
							}, {} as any),
						})
					}
				}

				this._updateShapes(tPartials, true)
			} catch (e) {
				// noop
			}
		}

		this.addListener('tick', handleTick)

		return this
	}

	/**
	 * Group some shapes together.
	 *
	 * @param ids - Ids of the shapes to group. Defaults to the selected shapes.
	 * @param groupId - Id of the group to create. Defaults to a new shape id.
	 *
	 * @public
	 */
	groupShapes(ids: TLShapeId[], groupId?: TLShapeId): this
	groupShapes(shapes: TLShape[], groupId?: TLShapeId): this
	groupShapes(_ids: TLShapeId[] | TLShape[], groupId = createShapeId()): this {
		if (!Array.isArray(_ids)) {
			throw Error('Editor.groupShapes: must provide an array of shapes or shape ids')
		}
		if (this.instanceState.isReadonly) return this

		if (_ids.length <= 1) return this

		const ids =
			typeof _ids[0] === 'string'
				? (_ids as TLShapeId[])
				: (_ids.map((s) => (s as TLShape).id) as TLShapeId[])

		const shapes = compact(this._getUnlockedShapeIds(ids).map((id) => this.getShape(id)))
		const sortedShapeIds = shapes.sort(sortByIndex).map((s) => s.id)
		const pageBounds = Box2d.Common(compact(shapes.map((id) => this.getPageBounds(id))))

		const { x, y } = pageBounds.point

		const parentId = this.findCommonAncestor(shapes) ?? this.currentPageId

		// Only group when the select tool is active
		if (this.currentToolId !== 'select') return this

		// If not already in idle, cancel the current interaction (get back to idle)
		if (!this.isIn('select.idle')) {
			this.cancel()
		}

		// Find all the shapes that have the same parentId, and use the highest index.
		const shapesWithRootParent = shapes
			.filter((shape) => shape.parentId === parentId)
			.sort(sortByIndex)

		const highestIndex = shapesWithRootParent[shapesWithRootParent.length - 1]?.index

		this.batch(() => {
			this.createShapes<TLGroupShape>([
				{
					id: groupId,
					type: 'group',
					parentId,
					index: highestIndex,
					x,
					y,
					opacity: 1,
					props: {},
				},
			])
			this.reparentShapes(sortedShapeIds, groupId)
			this.select(groupId)
		})

		return this
	}

	/**
	 * Ungroup some shapes.
	 *
	 * @param ids - Ids of the shapes to ungroup. Defaults to the selected shapes.
	 *
	 * @public
	 */
	ungroupShapes(ids: TLShapeId[]): this
	ungroupShapes(ids: TLShape[]): this
	ungroupShapes(_ids: TLShapeId[] | TLShape[]) {
		const ids =
			typeof _ids[0] === 'string' ? (_ids as TLShapeId[]) : (_ids as TLShape[]).map((s) => s.id)
		if (this.instanceState.isReadonly) return this
		if (ids.length === 0) return this

		// Only ungroup when the select tool is active
		if (this.currentToolId !== 'select') return this

		// If not already in idle, cancel the current interaction (get back to idle)
		if (!this.isIn('select.idle')) {
			this.cancel()
		}

		// The ids of the selected shapes after ungrouping;
		// these include all of the grouped shapes children,
		// plus any shapes that were selected apart from the groups.
		const idsToSelect = new Set<TLShapeId>()

		// Get all groups in the selection
		const shapes = compact(ids.map((id) => this.getShape(id)))

		const groups: TLGroupShape[] = []

		shapes.forEach((shape) => {
			if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
				groups.push(shape)
			} else {
				idsToSelect.add(shape.id)
			}
		})

		if (groups.length === 0) return this

		this.batch(() => {
			let group: TLGroupShape

			for (let i = 0, n = groups.length; i < n; i++) {
				group = groups[i]
				const childIds = this.getSortedChildIds(group.id)

				for (let j = 0, n = childIds.length; j < n; j++) {
					idsToSelect.add(childIds[j])
				}

				this.reparentShapes(childIds, group.parentId, group.index)
			}

			this.deleteShapes(groups.map((group) => group.id))
			this.select(...idsToSelect)
		})

		return this
	}

	/**
	 * Update a shape using a partial of the shape.
	 *
	 * @example
	 * ```ts
	 * editor.updateShape({ id: 'box1', type: 'geo', props: { w: 100, h: 100 } })
	 * ```
	 *
	 * @param partial - The shape partial to update.
	 * @param squashing - (optional) Whether the change is ephemeral.
	 *
	 * @public
	 */
	updateShape<T extends TLUnknownShape>(
		partial: TLShapePartial<T> | null | undefined,
		squashing = false
	) {
		this.updateShapes([partial], squashing)
		return this
	}

	/**
	 * Update shapes using partials of each shape.
	 *
	 * @example
	 * ```ts
	 * editor.updateShapes([{ id: 'box1', type: 'geo', props: { w: 100, h: 100 } }])
	 * ```
	 *
	 * @param partials - The shape partials to update.
	 * @param squashing - Whether the change is ephemeral.
	 *
	 * @public
	 */
	updateShapes<T extends TLUnknownShape>(
		partials: (TLShapePartial<T> | null | undefined)[],
		squashing = false
	) {
		let compactedPartials = compact(partials)
		if (this.animatingShapes.size > 0) {
			compactedPartials.forEach((p) => this.animatingShapes.delete(p.id))
		}

		compactedPartials = compactedPartials.filter((p) => {
			const shape = this.getShape(p.id)
			if (!shape) return false

			// Only allow changes to unlocked shapes or changes to the isLocked property (otherwise we cannot unlock a shape)
			if (this.isShapeOrAncestorLocked(shape) && !Object.hasOwn(p, 'isLocked')) return false
			return true
		})

		this._updateShapes(compactedPartials, squashing)
		return this
	}

	/** @internal */
	private _updateShapes = this.history.createCommand(
		'updateShapes',
		(_partials: (TLShapePartial | null | undefined)[], squashing = false) => {
			if (this.instanceState.isReadonly) return null

			const partials = compact(_partials)

			const snapshots = Object.fromEntries(
				compact(partials.map(({ id }) => this.getShape(id))).map((shape) => {
					return [shape.id, shape]
				})
			)

			if (partials.length <= 0) return null

			const updated = compact(
				partials.map((partial) => {
					const prev = snapshots[partial.id]
					if (!prev) return null
					let newRecord = null as null | TLShape
					for (const [k, v] of Object.entries(partial)) {
						if (v === undefined) continue
						switch (k) {
							case 'id':
							case 'type':
								continue
							default: {
								if (v !== (prev as any)[k]) {
									if (!newRecord) {
										newRecord = { ...prev }
									}

									if (k === 'props') {
										// props property
										const nextProps = { ...prev.props } as JsonObject
										for (const [propKey, propValue] of Object.entries(v as object)) {
											if (propValue !== undefined) {
												nextProps[propKey] = propValue
											}
										}
										newRecord!.props = nextProps
									} else if (k === 'meta') {
										// meta property
										const nextMeta = { ...prev.meta } as JsonObject
										for (const [metaKey, metaValue] of Object.entries(v as object)) {
											if (metaValue !== undefined) {
												nextMeta[metaKey] = metaValue
											}
										}
										newRecord!.meta = nextMeta
									} else {
										// base property
										;(newRecord as any)[k] = v
									}
								}
							}
						}
					}

					return newRecord ?? prev
				})
			)

			const updates = Object.fromEntries(updated.map((shape) => [shape.id, shape]))

			return { data: { snapshots, updates }, squashing }
		},
		{
			do: ({ updates }) => {
				// Iterate through array; if any shape has an onUpdate handler, call it
				// and, if the handler returns a new shape, replace the old shape with
				// the new one. This is used for example when repositioning a text shape
				// based on its new text content.
				const result = Object.values(updates)
				for (let i = 0; i < result.length; i++) {
					const shape = result[i]
					const current = this.store.get(shape.id)
					if (!current) continue
					const next = this.getShapeUtil(shape).onBeforeUpdate?.(current, shape)
					if (next) {
						result[i] = next
					}
				}
				this.store.put(result)
			},
			undo: ({ snapshots }) => {
				this.store.put(Object.values(snapshots))
			},
			squash(prevData, nextData) {
				return {
					// keep the oldest snapshots
					snapshots: { ...nextData.snapshots, ...prevData.snapshots },
					// keep the newest updates
					updates: { ...prevData.updates, ...nextData.updates },
				}
			},
		}
	)

	/** @internal */
	private _getUnlockedShapeIds(ids: TLShapeId[]): TLShapeId[] {
		return ids.filter((id) => !this.getShape(id)?.isLocked)
	}

	/**
	 * Delete shapes.
	 *
	 * @example
	 * ```ts
	 * editor.deleteShapes(['box1', 'box2'])
	 * ```
	 *
	 * @param ids - The ids of the shapes to delete.
	 *
	 * @public
	 */
	deleteShapes(ids: TLShapeId[]): this
	deleteShapes(shapes: TLShape[]): this
	deleteShapes(_ids: TLShapeId[] | TLShape[]) {
		if (!Array.isArray(_ids)) {
			throw Error('Editor.deleteShapes: must provide an array of shapes or shapeIds')
		}
		this._deleteShapes(
			this._getUnlockedShapeIds(
				typeof _ids[0] === 'string' ? (_ids as TLShapeId[]) : (_ids as TLShape[]).map((s) => s.id)
			)
		)
		return this
	}

	/**
	 * Delete a shape.
	 *
	 * @example
	 * ```ts
	 * editor.deleteShapes(['box1', 'box2'])
	 * ```
	 *
	 * @param id - The id of the shape to delete.
	 *
	 * @public
	 */
	deleteShape(id: TLShapeId): this
	deleteShape(shape: TLShape): this
	deleteShape(_id: TLShapeId | TLShape) {
		this.deleteShapes([typeof _id === 'string' ? _id : _id.id])
		return this
	}

	/** @internal */
	private _deleteShapes = this.history.createCommand(
		'delete_shapes',
		(ids: TLShapeId[]) => {
			if (this.instanceState.isReadonly) return null
			if (ids.length === 0) return null
			const prevSelectedIds = [...this.currentPageState.selectedIds]

			const allIds = new Set(ids)

			for (const id of ids) {
				this.visitDescendants(id, (childId) => {
					allIds.add(childId)
				})
			}

			const deletedIds = [...allIds]
			const arrowBindings = this._arrowBindingsIndex.value
			const snapshots = compact(
				deletedIds.flatMap((id) => {
					const shape = this.getShape(id)

					// Add any bound arrows to the snapshots, so that we can restore the bindings on undo
					const bindings = arrowBindings[id]
					if (bindings && bindings.length > 0) {
						return bindings.map(({ arrowId }) => this.getShape(arrowId)).concat(shape)
					}
					return shape
				})
			)

			const postSelectedIds = prevSelectedIds.filter((id) => !allIds.has(id))

			return { data: { deletedIds, snapshots, prevSelectedIds, postSelectedIds } }
		},
		{
			do: ({ deletedIds, postSelectedIds }) => {
				this.store.remove(deletedIds)
				this.store.update(this.currentPageState.id, (state) => ({
					...state,
					selectedIds: postSelectedIds,
				}))
			},
			undo: ({ snapshots, prevSelectedIds }) => {
				this.store.put(snapshots)
				this.store.update(this.currentPageState.id, (state) => ({
					...state,
					selectedIds: prevSelectedIds,
				}))
			},
		}
	)

	/* --------------------- Styles --------------------- */

	/**
	 * Get all the current styles among the users selected shapes
	 *
	 * @internal
	 */
	private _extractSharedStyles(shape: TLShape, sharedStyleMap: SharedStyleMap) {
		if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
			// For groups, ignore the styles of the group shape and instead include the styles of the
			// group's children. These are the shapes that would have their styles changed if the
			// user called `setStyle` on the current selection.
			const childIds = this._parentIdsToChildIds.value[shape.id]
			if (!childIds) return

			for (let i = 0, n = childIds.length; i < n; i++) {
				this._extractSharedStyles(this.getShape(childIds[i][0])!, sharedStyleMap)
			}
		} else {
			for (const [style, propKey] of this.styleProps[shape.type]) {
				sharedStyleMap.applyValue(style, getOwnProperty(shape.props, propKey))
			}
		}
	}

	/**
	 * A derived map containing all current styles among the user's selected shapes.
	 *
	 * @internal
	 */
	private _selectionSharedStyles = computed<ReadonlySharedStyleMap>(
		'_selectionSharedStyles',
		() => {
			const { selectedShapes } = this

			const sharedStyles = new SharedStyleMap()
			for (const selectedShape of selectedShapes) {
				this._extractSharedStyles(selectedShape, sharedStyles)
			}

			return sharedStyles
		}
	)

	/** @internal */
	getStyleForNextShape<T>(style: StyleProp<T>): T {
		const value = this.instanceState.stylesForNextShape[style.id]
		return value === undefined ? style.defaultValue : (value as T)
	}

	getShapeStyleIfExists<T>(shape: TLShape, style: StyleProp<T>): T | undefined {
		const styleKey = this.styleProps[shape.type].get(style)
		if (styleKey === undefined) return undefined
		return getOwnProperty(shape.props, styleKey) as T | undefined
	}

	/**
	 * A map of all the current styles either in the current selection, or that are relevant to the
	 * current tool.
	 *
	 * @example
	 * ```ts
	 * const color = editor.sharedStyles.get(DefaultColorStyle)
	 * if (color && color.type === 'shared') {
	 *   console.log('All selected shapes have the same color:', color.value)
	 * }
	 * ```
	 *
	 * @public
	 */
	@computed<ReadonlySharedStyleMap>({ isEqual: (a, b) => a.equals(b) })
	get sharedStyles(): ReadonlySharedStyleMap {
		// If we're in selecting and if we have a selection, return the shared styles from the
		// current selection
		if (this.isIn('select') && this.selectedIds.length > 0) {
			return this._selectionSharedStyles.value
		}

		// If the current tool is associated with a shape, return the styles for that shape.
		// Otherwise, just return an empty map.
		const currentTool = this.root.current.value!
		const styles = new SharedStyleMap()
		if (currentTool.shapeType) {
			for (const style of this.styleProps[currentTool.shapeType].keys()) {
				styles.applyValue(style, this.getStyleForNextShape(style))
			}
		}

		return styles
	}

	/**
	 * Get the currently selected shared opacity.
	 * If any shapes are selected, this returns the shared opacity of the selected shapes.
	 * Otherwise, this returns the chosen opacity for the next shape.
	 *
	 * @public
	 */
	@computed get sharedOpacity(): SharedStyle<number> {
		if (this.isIn('select') && this.selectedIds.length > 0) {
			const shapesToCheck: TLShape[] = []
			const addShape = (shapeId: TLShapeId) => {
				const shape = this.getShape(shapeId)
				if (!shape) return
				// For groups, ignore the opacity of the group shape and instead include
				// the opacity of the group's children. These are the shapes that would have
				// their opacity changed if the user called `setOpacity` on the current selection.
				if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
					for (const childId of this.getSortedChildIds(shape.id)) {
						addShape(childId)
					}
				} else {
					shapesToCheck.push(shape)
				}
			}
			for (const shapeId of this.selectedIds) {
				addShape(shapeId)
			}

			let opacity: number | null = null
			for (const shape of shapesToCheck) {
				if (opacity === null) {
					opacity = shape.opacity
				} else if (opacity !== shape.opacity) {
					return { type: 'mixed' }
				}
			}

			if (opacity !== null) return { type: 'shared', value: opacity }
		}
		return { type: 'shared', value: this.instanceState.opacityForNextShape }
	}

	/**
	 * Set the current opacity. This will effect any selected shapes, or the
	 * next-created shape.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacity(0.5)
	 * editor.setOpacity(0.5, true)
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 * @param ephemeral - Whether the opacity change is ephemeral. Ephemeral changes don't get added to the undo/redo stack. Defaults to false.
	 * @param squashing - Whether the opacity change will be squashed into the existing history entry rather than creating a new one. Defaults to false.
	 */
	setOpacity(opacity: number, ephemeral = false, squashing = false): this {
		this.history.batch(() => {
			if (this.isIn('select')) {
				const {
					currentPageState: { selectedIds },
				} = this

				const shapesToUpdate: TLShape[] = []

				// We can have many deep levels of grouped shape
				// Making a recursive function to look through all the levels
				const addShapeById = (id: TLShape['id']) => {
					const shape = this.getShape(id)
					if (!shape) return
					if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
						const childIds = this.getSortedChildIds(id)
						for (const childId of childIds) {
							addShapeById(childId)
						}
					} else {
						shapesToUpdate.push(shape)
					}
				}

				if (selectedIds.length > 0) {
					for (const id of selectedIds) {
						addShapeById(id)
					}

					this.updateShapes(
						shapesToUpdate.map((shape) => {
							return {
								id: shape.id,
								type: shape.type,
								opacity,
							}
						}),
						ephemeral
					)
				}
			}

			this.updateInstanceState({ opacityForNextShape: opacity }, ephemeral, squashing)
		})

		return this
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp}. This change will be applied to any
	 * selected shapes, and any subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setProp(DefaultColorStyle, 'red')
	 * editor.setProp(DefaultColorStyle, 'red', true)
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 * @param ephemeral - Whether the style change is ephemeral. Ephemeral changes don't get added
	 * to the undo/redo stack. Defaults to false.
	 * @param squashing - Whether the style change will be squashed into the existing history entry
	 * rather than creating a new one. Defaults to false.
	 *
	 * @public
	 */
	setStyle<T>(style: StyleProp<T>, value: T, ephemeral = false, squashing = false): this {
		this.history.batch(() => {
			if (this.isIn('select')) {
				const {
					currentPageState: { selectedIds },
				} = this

				if (selectedIds.length > 0) {
					const updates: {
						util: ShapeUtil
						originalShape: TLShape
						updatePartial: TLShapePartial
					}[] = []

					// We can have many deep levels of grouped shape
					// Making a recursive function to look through all the levels
					const addShapeById = (id: TLShape['id']) => {
						const shape = this.getShape(id)
						if (!shape) return
						if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
							const childIds = this.getSortedChildIds(id)
							for (const childId of childIds) {
								addShapeById(childId)
							}
						} else {
							const util = this.getShapeUtil(shape)
							const stylePropKey = this.styleProps[shape.type].get(style)
							if (stylePropKey) {
								const shapePartial: TLShapePartial = {
									id: shape.id,
									type: shape.type,
									props: { [stylePropKey]: value },
								}
								updates.push({
									util,
									originalShape: shape,
									updatePartial: shapePartial,
								})
							}
						}
					}

					for (const id of selectedIds) {
						addShapeById(id)
					}

					this.updateShapes(
						updates.map(({ updatePartial }) => updatePartial),
						ephemeral
					)
				}
			}

			this.updateInstanceState(
				{
					stylesForNextShape: { ...this.instanceState.stylesForNextShape, [style.id]: value },
				},
				ephemeral,
				squashing
			)
		})

		return this
	}

	/* --------------------- Content -------------------- */

	/** @internal */
	externalAssetContentHandlers: {
		[K in TLExternalAssetContent['type']]: {
			[Key in K]:
				| null
				| ((info: TLExternalAssetContent & { type: Key }) => Promise<TLAsset | undefined>)
		}[K]
	} = {
		file: null,
		url: null,
	}

	/**
	 * Register an external content handler. This handler will be called when the editor receives
	 * external content of the provided type. For example, the 'image' type handler will be called
	 * when a user drops an image onto the canvas.
	 *
	 * @example
	 * ```ts
	 * editor.registerExternalAssetHandler('text', myHandler)
	 * ```
	 *
	 * @param type - The type of external content.
	 * @param handler - The handler to use for this content type.
	 *
	 * @public
	 */
	registerExternalAssetHandler<T extends TLExternalAssetContent['type']>(
		type: T,
		handler: null | ((info: TLExternalAssetContent & { type: T }) => Promise<TLAsset>)
	): this {
		this.externalAssetContentHandlers[type] = handler as any
		return this
	}

	/**
	 * Get an asset for an external asset content type.
	 *
	 * @example
	 * ```ts
	 * const asset = await editor.getAssetForExternalContent({ type: 'file', file: myFile })
	 * const asset = await editor.getAssetForExternalContent({ type: 'url', url: myUrl })
	 * ```
	 *
	 * @param info - Info about the external content.
	 * @returns The asset.
	 */
	async getAssetForExternalContent(info: TLExternalAssetContent): Promise<TLAsset | undefined> {
		return await this.externalAssetContentHandlers[info.type]?.(info as any)
	}

	/** @internal */
	externalContentHandlers: {
		[K in TLExternalContent['type']]: {
			[Key in K]: null | ((info: TLExternalContent & { type: Key }) => void)
		}[K]
	} = {
		text: null,
		files: null,
		embed: null,
		'svg-text': null,
		url: null,
	}

	/**
	 * Register an external content handler. This handler will be called when the editor receives
	 * external content of the provided type. For example, the 'image' type handler will be called
	 * when a user drops an image onto the canvas.
	 *
	 * @example
	 * ```ts
	 * editor.registerExternalContentHandler('text', myHandler)
	 * ```
	 *
	 * @param type - The type of external content.
	 * @param handler - The handler to use for this content type.
	 *
	 * @public
	 */
	registerExternalContentHandler<T extends TLExternalContent['type']>(
		type: T,
		handler:
			| null
			| ((
					info: T extends TLExternalContent['type']
						? TLExternalContent & { type: T }
						: TLExternalContent
			  ) => void)
	): this {
		this.externalContentHandlers[type] = handler as any
		return this
	}

	/**
	 * Handle external content, such as files, urls, embeds, or plain text which has been put into the app, for example by pasting external text or dropping external images onto canvas.
	 *
	 * @param info - Info about the external content.
	 */
	async putExternalContent(info: TLExternalContent): Promise<void> {
		return this.externalContentHandlers[info.type]?.(info as any)
	}

	/**
	 * Get content that can be exported for the given shape ids.
	 *
	 * @param ids - The ids of the shapes to get content for. Defaults to the selected shape ids.
	 *
	 * @returns The exported content.
	 *
	 * @public
	 */
	getContent(ids: TLShapeId[] = this.selectedIds): TLContent | undefined {
		if (!ids) return
		if (ids.length === 0) return

		const pageTransforms: Record<string, Matrix2dModel> = {}

		let shapes = dedupe(
			ids
				.map((id) => this.getShape(id)!)
				.sort(sortByIndex)
				.flatMap((shape) => {
					const allShapes = [shape]
					this.visitDescendants(shape.id, (descendant) => {
						allShapes.push(this.getShape(descendant)!)
					})
					return allShapes
				})
		)

		shapes = shapes.map((shape) => {
			pageTransforms[shape.id] = this.getPageTransform(shape.id)!

			shape = structuredClone(shape) as typeof shape

			if (this.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
				const startBindingId =
					shape.props.start.type === 'binding' ? shape.props.start.boundShapeId : undefined

				const endBindingId =
					shape.props.end.type === 'binding' ? shape.props.end.boundShapeId : undefined

				const info = this.getArrowInfo(shape)

				if (shape.props.start.type === 'binding') {
					if (!shapes.some((s) => s.id === startBindingId)) {
						// Uh oh, the arrow's bound-to shape isn't among the shapes
						// that we're getting the content for. We should try to adjust
						// the arrow so that it appears in the place it would be
						if (info?.isValid) {
							const { x, y } = info.start.point
							shape.props.start = {
								type: 'point',
								x,
								y,
							}
						} else {
							const { start } = getArrowTerminalsInArrowSpace(this, shape)
							shape.props.start = {
								type: 'point',
								x: start.x,
								y: start.y,
							}
						}
					}
				}

				if (shape.props.end.type === 'binding') {
					if (!shapes.some((s) => s.id === endBindingId)) {
						if (info?.isValid) {
							const { x, y } = info.end.point
							shape.props.end = {
								type: 'point',
								x,
								y,
							}
						} else {
							const { end } = getArrowTerminalsInArrowSpace(this, shape)
							shape.props.end = {
								type: 'point',
								x: end.x,
								y: end.y,
							}
						}
					}
				}

				const infoAfter = getIsArrowStraight(shape)
					? getStraightArrowInfo(this, shape)
					: getCurvedArrowInfo(this, shape)

				if (info?.isValid && infoAfter?.isValid && !getIsArrowStraight(shape)) {
					const mpA = Vec2d.Med(info.start.handle, info.end.handle)
					const distA = Vec2d.Dist(info.middle, mpA)
					const distB = Vec2d.Dist(infoAfter.middle, mpA)
					if (shape.props.bend < 0) {
						shape.props.bend += distB - distA
					} else {
						shape.props.bend -= distB - distA
					}
				}

				return shape
			}

			return shape
		})

		const rootShapeIds: TLShapeId[] = []

		shapes.forEach((shape) => {
			if (shapes.find((s) => s.id === shape.parentId) === undefined) {
				// Need to get page point and rotation of the shape because shapes in
				// groups use local position/rotation

				const pageTransform = this.getPageTransform(shape.id)!
				const pagePoint = pageTransform.point()
				const pageRotation = pageTransform.rotation()
				shape.x = pagePoint.x
				shape.y = pagePoint.y
				shape.rotation = pageRotation
				shape.parentId = this.currentPageId

				rootShapeIds.push(shape.id)
			}
		})

		const assetsSet = new Set<TLAssetId>()

		shapes.forEach((shape) => {
			if ('assetId' in shape.props) {
				if (shape.props.assetId !== null) {
					assetsSet.add(shape.props.assetId)
				}
			}
		})

		return {
			shapes,
			rootShapeIds,
			schema: this.store.schema.serialize(),
			assets: compact(Array.from(assetsSet).map((id) => this.getAsset(id))),
		}
	}

	/**
	 * Place content into the editor.
	 *
	 * @param content - The content.
	 * @param options - Options for placing the content.
	 *
	 * @public
	 */
	putContent(
		content: TLContent,
		options: {
			point?: VecLike
			select?: boolean
			preservePosition?: boolean
			preserveIds?: boolean
		} = {}
	): this {
		if (this.instanceState.isReadonly) return this

		if (!content.schema) {
			throw Error('Could not put content:\ncontent is missing a schema.')
		}

		const { select = false, preserveIds = false, preservePosition = false } = options
		let { point = undefined } = options

		// decide on a parent for the put shapes; if the parent is among the put shapes(?) then use its parent

		const { currentPageId } = this
		const { assets, shapes, rootShapeIds } = content

		const idMap = new Map<any, TLShapeId>(shapes.map((shape) => [shape.id, createShapeId()]))

		// By default, the paste parent will be the current page.
		let pasteParentId = this.currentPageId as TLPageId | TLShapeId
		let lowestDepth = Infinity
		let lowestAncestors: TLShape[] = []

		// Among the selected shapes, find the shape with the fewest ancestors and use its first ancestor.
		for (const shape of this.selectedShapes) {
			if (lowestDepth === 0) break

			const isFrame = this.isShapeOfType<TLFrameShape>(shape, 'frame')
			const ancestors = this.getAncestors(shape)
			if (isFrame) ancestors.push(shape)

			const depth = isFrame ? ancestors.length + 1 : ancestors.length

			if (depth < lowestDepth) {
				lowestDepth = depth
				lowestAncestors = ancestors
				pasteParentId = isFrame ? shape.id : shape.parentId
			} else if (depth === lowestDepth) {
				if (lowestAncestors.length !== ancestors.length) {
					throw Error(`Ancestors: ${lowestAncestors.length} !== ${ancestors.length}`)
				}

				if (lowestAncestors.length === 0) {
					pasteParentId = currentPageId
					break
				} else {
					pasteParentId = currentPageId
					for (let i = 0; i < lowestAncestors.length; i++) {
						if (ancestors[i] !== lowestAncestors[i]) break
						pasteParentId = ancestors[i].id
					}
				}
			}
		}

		let isDuplicating = false

		if (!isPageId(pasteParentId)) {
			const parent = this.getShape(pasteParentId)
			if (parent) {
				if (!this.viewportPageBounds.includes(this.getPageBounds(parent)!)) {
					pasteParentId = currentPageId
				} else {
					if (rootShapeIds.length === 1) {
						const rootShape = shapes.find((s) => s.id === rootShapeIds[0])!
						if (
							this.isShapeOfType<TLFrameShape>(parent, 'frame') &&
							this.isShapeOfType<TLFrameShape>(rootShape, 'frame') &&
							rootShape.props.w === parent?.props.w &&
							rootShape.props.h === parent?.props.h
						) {
							isDuplicating = true
						}
					}
				}
			} else {
				pasteParentId = currentPageId
			}
		}

		if (!isDuplicating) {
			isDuplicating = idMap.has(pasteParentId)
		}

		if (isDuplicating) {
			pasteParentId = this.getShape(pasteParentId)!.parentId
		}

		let index = this.getHighestIndexForParent(pasteParentId)

		const rootShapes: TLShape[] = []

		const newShapes: TLShape[] = shapes.map((shape): TLShape => {
			let newShape: TLShape

			if (preserveIds) {
				newShape = deepCopy(shape)
				idMap.set(shape.id, shape.id)
			} else {
				const id = idMap.get(shape.id)!

				// Create the new shape (new except for the id)
				newShape = deepCopy({ ...shape, id })
			}

			if (rootShapeIds.includes(shape.id)) {
				newShape.parentId = currentPageId
				rootShapes.push(newShape)
			}

			// Assign the child to its new parent.

			// If the child's parent is among the putting shapes, then assign
			// it to the new parent's id.
			if (idMap.has(newShape.parentId)) {
				newShape.parentId = idMap.get(shape.parentId)!
			} else {
				rootShapeIds.push(newShape.id)
				// newShape.parentId = pasteParentId
				newShape.index = index
				index = getIndexAbove(index)
			}

			if (this.isShapeOfType<TLArrowShape>(newShape, 'arrow')) {
				if (newShape.props.start.type === 'binding') {
					const mappedId = idMap.get(newShape.props.start.boundShapeId)
					newShape.props.start = mappedId
						? { ...newShape.props.start, boundShapeId: mappedId }
						: // this shouldn't happen, if you copy an arrow but not it's bound shape it should
						  // convert the binding to a point at the time of copying
						  { type: 'point', x: 0, y: 0 }
				}
				if (newShape.props.end.type === 'binding') {
					const mappedId = idMap.get(newShape.props.end.boundShapeId)
					newShape.props.end = mappedId
						? { ...newShape.props.end, boundShapeId: mappedId }
						: // this shouldn't happen, if you copy an arrow but not it's bound shape it should
						  // convert the binding to a point at the time of copying
						  { type: 'point', x: 0, y: 0 }
				}
			}

			return newShape
		})

		if (newShapes.length + this.currentPageShapeIds.size > MAX_SHAPES_PER_PAGE) {
			// There's some complexity here involving children
			// that might be created without their parents, so
			// if we're going over the limit then just don't paste.
			alertMaxShapes(this)
			return this
		}

		// Migrate the new shapes

		let assetsToCreate: TLAsset[] = []

		if (assets) {
			for (let i = 0; i < assets.length; i++) {
				const asset = assets[i]
				const result = this.store.schema.migratePersistedRecord(asset, content.schema)
				if (result.type === 'success') {
					assets[i] = result.value as TLAsset
				} else {
					throw Error(
						`Could not put content:\ncould not migrate content for asset:\n${asset.id}\n${asset.type}\nreason:${result.reason}`
					)
				}
			}

			const assetsToUpdate: (TLImageAsset | TLVideoAsset)[] = []

			assetsToCreate = assets
				.filter((asset) => !this.store.has(asset.id))
				.map((asset) => {
					if (asset.type === 'image' || asset.type === 'video') {
						if (asset.props.src && asset.props.src?.startsWith('data:image')) {
							assetsToUpdate.push(structuredClone(asset))
							asset.props.src = null
						} else {
							assetsToUpdate.push(structuredClone(asset))
						}
					}

					return asset
				})

			Promise.allSettled(
				assetsToUpdate.map(async (asset) => {
					const file = await dataUrlToFile(
						asset.props.src!,
						asset.props.name,
						asset.props.mimeType ?? 'image/png'
					)

					const newAsset = await this.getAssetForExternalContent({ type: 'file', file })

					if (!newAsset) {
						return null
					}

					return [asset, newAsset] as const
				})
			).then((assets) => {
				this.updateAssets(
					compact(
						assets.map((result) =>
							result.status === 'fulfilled' && result.value
								? { ...result.value[1], id: result.value[0].id }
								: undefined
						)
					)
				)
			})
		}

		for (let i = 0; i < newShapes.length; i++) {
			const shape = newShapes[i]
			const result = this.store.schema.migratePersistedRecord(shape, content.schema)
			if (result.type === 'success') {
				newShapes[i] = result.value as TLShape
			} else {
				throw Error(
					`Could not put content:\ncould not migrate content for shape:\n${shape.id}, ${shape.type}\nreason:${result.reason}`
				)
			}
		}

		this.batch(() => {
			// Create any assets that need to be created
			if (assetsToCreate.length > 0) {
				this.createAssets(assetsToCreate)
			}

			// Create the shapes with root shapes as children of the page
			this.createShapes(newShapes, select)

			// And then, if needed, reparent the root shapes to the paste parent
			if (pasteParentId !== currentPageId) {
				this.reparentShapes(
					rootShapes.map((s) => s.id),
					pasteParentId
				)
			}

			const newCreatedShapes = newShapes.map((s) => this.getShape(s.id)!)
			const bounds = Box2d.Common(newCreatedShapes.map((s) => this.getPageBounds(s)!))

			if (point === undefined) {
				if (!isPageId(pasteParentId)) {
					// Put the shapes in the middle of the (on screen) parent
					const shape = this.getShape(pasteParentId)!
					point = this.getGeometry(shape).bounds.center
				} else {
					const { viewportPageBounds } = this
					if (preservePosition || viewportPageBounds.includes(Box2d.From(bounds))) {
						// Otherwise, put shapes where they used to be
						point = bounds.center
					} else {
						// If the old bounds are outside of the viewport...
						// put the shapes in the middle of the viewport
						point = viewportPageBounds.center
					}
				}
			}

			if (rootShapes.length === 1) {
				const onlyRoot = rootShapes[0] as TLFrameShape
				// If the old bounds are in the viewport...
				if (this.isShapeOfType<TLFrameShape>(onlyRoot, 'frame')) {
					while (
						this.getShapesAtPoint(point).some(
							(shape) =>
								this.isShapeOfType<TLFrameShape>(shape, 'frame') &&
								shape.props.w === onlyRoot.props.w &&
								shape.props.h === onlyRoot.props.h
						)
					) {
						point.x += bounds.w + 16
					}
				}
			}

			this.updateShapes(
				rootShapes.map((s) => {
					const delta = {
						x: (s.x ?? 0) - (bounds.x + bounds.w / 2),
						y: (s.y ?? 0) - (bounds.y + bounds.h / 2),
					}

					return { id: s.id, type: s.type, x: point!.x + delta.x, y: point!.y + delta.y }
				})
			)
		})

		return this
	}

	/**
	 * Get an exported SVG of the given shapes.
	 *
	 * @param ids - The ids of the shapes to export. Defaults to selected shapes.
	 * @param opts - Options for the export.
	 *
	 * @returns The SVG element.
	 *
	 * @public
	 */
	async getSvg(
		ids: TLShapeId[] = this.selectedIds.length
			? this.selectedIds
			: (Object.keys(this.currentPageShapeIds) as TLShapeId[]),
		opts = {} as Partial<{
			scale: number
			background: boolean
			padding: number
			darkMode?: boolean
			preserveAspectRatio: React.SVGAttributes<SVGSVGElement>['preserveAspectRatio']
		}>
	) {
		if (ids.length === 0) return
		if (!window.document) throw Error('No document')

		const {
			scale = 1,
			background = false,
			padding = SVG_PADDING,
			preserveAspectRatio = false,
		} = opts

		// todo: we shouldn't depend on the public theme here
		const theme = getDefaultColorTheme({ isDarkMode: this.user.isDarkMode })

		// ---Figure out which shapes we need to include
		const shapeIdsToInclude = this.getShapeAndDescendantIds(ids)
		const renderingShapes = this.computeUnorderedRenderingShapes([this.currentPageId]).filter(
			({ id }) => shapeIdsToInclude.has(id)
		)

		// --- Common bounding box of all shapes
		let bbox = null
		for (const { maskedPageBounds } of renderingShapes) {
			if (!maskedPageBounds) continue
			if (bbox) {
				bbox.union(maskedPageBounds)
			} else {
				bbox = maskedPageBounds.clone()
			}
		}

		// no unmasked shapes to export
		if (!bbox) return

		const singleFrameShapeId =
			ids.length === 1 && this.isShapeOfType<TLFrameShape>(this.getShape(ids[0])!, 'frame')
				? ids[0]
				: null
		if (!singleFrameShapeId) {
			// Expand by an extra 32 pixels
			bbox.expandBy(padding)
		}

		// We want the svg image to be BIGGER THAN USUAL to account for image quality
		const w = bbox.width * scale
		const h = bbox.height * scale

		// --- Create the SVG

		// Embed our custom fonts
		const svg = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg')

		if (preserveAspectRatio) {
			svg.setAttribute('preserveAspectRatio', preserveAspectRatio)
		}

		svg.setAttribute('direction', 'ltr')
		svg.setAttribute('width', w + '')
		svg.setAttribute('height', h + '')
		svg.setAttribute('viewBox', `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`)
		svg.setAttribute('stroke-linecap', 'round')
		svg.setAttribute('stroke-linejoin', 'round')
		// Add current background color, or else background will be transparent

		if (background) {
			if (singleFrameShapeId) {
				svg.style.setProperty('background', theme.solid)
			} else {
				svg.style.setProperty('background-color', theme.background)
			}
		} else {
			svg.style.setProperty('background-color', 'transparent')
		}

		try {
			document.body.focus?.() // weird but necessary
		} catch (e) {
			// not implemented
		}

		// Add the defs to the svg
		const defs = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs')
		svg.append(defs)

		const exportDefPromisesById = new Map<string, Promise<void>>()
		const exportContext: SvgExportContext = {
			addExportDef: (def: SvgExportDef) => {
				if (exportDefPromisesById.has(def.key)) return
				const promise = (async () => {
					const elements = await def.getElement()
					if (!elements) return

					const comment = document.createComment(`def: ${def.key}`)
					defs.appendChild(comment)

					for (const element of Array.isArray(elements) ? elements : [elements]) {
						defs.appendChild(element)
					}
				})()
				exportDefPromisesById.set(def.key, promise)
			},
		}

		const unorderedShapeElements = (
			await Promise.all(
				renderingShapes.map(async ({ id, opacity, index, backgroundIndex }) => {
					// Don't render the frame if we're only exporting a single frame
					if (id === singleFrameShapeId) return []

					const shape = this.getShape(id)!

					if (this.isShapeOfType<TLGroupShape>(shape, 'group')) return []

					const util = this.getShapeUtil(shape)

					let shapeSvgElement = await util.toSvg?.(shape, exportContext)
					let backgroundSvgElement = await util.toBackgroundSvg?.(shape, exportContext)

					// wrap the shapes in groups so we can apply properties without overwriting ones from the shape util
					if (shapeSvgElement) {
						const outerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
						outerElement.appendChild(shapeSvgElement)
						shapeSvgElement = outerElement
					}

					if (backgroundSvgElement) {
						const outerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
						outerElement.appendChild(backgroundSvgElement)
						backgroundSvgElement = outerElement
					}

					if (!shapeSvgElement && !backgroundSvgElement) {
						const bounds = this.getPageBounds(shape)!
						const elm = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect')
						elm.setAttribute('width', bounds.width + '')
						elm.setAttribute('height', bounds.height + '')
						elm.setAttribute('fill', theme.solid)
						elm.setAttribute('stroke', theme.grey.pattern)
						elm.setAttribute('stroke-width', '1')
						shapeSvgElement = elm
					}

					let pageTransform = this.getPageTransform(shape)!.toCssString()
					if ('scale' in shape.props) {
						if (shape.props.scale !== 1) {
							pageTransform = `${pageTransform} scale(${shape.props.scale}, ${shape.props.scale})`
						}
					}

					shapeSvgElement?.setAttribute('transform', pageTransform)
					backgroundSvgElement?.setAttribute('transform', pageTransform)
					shapeSvgElement?.setAttribute('opacity', opacity + '')
					backgroundSvgElement?.setAttribute('opacity', opacity + '')

					// Create svg mask if shape has a frame as parent
					const pageMask = this.getPageMask(shape.id)
					if (pageMask) {
						// Create a clip path and add it to defs
						const clipPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
						defs.appendChild(clipPathEl)
						const id = uniqueId()
						clipPathEl.id = id

						// Create a polyline mask that does the clipping
						const mask = document.createElementNS('http://www.w3.org/2000/svg', 'path')
						mask.setAttribute('d', `M${pageMask.map(({ x, y }) => `${x},${y}`).join('L')}Z`)
						clipPathEl.appendChild(mask)

						// Create group that uses the clip path and wraps the shape elements
						if (shapeSvgElement) {
							const outerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
							outerElement.setAttribute('clip-path', `url(#${id})`)
							outerElement.appendChild(shapeSvgElement)
							shapeSvgElement = outerElement
						}

						if (backgroundSvgElement) {
							const outerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
							outerElement.setAttribute('clip-path', `url(#${id})`)
							outerElement.appendChild(backgroundSvgElement)
							backgroundSvgElement = outerElement
						}
					}

					const elements = []
					if (shapeSvgElement) {
						elements.push({ zIndex: index, element: shapeSvgElement })
					}
					if (backgroundSvgElement) {
						elements.push({ zIndex: backgroundIndex, element: backgroundSvgElement })
					}

					return elements
				})
			)
		).flat()

		await Promise.all(exportDefPromisesById.values())

		for (const { element } of unorderedShapeElements.sort((a, b) => a.zIndex - b.zIndex)) {
			svg.appendChild(element)
		}

		return svg
	}

	/* --------------------- Events --------------------- */

	/**
	 * The app's current input state.
	 *
	 * @public
	 */
	inputs = {
		/** The most recent pointer down's position in page space. */
		originPagePoint: new Vec2d(),
		/** The most recent pointer down's position in screen space. */
		originScreenPoint: new Vec2d(),
		/** The previous pointer position in page space. */
		previousPagePoint: new Vec2d(),
		/** The previous pointer position in screen space. */
		previousScreenPoint: new Vec2d(),
		/** The most recent pointer position in page space. */
		currentPagePoint: new Vec2d(),
		/** The most recent pointer position in screen space. */
		currentScreenPoint: new Vec2d(),
		/** A set containing the currently pressed keys. */
		keys: new Set<string>(),
		/** A set containing the currently pressed buttons. */
		buttons: new Set<number>(),
		/** Whether the input is from a pe. */
		isPen: false,
		/** Whether the shift key is currently pressed. */
		shiftKey: false,
		/** Whether the control or command key is currently pressed. */
		ctrlKey: false,
		/** Whether the alt or option key is currently pressed. */
		altKey: false,
		/** Whether the user is dragging. */
		isDragging: false,
		/** Whether the user is pointing. */
		isPointing: false,
		/** Whether the user is pinching. */
		isPinching: false,
		/** Whether the user is editing. */
		isEditing: false,
		/** Whether the user is panning. */
		isPanning: false,
		/** Velocity of mouse pointer, in pixels per millisecond */
		pointerVelocity: new Vec2d(),
	}

	/**
	 * Update the input points from a pointer or pinch event.
	 *
	 * @param info - The event info.
	 */
	private _updateInputsFromEvent(info: TLPointerEventInfo | TLPinchEventInfo): void {
		const { previousScreenPoint, previousPagePoint, currentScreenPoint, currentPagePoint } =
			this.inputs

		const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: sx, y: sy, z: sz } = info.point
		const { x: cx, y: cy, z: cz } = this.camera

		previousScreenPoint.setTo(currentScreenPoint)
		previousPagePoint.setTo(currentPagePoint)

		currentScreenPoint.set(sx, sy)
		currentPagePoint.set(
			(sx - screenBounds.x) / cz - cx,
			(sy - screenBounds.y) / cz - cy,
			sz ?? 0.5
		)

		this.inputs.isPen = info.type === 'pointer' && info.isPen

		// Reset velocity on pointer down
		if (info.name === 'pointer_down') {
			this.inputs.pointerVelocity.set(0, 0)
		}

		// todo: We only have to do this if there are multiple users in the document
		this.store.put([
			{
				id: TLPOINTER_ID,
				typeName: 'pointer',
				x: currentPagePoint.x,
				y: currentPagePoint.y,
				lastActivityTimestamp:
					// If our pointer moved only because we're following some other user, then don't
					// update our last activity timestamp; otherwise, update it to the current timestamp.
					info.type === 'pointer' && info.pointerId === INTERNAL_POINTER_IDS.CAMERA_MOVE
						? this.store.get(TLPOINTER_ID)?.lastActivityTimestamp ?? Date.now()
						: Date.now(),
				meta: {},
			},
		])
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
	cancel(): this {
		this.dispatch({ type: 'misc', name: 'cancel' })
		return this
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
	interrupt(): this {
		this.dispatch({ type: 'misc', name: 'interrupt' })
		return this
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
	complete(): this {
		this.dispatch({ type: 'misc', name: 'complete' })
		return this
	}

	/**
	 * A manager for recording multiple click events.
	 *
	 * @internal
	 */
	protected _clickManager = new ClickManager(this)

	/**
	 * Prevent a double click event from firing the next time the user clicks
	 *
	 * @public
	 */
	cancelDoubleClick() {
		this._clickManager.cancelDoubleClickTimeout()
	}

	/**
	 * The previous cursor. Used for restoring the cursor after pan events.
	 *
	 * @internal
	 */
	private _prevCursor: TLCursorType = 'default'

	/** @internal */
	private _shiftKeyTimeout = -1 as any

	/** @internal */
	private _setShiftKeyTimeout = () => {
		this.inputs.shiftKey = false
		this.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Shift',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			code: 'ShiftLeft',
		})
	}

	/** @internal */
	private _altKeyTimeout = -1 as any

	/** @internal */
	private _setAltKeyTimeout = () => {
		this.inputs.altKey = false
		this.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Alt',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			code: 'AltLeft',
		})
	}

	/** @internal */
	private _ctrlKeyTimeout = -1 as any

	/** @internal */
	private _setCtrlKeyTimeout = () => {
		this.inputs.ctrlKey = false
		this.dispatch({
			type: 'keyboard',
			name: 'key_up',
			key: 'Ctrl',
			shiftKey: this.inputs.shiftKey,
			ctrlKey: this.inputs.ctrlKey,
			altKey: this.inputs.altKey,
			code: 'ControlLeft',
		})
	}

	/** @internal */
	private _restoreToolId = 'select'

	/** @internal */
	private _pinchStart = 1

	/** @internal */
	private _didPinch = false

	/** @internal */
	private _selectedIdsAtPointerDown: TLShapeId[] = []

	/** @internal */
	capturedPointerId: number | null = null

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
	dispatch(info: TLEventInfo): this {
		// prevent us from spamming similar event errors if we're crashed.
		// todo: replace with new readonly mode?
		if (this.crashingError) return this

		const { inputs } = this
		const { type } = info

		this.batch(() => {
			if (info.type === 'misc') {
				// stop panning if the interaction is cancelled or completed
				if (info.name === 'cancel' || info.name === 'complete') {
					this.inputs.isDragging = false

					if (this.inputs.isPanning) {
						this.inputs.isPanning = false
						this.updateInstanceState({
							cursor: {
								type: this._prevCursor,
								rotation: 0,
							},
						})
					}
				}

				this.root.handleEvent(info)
				return
			}

			if (info.shiftKey) {
				clearInterval(this._shiftKeyTimeout)
				this._shiftKeyTimeout = -1
				inputs.shiftKey = true
			} else if (!info.shiftKey && inputs.shiftKey && this._shiftKeyTimeout === -1) {
				this._shiftKeyTimeout = setTimeout(this._setShiftKeyTimeout, 150)
			}

			if (info.altKey) {
				clearInterval(this._altKeyTimeout)
				this._altKeyTimeout = -1
				inputs.altKey = true
			} else if (!info.altKey && inputs.altKey && this._altKeyTimeout === -1) {
				this._altKeyTimeout = setTimeout(this._setAltKeyTimeout, 150)
			}

			if (info.ctrlKey) {
				clearInterval(this._ctrlKeyTimeout)
				this._ctrlKeyTimeout = -1
				inputs.ctrlKey = true /** @internal */ /** @internal */ /** @internal */
			} else if (!info.ctrlKey && inputs.ctrlKey && this._ctrlKeyTimeout === -1) {
				this._ctrlKeyTimeout = setTimeout(this._setCtrlKeyTimeout, 150)
			}

			const { originPagePoint, originScreenPoint, currentPagePoint, currentScreenPoint } = inputs

			if (!inputs.isPointing) {
				inputs.isDragging = false
			}

			switch (type) {
				case 'pinch': {
					if (!this.instanceState.canMoveCamera) return
					this._updateInputsFromEvent(info)

					switch (info.name) {
						case 'pinch_start': {
							if (inputs.isPinching) return

							if (!inputs.isEditing) {
								this._pinchStart = this.camera.z
								if (!this._selectedIdsAtPointerDown.length) {
									this._selectedIdsAtPointerDown = this.selectedIds.slice()
								}

								this._didPinch = true

								inputs.isPinching = true

								this.interrupt()
							}

							return // Stop here!
						}
						case 'pinch': {
							if (!inputs.isPinching) return

							const {
								point: { x, y, z = 1 },
								delta: { x: dx, y: dy },
							} = info

							const {
								camera: { x: cx, y: cy, z: cz },
							} = this

							const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

							this.setCamera(
								cx + dx / cz - x / cz + x / zoom,
								cy + dy / cz - y / cz + y / zoom,
								zoom
							)

							return // Stop here!
						}
						case 'pinch_end': {
							if (!inputs.isPinching) return this

							inputs.isPinching = false
							const { _selectedIdsAtPointerDown } = this
							this.setSelectedIds(this._selectedIdsAtPointerDown, true)
							this._selectedIdsAtPointerDown = []

							const {
								camera: { x: cx, y: cy, z: cz },
							} = this

							let zoom: number | undefined

							if (cz > 0.9 && cz < 1.05) {
								zoom = 1
							} else if (cz > 0.49 && cz < 0.505) {
								zoom = 0.5
							}

							if (cz > this._pinchStart - 0.1 && cz < this._pinchStart + 0.05) {
								zoom = this._pinchStart
							}

							if (zoom !== undefined) {
								const { x, y } = this.viewportScreenCenter
								this.animateCamera(
									cx + (x / zoom - x) - (x / cz - x),
									cy + (y / zoom - y) - (y / cz - y),
									zoom,
									{ duration: 100 }
								)
							}

							if (this._didPinch) {
								this._didPinch = false
								requestAnimationFrame(() => {
									if (!this._didPinch) {
										this.setSelectedIds(_selectedIdsAtPointerDown, true)
									}
								})
							}

							return // Stop here!
						}
					}
				}
				case 'wheel': {
					if (!this.instanceState.canMoveCamera) return

					if (this.isMenuOpen) {
						// noop
					} else {
						if (inputs.ctrlKey) {
							// todo: Start or update the zoom end interval

							// If the alt or ctrl keys are pressed,
							// zoom or pan the camera and then return.
							const { x, y } = this.inputs.currentScreenPoint
							const { x: cx, y: cy, z: cz } = this.camera

							const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cz + (info.delta.z ?? 0) * cz))

							this.setCamera(
								cx + (x / zoom - x) - (x / cz - x),
								cy + (y / zoom - y) - (y / cz - y),
								zoom
							)

							// We want to return here because none of the states in our
							// statechart should respond to this event (a camera zoom)
							return
						}

						// Update the camera here, which will dispatch a pointer move...
						// this will also update the pointer position, etc
						this.pan(info.delta.x, info.delta.y)

						if (
							!inputs.isDragging &&
							inputs.isPointing &&
							originPagePoint.dist(currentPagePoint) >
								(this.instanceState.isCoarsePointer ? COARSE_DRAG_DISTANCE : DRAG_DISTANCE) /
									this.zoomLevel
						) {
							inputs.isDragging = true
						}
					}
					break
				}
				case 'pointer': {
					// If we're pinching, return
					if (inputs.isPinching) return

					this._updateInputsFromEvent(info)

					const { isPen } = info

					switch (info.name) {
						case 'pointer_down': {
							this._selectedIdsAtPointerDown = this.selectedIds.slice()

							// Firefox bug fix...
							// If it's a left-mouse-click, we store the pointer id for later user
							if (info.button === 0) {
								this.capturedPointerId = info.pointerId
							}

							// Add the button from the buttons set
							inputs.buttons.add(info.button)

							inputs.isPointing = true
							inputs.isDragging = false

							if (this.instanceState.isPenMode) {
								if (!isPen) {
									return
								}
							} else {
								if (isPen) {
									this.updateInstanceState({ isPenMode: true })
								}
							}

							if (info.button === 5) {
								// Eraser button activates eraser
								this._restoreToolId = this.currentToolId
								this.complete()
								this.setCurrentTool('eraser')
							} else if (info.button === 1) {
								// Middle mouse pan activates panning
								if (!this.inputs.isPanning) {
									this._prevCursor = this.instanceState.cursor.type
								}

								this.inputs.isPanning = true
							}

							if (this.inputs.isPanning) {
								this.stopCameraAnimation()
								this.updateInstanceState({
									cursor: {
										type: 'grabbing',
										rotation: 0,
									},
								})
								return this
							}

							originScreenPoint.setTo(currentScreenPoint)
							originPagePoint.setTo(currentPagePoint)
							break
						}
						case 'pointer_move': {
							// If the user is in pen mode, but the pointer is not a pen, stop here.
							if (!isPen && this.instanceState.isPenMode) {
								return
							}

							if (this.inputs.isPanning && this.inputs.isPointing) {
								// Handle panning
								const { currentScreenPoint, previousScreenPoint } = this.inputs
								const delta = Vec2d.Sub(currentScreenPoint, previousScreenPoint)
								this.pan(delta.x, delta.y)
								return
							}

							if (
								!inputs.isDragging &&
								inputs.isPointing &&
								originPagePoint.dist(currentPagePoint) >
									(this.instanceState.isCoarsePointer ? COARSE_DRAG_DISTANCE : DRAG_DISTANCE) /
										this.zoomLevel
							) {
								inputs.isDragging = true
							}
							break
						}
						case 'pointer_up': {
							// Remove the button from the buttons set
							inputs.buttons.delete(info.button)

							inputs.isPointing = false
							inputs.isDragging = false

							if (this.isMenuOpen) {
								// Suppressing pointerup here as <ContextMenu/> doesn't seem to do what we what here.
								return
							}

							if (!isPen && this.instanceState.isPenMode) {
								return
							}

							// Firefox bug fix...
							// If it's the same pointer that we stored earlier...
							// ... then it's probably still a left-mouse-click!
							if (this.capturedPointerId === info.pointerId) {
								this.capturedPointerId = null
								info.button = 0
							}

							if (inputs.isPanning) {
								if (info.button === 1) {
									if (!this.inputs.keys.has(' ')) {
										inputs.isPanning = false

										this.slideCamera({
											speed: Math.min(2, this.inputs.pointerVelocity.len()),
											direction: this.inputs.pointerVelocity,
											friction: CAMERA_SLIDE_FRICTION,
										})
										this.updateInstanceState({
											cursor: { type: this._prevCursor, rotation: 0 },
										})
									} else {
										this.slideCamera({
											speed: Math.min(2, this.inputs.pointerVelocity.len()),
											direction: this.inputs.pointerVelocity,
											friction: CAMERA_SLIDE_FRICTION,
										})
										this.updateInstanceState({
											cursor: {
												type: 'grab',
												rotation: 0,
											},
										})
									}
								} else if (info.button === 0) {
									this.slideCamera({
										speed: Math.min(2, this.inputs.pointerVelocity.len()),
										direction: this.inputs.pointerVelocity,
										friction: CAMERA_SLIDE_FRICTION,
									})
									this.updateInstanceState({
										cursor: {
											type: 'grab',
											rotation: 0,
										},
									})
								}
							} else {
								if (info.button === 5) {
									// Eraser button activates eraser
									this.complete()
									this.setCurrentTool(this._restoreToolId)
								}
							}

							break
						}
					}

					break
				}
				case 'keyboard': {
					// please, please
					if (info.key === 'ShiftRight') info.key = 'ShiftLeft'
					if (info.key === 'AltRight') info.key = 'AltLeft'
					if (info.code === 'ControlRight') info.code = 'ControlLeft'

					switch (info.name) {
						case 'key_down': {
							// Add the key from the keys set
							inputs.keys.add(info.code)

							// If the space key is pressed (but meta / control isn't!) activate panning
							if (!info.ctrlKey && info.code === 'Space') {
								if (!this.inputs.isPanning) {
									this._prevCursor = this.instanceState.cursor.type
								}

								this.inputs.isPanning = true
								this.updateInstanceState({
									cursor: { type: this.inputs.isPointing ? 'grabbing' : 'grab', rotation: 0 },
								})
							}

							break
						}
						case 'key_up': {
							// Remove the key from the keys set
							inputs.keys.delete(info.code)

							if (info.code === 'Space' && !this.inputs.buttons.has(1)) {
								this.inputs.isPanning = false
								this.updateInstanceState({
									cursor: { type: this._prevCursor, rotation: 0 },
								})
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
				if (info.button === 1) {
					info.name = 'middle_click'
				} else if (info.button === 2) {
					info.name = 'right_click'
				}

				// If a pointer event, send the event to the click manager.
				if (info.isPen === this.instanceState.isPenMode) {
					switch (info.name) {
						case 'pointer_down': {
							const otherEvent = this._clickManager.transformPointerDownEvent(info)
							if (info.name !== otherEvent.name) {
								this.root.handleEvent(info)
								this.emit('event', info)
								this.root.handleEvent(otherEvent)
								this.emit('event', otherEvent)
								return
							}

							break
						}
						case 'pointer_up': {
							const otherEvent = this._clickManager.transformPointerUpEvent(info)
							if (info.name !== otherEvent.name) {
								this.root.handleEvent(info)
								this.emit('event', info)
								this.root.handleEvent(otherEvent)
								this.emit('event', otherEvent)
								return
							}

							break
						}
						case 'pointer_move': {
							this._clickManager.handleMove()
							break
						}
					}
				}
			}

			// Send the event to the statechart. It will be handled by all
			// active states, starting at the root.
			this.root.handleEvent(info)
			this.emit('event', info)
		})

		return this
	}
}

function alertMaxShapes(editor: Editor, pageId = editor.currentPageId) {
	const name = editor.getPage(pageId)!.name
	editor.emit('max-shapes', { name, pageId, count: MAX_SHAPES_PER_PAGE })
}

/** @public */
export type TLExternalContent =
	| {
			type: 'text'
			point?: VecLike
			text: string
	  }
	| {
			type: 'files'
			files: File[]
			point?: VecLike
			ignoreParent: boolean
	  }
	| {
			type: 'url'
			url: string
			point?: VecLike
	  }
	| {
			type: 'svg-text'
			text: string
			point?: VecLike
	  }
	| {
			type: 'embed'
			url: string
			point?: VecLike
			embed: EmbedDefinition
	  }

/** @public */
export type TLExternalAssetContent = { type: 'file'; file: File } | { type: 'url'; url: string }
