import { EMPTY_ARRAY, atom, computed, transact } from '@tldraw/state'
import { ComputedCache, RecordType } from '@tldraw/store'
import {
	CameraRecordType,
	InstancePageStateRecordType,
	PageRecordType,
	StyleProp,
	TLArrowShape,
	TLAsset,
	TLAssetId,
	TLAssetPartial,
	TLCursor,
	TLCursorType,
	TLDOCUMENT_ID,
	TLDocument,
	TLFrameShape,
	TLGeoShape,
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
	dedupe,
	deepCopy,
	getOwnProperty,
	hasOwnProperty,
	sortById,
	structuredClone,
} from '@tldraw/utils'
import { EventEmitter } from 'eventemitter3'
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
	HIT_TEST_MARGIN,
	INTERNAL_POINTER_IDS,
	MAX_PAGES,
	MAX_SHAPES_PER_PAGE,
	MAX_ZOOM,
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
import { parentsToChildren } from './derivations/parentsToChildren'
import { deriveShapeIdsInCurrentPage } from './derivations/shapeIdsInCurrentPage'
import { ClickManager } from './managers/ClickManager'
import { EnvironmentManager } from './managers/EnvironmentManager'
import { HistoryManager } from './managers/HistoryManager'
import { SideEffectManager } from './managers/SideEffectManager'
import { SnapManager } from './managers/SnapManager'
import { TextManager } from './managers/TextManager'
import { TickManager } from './managers/TickManager'
import { UserPreferencesManager } from './managers/UserPreferencesManager'
import { ShapeUtil, TLResizeMode, TLShapeUtilConstructor } from './shapes/ShapeUtil'
import { TLArrowInfo } from './shapes/shared/arrow/arrow-types'
import { getCurvedArrowInfo } from './shapes/shared/arrow/curved-arrow'
import { getArrowTerminalsInArrowSpace, getIsArrowStraight } from './shapes/shared/arrow/shared'
import { getStraightArrowInfo } from './shapes/shared/arrow/straight-arrow'
import { RootState } from './tools/RootState'
import { StateNode, TLStateNodeConstructor } from './tools/StateNode'
import { SvgExportContext, SvgExportDef } from './types/SvgExportContext'
import { TLContent } from './types/clipboard-types'
import { TLEventMap } from './types/emit-types'
import { TLEventInfo, TLPinchEventInfo, TLPointerEventInfo } from './types/event-types'
import { TLExternalAssetContent, TLExternalContent } from './types/external-content'
import { TLCommandHistoryOptions } from './types/history-types'
import { OptionalKeys, RequiredKeys } from './types/misc-types'
import { TLResizeHandle } from './types/selection-types'

/** @public */
export type TLAnimationOptions = Partial<{
	duration: number
	easing: (t: number) => number
}>

/** @public */
export type TLResizeShapeOptions = Partial<{
	initialBounds: Box2d
	scaleOrigin: VecLike
	scaleAxisRotation: number
	initialShape: TLShape
	initialPageTransform: MatLike
	dragHandle: TLResizeHandle
	mode: TLResizeMode
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
	 * Should return a containing html element which has all the styles applied to the editor. If not
	 * given, the body element will be used.
	 */
	getContainer: () => HTMLElement
	/**
	 * (optional) A user defined externally to replace the default user.
	 */
	user?: TLUser
	/**
	 * (optional) The editor's initial active tool (or other state node id).
	 */
	initialState?: string
	/**
	 * (optional) Whether to infer dark mode from the user's system preferences. Defaults to false.
	 */
	inferDarkMode?: boolean
}

/** @public */
export class Editor extends EventEmitter<TLEventMap> {
	constructor({
		store,
		user,
		shapeUtils,
		tools,
		getContainer,
		initialState,
		inferDarkMode,
	}: TLEditorOptions) {
		super()

		this.store = store

		this.snaps = new SnapManager(this)

		this.user = new UserPreferencesManager(user ?? createTLUser(), inferDarkMode ?? false)

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

		this.environment = new EnvironmentManager(this)

		// Cleanup

		const invalidParents = new Set<TLShapeId>()

		const reparentArrow = (arrowId: TLArrowShape['id']) => {
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

			const higherSiblings = this.getSortedChildIdsForParent(highestSibling.parentId)
				.map((id) => this.getShape(id)!)
				.filter((sibling) => sibling.index > highestSibling!.index)

			if (higherSiblings.length) {
				// there are siblings above the highest bound sibling, we need to
				// insert between them.

				// if the next sibling is also a bound arrow though, we can end up
				// all fighting for the same indexes. so lets find the next
				// non-arrow sibling...
				const nextHighestNonArrowSibling = higherSiblings.find(
					(sibling) => sibling.type !== 'arrow'
				)

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

		const unbindArrowTerminal = (arrow: TLArrowShape, handleId: 'start' | 'end') => {
			const { x, y } = getArrowTerminalsInArrowSpace(this, arrow)[handleId]
			this.store.put([{ ...arrow, props: { ...arrow.props, [handleId]: { type: 'point', x, y } } }])
		}

		const arrowDidUpdate = (arrow: TLArrowShape) => {
			// if the shape is an arrow and its bound shape is on another page
			// or was deleted, unbind it
			for (const handle of ['start', 'end'] as const) {
				const terminal = arrow.props[handle]
				if (terminal.type !== 'binding') continue
				const boundShape = this.getShape(terminal.boundShapeId)
				const isShapeInSamePageAsArrow =
					this.getAncestorPageId(arrow) === this.getAncestorPageId(boundShape)
				if (!boundShape || !isShapeInSamePageAsArrow) {
					unbindArrowTerminal(arrow, handle)
				}
			}

			// always check the arrow parents
			reparentArrow(arrow.id)
		}

		const cleanupInstancePageState = (
			prevPageState: TLInstancePageState,
			shapesNoLongerInPage: Set<TLShapeId>
		) => {
			let nextPageState = null as null | TLInstancePageState

			const selectedShapeIds = prevPageState.selectedShapeIds.filter(
				(id) => !shapesNoLongerInPage.has(id)
			)
			if (selectedShapeIds.length !== prevPageState.selectedShapeIds.length) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.selectedShapeIds = selectedShapeIds
			}

			const erasingShapeIds = prevPageState.erasingShapeIds.filter(
				(id) => !shapesNoLongerInPage.has(id)
			)
			if (erasingShapeIds.length !== prevPageState.erasingShapeIds.length) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.erasingShapeIds = erasingShapeIds
			}

			if (prevPageState.hoveredShapeId && shapesNoLongerInPage.has(prevPageState.hoveredShapeId)) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.hoveredShapeId = null
			}

			if (prevPageState.editingShapeId && shapesNoLongerInPage.has(prevPageState.editingShapeId)) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.editingShapeId = null
			}

			const hintingShapeIds = prevPageState.hintingShapeIds.filter(
				(id) => !shapesNoLongerInPage.has(id)
			)
			if (hintingShapeIds.length !== prevPageState.hintingShapeIds.length) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.hintingShapeIds = hintingShapeIds
			}

			if (prevPageState.focusedGroupId && shapesNoLongerInPage.has(prevPageState.focusedGroupId)) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.focusedGroupId = null
			}
			return nextPageState
		}

		this.sideEffects = new SideEffectManager(this)

		this.sideEffects.registerBatchCompleteHandler(() => {
			for (const parentId of invalidParents) {
				invalidParents.delete(parentId)
				const parent = this.getShape(parentId)
				if (!parent) continue

				const util = this.getShapeUtil(parent)
				const changes = util.onChildrenChange?.(parent)

				if (changes?.length) {
					this.updateShapes(changes, { squashing: true })
				}
			}

			this.emit('update')
		})

		this.sideEffects.registerBeforeDeleteHandler('shape', (record) => {
			// if the deleted shape has a parent shape make sure we call it's onChildrenChange callback
			if (record.parentId && isShapeId(record.parentId)) {
				invalidParents.add(record.parentId)
			}
			// clean up any arrows bound to this shape
			const bindings = this._arrowBindingsIndex.value[record.id]
			if (bindings?.length) {
				for (const { arrowId, handleId } of bindings) {
					const arrow = this.getShape<TLArrowShape>(arrowId)
					if (!arrow) continue
					unbindArrowTerminal(arrow, handleId)
				}
			}
			const deletedIds = new Set([record.id])
			const updates = compact(
				this.pageStates.map((pageState) => {
					return cleanupInstancePageState(pageState, deletedIds)
				})
			)

			if (updates.length) {
				this.store.put(updates)
			}
		})

		this.sideEffects.registerBeforeDeleteHandler('page', (record) => {
			// page was deleted, need to check whether it's the current page and select another one if so
			if (this.instanceState.currentPageId !== record.id) return

			const backupPageId = this.pages.find((p) => p.id !== record.id)?.id
			if (!backupPageId) return
			this.store.put([{ ...this.instanceState, currentPageId: backupPageId }])

			// delete the camera and state for the page if necessary
			const cameraId = CameraRecordType.createId(record.id)
			const instance_PageStateId = InstancePageStateRecordType.createId(record.id)
			this.store.remove([cameraId, instance_PageStateId])
		})

		this.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
			if (this.isShapeOfType<TLArrowShape>(next, 'arrow')) {
				arrowDidUpdate(next)
			}

			// if the shape's parent changed and it is bound to an arrow, update the arrow's parent
			if (prev.parentId !== next.parentId) {
				const reparentBoundArrows = (id: TLShapeId) => {
					const boundArrows = this._arrowBindingsIndex.value[id]
					if (boundArrows?.length) {
						for (const arrow of boundArrows) {
							reparentArrow(arrow.arrowId)
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
					const nextPageState = cleanupInstancePageState(instancePageState, allMovingIds)

					if (nextPageState) {
						this.store.put([nextPageState])
					}
				}
			}

			if (prev.parentId && isShapeId(prev.parentId)) {
				invalidParents.add(prev.parentId)
			}

			if (next.parentId !== prev.parentId && isShapeId(next.parentId)) {
				invalidParents.add(next.parentId)
			}
		})

		this.sideEffects.registerAfterChangeHandler('instance_page_state', (prev, next) => {
			if (prev?.selectedShapeIds !== next?.selectedShapeIds) {
				// ensure that descendants and ancestors are not selected at the same time
				const filtered = next.selectedShapeIds.filter((id) => {
					let parentId = this.getShape(id)?.parentId
					while (isShapeId(parentId)) {
						if (next.selectedShapeIds.includes(parentId)) {
							return false
						}
						parentId = this.getShape(parentId)?.parentId
					}
					return true
				})

				let nextFocusedGroupId: null | TLShapeId = null

				if (filtered.length > 0) {
					const commonGroupAncestor = this.findCommonAncestor(
						compact(filtered.map((id) => this.getShape(id))),
						(shape) => this.isShapeOfType<TLGroupShape>(shape, 'group')
					)

					if (commonGroupAncestor) {
						nextFocusedGroupId = commonGroupAncestor
					}
				} else {
					if (next?.focusedGroupId) {
						nextFocusedGroupId = next.focusedGroupId
					}
				}

				if (
					filtered.length !== next.selectedShapeIds.length ||
					nextFocusedGroupId !== next.focusedGroupId
				) {
					this.store.put([
						{ ...next, selectedShapeIds: filtered, focusedGroupId: nextFocusedGroupId ?? null },
					])
				}
			}
		})

		this.sideEffects.registerAfterCreateHandler('shape', (record) => {
			if (this.isShapeOfType<TLArrowShape>(record, 'arrow')) {
				arrowDidUpdate(record)
			}
		})

		this.sideEffects.registerAfterCreateHandler('page', (record) => {
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
		})

		this._currentPageShapeIds = deriveShapeIdsInCurrentPage(this.store, () => this.currentPageId)
		this._parentIdsToChildIds = parentsToChildren(this.store)

		this.disposables.add(
			this.store.listen((changes) => {
				this.emit('change', changes)
			})
		)

		this.store.ensureStoreIsUsable()

		// clear ephemeral state
		this._setInstancePageState(
			{
				editingShapeId: null,
				hoveredShapeId: null,
				erasingShapeIds: [],
			},
			{ ephemeral: true }
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
	 * A manager for the editor's environment.
	 *
	 * @public
	 */
	readonly environment: EnvironmentManager

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
	 * A manager for side effects and correct state enforcement.
	 *
	 * @public
	 */
	readonly sideEffects: SideEffectManager<this>

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
		// () => this._complete(),
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
	undo(): this {
		this.history.undo()
		return this
	}

	/**
	 * Whether the app can undo.
	 *
	 * @public
	 */
	@computed get canUndo(): boolean {
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
	redo(): this {
		this.history.redo()
		return this
	}

	/**
	 * Whether the app can redo.
	 *
	 * @public
	 */
	@computed get canRedo(): boolean {
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
	 * @param onUndo - (optional) Whether to stop at the mark when undoing.
	 * @param onRedo - (optional) Whether to stop at the mark when redoing.
	 *
	 * @public
	 */
	mark(markId?: string, onUndo?: boolean, onRedo?: boolean): this {
		this.history.mark(markId, onUndo, onRedo)
		return this
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
	bailToMark(id: string): this {
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
	 * 	editor.deleteShapes(editor.selectedShapeIds)
	 * 	editor.createShapes(myShapes)
	 * 	editor.selectNone()
	 * })
	 *
	 * editor.undo() // will undo all of the above
	 * ```
	 *
	 * @public
	 */
	batch(fn: () => void): this {
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

	@computed
	private get arrowInfoCache() {
		return this.store.createComputedCache<TLArrowInfo, TLArrowShape>('arrow infoCache', (shape) => {
			return getIsArrowStraight(shape)
				? getStraightArrowInfo(this, shape)
				: getCurvedArrowInfo(this, shape)
		})
	}

	/**
	 * Get cached info about an arrow.
	 *
	 * @example
	 * ```ts
	 * const arrowInfo = editor.getArrowInfo(myArrow)
	 * ```
	 *
	 * @param shape - The shape (or shape id) of the arrow to get the info for.
	 *
	 * @public
	 */
	getArrowInfo(shape: TLArrowShape | TLShapeId): TLArrowInfo | undefined {
		const id = typeof shape === 'string' ? shape : shape.id
		return this.arrowInfoCache.get(id)
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
	): this {
		const defaultAnnotations = this.createErrorAnnotations(origin, willCrashApp)
		annotateError(error, {
			tags: { ...defaultAnnotations.tags, ...tags },
			extras: { ...defaultAnnotations.extras, ...extras },
		})
		if (willCrashApp) {
			this.store.markAsPossiblyCorrupted()
		}
		return this
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
					editingShape: this.editingShapeId ? this.getShape(this.editingShapeId) : undefined,
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
	crash(error: unknown): this {
		this._crashingError = error
		this.store.markAsPossiblyCorrupted()
		this.emit('crash', { error })
		return this
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
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	updateInstanceState(
		partial: Partial<Omit<TLInstance, 'currentPageId'>>,
		historyOptions?: TLCommandHistoryOptions
	): this {
		this._updateInstanceState(partial, { ephemeral: true, squashing: true, ...historyOptions })

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
		(
			partial: Partial<Omit<TLInstance, 'currentPageId'>>,
			historyOptions?: TLCommandHistoryOptions
		) => {
			const prev = this.store.get(this.instanceState.id)!
			const next = { ...prev, ...partial }

			return {
				data: { prev, next },
				ephemeral: false,
				squashing: false,
				...historyOptions,
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

	/* --------------------- Cursor --------------------- */

	/**
	 * Set the cursor.
	 *
	 * @param type - The cursor type.
	 * @param rotation - The cursor rotation.
	 *
	 * @public
	 */
	setCursor = (cursor: Partial<TLCursor>): this => {
		this.updateInstanceState(
			{ cursor: { ...this.instanceState.cursor, ...cursor } },
			{ ephemeral: true }
		)
		return this
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
	 * editor.updateInstancePageState({ id: 'page1', editingShapeId: 'shape:123' })
	 * editor.updateInstancePageState({ id: 'page1', editingShapeId: 'shape:123' }, { ephemeral: true })
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	updateCurrentPageState(
		partial: Partial<
			Omit<TLInstancePageState, 'selectedShapeIds' | 'editingShapeId' | 'pageId' | 'focusedGroupId'>
		>,
		historyOptions?: TLCommandHistoryOptions
	): this {
		this._setInstancePageState(partial, historyOptions)
		return this
	}

	/** @internal */
	private _setInstancePageState = this.history.createCommand(
		'setInstancePageState',
		(
			partial: Partial<Omit<TLInstancePageState, 'selectedShapeIds'>>,
			historyOptions?: TLCommandHistoryOptions
		) => {
			const prev = this.store.get(partial.id ?? this.currentPageState.id)!
			return { data: { prev, partial }, ...historyOptions }
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
	@computed get selectedShapeIds() {
		return this.currentPageState.selectedShapeIds
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
		const { selectedShapeIds } = this.currentPageState
		return compact(selectedShapeIds.map((id) => this.store.get(id)))
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setSelectedShapes(['id1'])
	 * editor.setSelectedShapes(['id1', 'id2'])
	 * ```
	 *
	 * @param ids - The ids to select.
	 * @param historyOptions - The history options for the change.
	 *
	 * @public
	 */
	setSelectedShapes(
		shapes: TLShapeId[] | TLShape[],
		historyOptions?: TLCommandHistoryOptions
	): this {
		const ids = shapes.map((shape) => (typeof shape === 'string' ? shape : shape.id))
		this._setSelectedShapes(ids, historyOptions)
		return this
	}

	/** @internal */
	private _setSelectedShapes = this.history.createCommand(
		'setSelectedShapes',
		(ids: TLShapeId[], historyOptions?: TLCommandHistoryOptions) => {
			const { selectedShapeIds: prevSelectedShapeIds } = this.currentPageState
			const prevSet = new Set(prevSelectedShapeIds)

			if (ids.length === prevSet.size && ids.every((id) => prevSet.has(id))) return null

			return {
				data: { selectedShapeIds: ids, prevSelectedShapeIds },
				preservesRedoStack: true,
				...historyOptions,
			}
		},
		{
			do: ({ selectedShapeIds }) => {
				this.store.put([{ ...this.currentPageState, selectedShapeIds }])
			},
			undo: ({ prevSelectedShapeIds }) => {
				this.store.put([
					{
						...this.currentPageState,
						selectedShapeIds: prevSelectedShapeIds,
					},
				])
			},
			squash({ prevSelectedShapeIds }, { selectedShapeIds }) {
				return {
					selectedShapeIds,
					prevSelectedShapeIds,
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
	isAncestorSelected(shape: TLShape | TLShapeId): boolean {
		const id = typeof shape === 'string' ? shape : shape?.id ?? null
		const _shape = this.getShape(id)
		if (!_shape) return false
		const { selectedShapeIds } = this
		return !!this.findShapeAncestor(_shape, (parent) => selectedShapeIds.includes(parent.id))
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
	select(...shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((shape) => shape.id)
		this.setSelectedShapes(ids)
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
	deselect(...shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((shape) => shape.id)
		const { selectedShapeIds } = this
		if (selectedShapeIds.length > 0 && ids.length > 0) {
			this.setSelectedShapes(selectedShapeIds.filter((id) => !ids.includes(id)))
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
	selectAll(): this {
		const ids = this.getSortedChildIdsForParent(this.currentPageId)
		// page might have no shapes
		if (ids.length <= 0) return this
		this.setSelectedShapes(this._getUnlockedShapeIds(ids))

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
		if (this.selectedShapeIds.length > 0) {
			this.setSelectedShapes([])
		}

		return this
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
	 * The current page bounds of all the selected shapes. If the
	 * selection is rotated, then these bounds are the axis-aligned
	 * box that the rotated bounds would fit inside of.
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get selectionPageBounds(): Box2d | null {
		const {
			currentPageState: { selectedShapeIds },
		} = this

		if (selectedShapeIds.length === 0) return null

		return Box2d.Common(compact(selectedShapeIds.map((id) => this.getShapePageBounds(id))))
	}

	/**
	 * The rotation of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionRotation(): number {
		const { selectedShapeIds } = this
		if (selectedShapeIds.length === 0) {
			return 0
		}
		if (selectedShapeIds.length === 1) {
			return this.getShapePageTransform(this.selectedShapeIds[0])!.rotation()
		}

		const allRotations = selectedShapeIds.map((id) => this.getShapePageTransform(id)!.rotation())
		// if the rotations are all compatible with each other, return the rotation of any one of them
		if (allRotations.every((rotation) => Math.abs(rotation - allRotations[0]) < Math.PI / 180)) {
			return this.getShapePageTransform(selectedShapeIds[0])!.rotation()
		}
		return 0
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionRotatedPageBounds(): Box2d | undefined {
		const { selectedShapeIds } = this

		if (selectedShapeIds.length === 0) {
			return undefined
		}

		const { selectionRotation } = this
		if (selectionRotation === 0) {
			return this.selectionPageBounds!
		}

		if (selectedShapeIds.length === 1) {
			const bounds = this.getShapeGeometry(selectedShapeIds[0]).bounds.clone()
			const pageTransform = this.getShapePageTransform(selectedShapeIds[0])!
			bounds.point = pageTransform.applyToPoint(bounds.point)
			return bounds
		}

		// need to 'un-rotate' all the outlines of the existing nodes so we can fit them inside a box
		const boxFromRotatedVertices = Box2d.FromPoints(
			this.selectedShapeIds
				.flatMap((id) => {
					const pageTransform = this.getShapePageTransform(id)
					if (!pageTransform) return []
					return pageTransform.applyToPoints(this.getShapeGeometry(id).vertices)
				})
				.map((p) => Vec2d.Rot(p, -selectionRotation))
		)
		// now position box so that it's top-left corner is in the right place
		boxFromRotatedVertices.point = boxFromRotatedVertices.point.rot(selectionRotation)
		return boxFromRotatedVertices
	}

	// Focus Group

	/**
	 * The current focused group id.
	 *
	 * @public
	 */
	@computed get focusedGroupId(): TLShapeId | TLPageId {
		return this.currentPageState.focusedGroupId ?? this.currentPageId
	}

	/**
	 * The current focused group.
	 *
	 * @public
	 */
	@computed get focusedGroup(): TLShape | undefined {
		const { focusedGroupId } = this
		return focusedGroupId ? this.getShape(focusedGroupId) : undefined
	}

	/**
	 * Set the current focused group shape.
	 *
	 * @param shape - The group shape id (or group shape's id) to set as the focused group shape.
	 *
	 * @public
	 */
	setFocusedGroup(shape: TLShapeId | TLGroupShape | null): this {
		const id = typeof shape === 'string' ? shape : shape?.id ?? null

		if (id !== null) {
			const shape = this.getShape(id)
			if (!shape) {
				throw Error(`Editor.setFocusedGroup: Shape with id ${id} does not exist`)
			}

			if (!this.isShapeOfType<TLGroupShape>(shape, 'group')) {
				throw Error(
					`Editor.setFocusedGroup: Cannot set focused group to shape of type ${shape.type}`
				)
			}
		}

		if (id === this.focusedGroupId) return this
		this._setFocusedGroupId(id)
		return this
	}

	/** @internal */
	private _setFocusedGroupId = this.history.createCommand(
		'setFocusedGroupId',
		(next: TLShapeId | null) => {
			const prev = this.currentPageState.focusedGroupId
			if (prev === next) return
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
				this.store.update(this.currentPageState.id, (s) => ({ ...s, focusedGroupId: next }))
			},
			undo: ({ prev }) => {
				this.store.update(this.currentPageState.id, (s) => ({ ...s, focusedGroupId: prev }))
			},
			squash({ prev }, { next }) {
				return { prev, next }
			},
		}
	)

	/**
	 * Exit the current focused group, moving up to the next parent group if there is one.
	 *
	 * @public
	 */
	popFocusedGroupId(): this {
		const { focusedGroup } = this

		if (focusedGroup) {
			// If we have a focused layer, look for an ancestor of the focused shape that is a group
			const match = this.findShapeAncestor(focusedGroup, (shape) =>
				this.isShapeOfType<TLGroupShape>(shape, 'group')
			)
			// If we have an ancestor that can become a focused layer, set it as the focused layer
			this.setFocusedGroup(match?.id ?? null)
			this.select(focusedGroup.id)
		} else {
			// If there's no parent focused group, then clear the focus layer and clear selection
			this.setFocusedGroup(null)
			this.selectNone()
		}

		return this
	}

	/**
	 * The current editing shape's id.
	 *
	 * @public
	 */
	@computed get editingShapeId() {
		return this.currentPageState.editingShapeId
	}

	/**
	 * The current editing shape.
	 *
	 * @public
	 */
	@computed get editingShape(): TLShape | undefined {
		const { editingShapeId } = this
		return editingShapeId ? this.getShape(editingShapeId) : undefined
	}

	/**
	 * Set the current editing shape.
	 *
	 * @example
	 * ```ts
	 * editor.setEditingShape(myShape)
	 * editor.setEditingShape(myShape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to set as editing.
	 *
	 * @public
	 */
	setEditingShape(shape: TLShapeId | TLShape | null): this {
		const id = typeof shape === 'string' ? shape : shape?.id ?? null
		if (id !== this.editingShapeId) {
			if (id) {
				const shape = this.getShape(id)
				if (shape && this.getShapeUtil(shape).canEdit(shape)) {
					this._setInstancePageState({ editingShapeId: id })
					return this
				}
			}

			// Either we just set the editing id to null, or the shape was missing or not editable
			this._setInstancePageState({ editingShapeId: null })
		}
		return this
	}

	// Hovered

	/**
	 * The current hovered shape id.
	 *
	 * @readonly
	 * @public
	 */
	@computed get hoveredShapeId() {
		return this.currentPageState.hoveredShapeId
	}

	/**
	 * The current hovered shape.
	 *
	 * @public
	 */
	@computed get hoveredShape(): TLShape | undefined {
		const { hoveredShapeId } = this
		return hoveredShapeId ? this.getShape(hoveredShapeId) : undefined
	}

	/**
	 * Set the editor's current hovered shape.
	 *
	 * @example
	 * ```ts
	 * editor.setHoveredShape(myShape)
	 * editor.setHoveredShape(myShape.id)
	 * ```
	 *
	 * @param shapes - The shape (or shape id) to set as hovered.
	 *
	 * @public
	 */
	setHoveredShape(shape: TLShapeId | TLShape | null): this {
		const id = typeof shape === 'string' ? shape : shape?.id ?? null
		if (id === this.hoveredShapeId) return this
		this.updateCurrentPageState({ hoveredShapeId: id }, { ephemeral: true })
		return this
	}

	// Hinting

	/**
	 * The editor's current hinting shape ids.
	 *
	 * @public
	 */
	@computed get hintingShapeIds() {
		return this.currentPageState.hintingShapeIds
	}

	/**
	 * The editor's current hinting shapes.
	 *
	 * @public
	 */
	@computed get hintingShapes() {
		const { hintingShapeIds } = this
		return compact(hintingShapeIds.map((id) => this.getShape(id)))
	}

	/**
	 * Set the editor's current hinting shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setHintingShapes([myShape])
	 * editor.setHintingShapes([myShape.id])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to set as hinting.
	 *
	 * @public
	 */
	setHintingShapes(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((shape) => shape.id)
		// always ephemeral
		this.updateCurrentPageState({ hintingShapeIds: dedupe(ids) }, { ephemeral: true })
		return this
	}

	// Erasing

	/**
	 * The editor's current erasing ids.
	 *
	 * @public
	 */
	@computed get erasingShapeIds() {
		return this.currentPageState.erasingShapeIds
	}

	/**
	 * The editor's current hinting shapes.
	 *
	 * @public
	 */
	@computed get erasingShapes() {
		const { erasingShapeIds } = this
		return compact(erasingShapeIds.map((id) => this.getShape(id)))
	}

	/**
	 * Set the editor's current erasing shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setErasingShapes([myShape])
	 * editor.setErasingShapes([myShape.id])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to set as hinting.
	 *
	 * @public
	 */
	setErasingShapes(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((shape) => shape.id)
		ids.sort() // sort the incoming ids
		const { erasingShapeIds } = this
		if (ids.length === erasingShapeIds.length) {
			// if the new ids are the same length as the current ids, they might be the same.
			// presuming the current ids are also sorted, check each item to see if it's the same;
			// if we find any unequal, then we know the new ids are different.
			for (let i = 0; i < ids.length; i++) {
				if (ids[i] !== erasingShapeIds[i]) {
					this._setInstancePageState({ erasingShapeIds: ids }, { ephemeral: true })
					break
				}
			}
		} else {
			// if the ids are a different length, then we know they're different.
			this._setInstancePageState({ erasingShapeIds: ids }, { ephemeral: true })
		}

		return this
	}

	// Cropping

	/**
	 * The current cropping shape's id.
	 *
	 * @public
	 */
	get croppingShapeId() {
		return this.currentPageState.croppingShapeId
	}

	/**
	 * Set the current cropping shape.
	 *
	 * @example
	 * ```ts
	 * editor.setCroppingShape(myShape)
	 * editor.setCroppingShape(myShape.id)
	 * ```
	 *
	 *
	 * @param shape - The shape (or shape id) to set as cropping.
	 *
	 * @public
	 */
	setCroppingShape(shape: TLShapeId | TLShape | null): this {
		const id = typeof shape === 'string' ? shape : shape?.id ?? null
		if (id !== this.croppingShapeId) {
			if (!id) {
				this.updateCurrentPageState({ croppingShapeId: null })
			} else {
				const shape = this.getShape(id)!
				const util = this.getShapeUtil(shape)
				if (shape && util.canCrop(shape)) {
					this.updateCurrentPageState({ croppingShapeId: id })
				}
			}
		}
		return this
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
	private _setCamera(point: VecLike): this {
		const currentCamera = this.camera

		if (currentCamera.x === point.x && currentCamera.y === point.y && currentCamera.z === point.z) {
			return this
		}

		this.batch(() => {
			this.store.put([{ ...currentCamera, ...point }]) // include id and meta here

			// Dispatch a new pointer move because the pointer's page will have changed
			// (its screen position will compute to a new page position given the new camera position)
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
	 * editor.setCamera({ x: 0, y: 0})
	 * editor.setCamera({ x: 0, y: 0, z: 1.5})
	 * editor.setCamera({ x: 0, y: 0, z: 1.5}, { duration: 1000, easing: (t) => t * t })
	 * ```
	 *
	 * @param point - The new camera position.
	 * @param animation - (optional) Options for an animation.
	 *
	 * @public
	 */
	setCamera(point: VecLike, animation?: TLAnimationOptions): this {
		const x = Number.isFinite(point.x) ? point.x : 0
		const y = Number.isFinite(point.y) ? point.y : 0
		const z = Number.isFinite(point.z) ? point.z! : this.zoomLevel

		// Stop any camera animations
		this.stopCameraAnimation()

		// Stop following any user
		if (this.instanceState.followingUserId) {
			this.stopFollowingUser()
		}

		if (animation) {
			const { width, height } = this.viewportScreenBounds
			return this._animateToViewport(new Box2d(-x, -y, width / z, height / z), animation)
		} else {
			this._setCamera({ x, y, z })
		}

		return this
	}

	/**
	 * Center the camera on a point (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.centerOnPoint({ x: 100, y: 100 })
	 * editor.centerOnPoint({ x: 100, y: 100 }, { duration: 200 })
	 * ```
	 *
	 * @param point - The point in the current page space to center on.
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	centerOnPoint(point: VecLike, animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const {
			viewportPageBounds: { width: pw, height: ph },
			camera,
		} = this

		this.setCamera({ x: -(point.x - pw / 2), y: -(point.y - ph / 2), z: camera.z }, animation)
		return this
	}

	/**
	 * Move the camera to the nearest content.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToContent()
	 * editor.zoomToContent({ duration: 200 })
	 * ```
	 *
	 * @param opts - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomToContent(): this {
		const bounds = this.selectionPageBounds ?? this.currentPageBounds

		if (bounds) {
			this.zoomToBounds(bounds, Math.min(1, this.zoomLevel), { duration: 220 })
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToFit()
	 * editor.zoomToFit({ duration: 200 })
	 * ```
	 *
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomToFit(animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const ids = [...this.currentPageShapeIds]
		if (ids.length <= 0) return this

		const pageBounds = Box2d.Common(compact(ids.map((id) => this.getShapePageBounds(id))))
		this.zoomToBounds(pageBounds, undefined, animation)
		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.resetZoom()
	 * editor.resetZoom(editor.viewportScreenCenter)
	 * editor.resetZoom(editor.viewportScreenCenter, { duration: 200 })
	 * ```
	 *
	 * @param point - (optional) The screen point to zoom out on. Defaults to the viewport screen center.
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	resetZoom(point = this.viewportScreenCenter, animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera
		const { x, y } = point
		this.setCamera(
			{ x: cx + (x / 1 - x) - (x / cz - x), y: cy + (y / 1 - y) - (y / cz - y), z: 1 },
			animation
		)

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
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomIn(point = this.viewportScreenCenter, animation?: TLAnimationOptions): this {
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
		this.setCamera(
			{ x: cx + (x / zoom - x) - (x / cz - x), y: cy + (y / zoom - y) - (y / cz - y), z: zoom },
			animation
		)

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
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomOut(point = this.viewportScreenCenter, animation?: TLAnimationOptions): this {
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

		this.setCamera(
			{
				x: cx + (x / zoom - x) - (x / cz - x),
				y: cy + (y / zoom - y) - (y / cz - y),
				z: zoom,
			},
			animation
		)

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
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomToSelection(animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { selectionPageBounds } = this
		if (!selectionPageBounds) return this

		this.zoomToBounds(selectionPageBounds, Math.max(1, this.zoomLevel), animation)

		return this
	}

	/**
	 * Pan or pan/zoom the selected ids into view. This method tries to not change the zoom if possible.
	 *
	 * @param ids - The ids of the shapes to pan and zoom into view.
	 * @param animation - The options for an animation.
	 *
	 * @public
	 */
	panZoomIntoView(ids: TLShapeId[], animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		if (ids.length <= 0) return this
		const selectionBounds = Box2d.Common(compact(ids.map((id) => this.getShapePageBounds(id))))

		const { viewportPageBounds } = this

		if (viewportPageBounds.h < selectionBounds.h || viewportPageBounds.w < selectionBounds.w) {
			this.zoomToBounds(selectionBounds, this.camera.z, animation)

			return this
		} else {
			const insetViewport = this.viewportPageBounds.clone().expandBy(-32 / this.zoomLevel)

			let offsetX = 0
			let offsetY = 0
			if (insetViewport.maxY < selectionBounds.maxY) {
				// off bottom
				offsetY = insetViewport.maxY - selectionBounds.maxY
			} else if (insetViewport.minY > selectionBounds.minY) {
				// off top
				offsetY = insetViewport.minY - selectionBounds.minY
			} else {
				// inside y-bounds
			}

			if (insetViewport.maxX < selectionBounds.maxX) {
				// off right
				offsetX = insetViewport.maxX - selectionBounds.maxX
			} else if (insetViewport.minX > selectionBounds.minX) {
				// off left
				offsetX = insetViewport.minX - selectionBounds.minX
			} else {
				// inside x-bounds
			}

			const { camera } = this
			this.setCamera({ x: camera.x + offsetX, y: camera.y + offsetY, z: camera.z }, animation)
		}

		return this
	}

	/**
	 * Zoom the camera to fit a bounding box (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.zoomToBounds(myBounds)
	 * editor.zoomToBounds(myBounds, 1)
	 * editor.zoomToBounds(myBounds, 1, { duration: 100 })
	 * ```
	 *
	 * @param bounds - The bounding box.
	 * @param targetZoom - The desired zoom level. Defaults to 0.1.
	 * @param animation - (optional) The options for an animation.
	 *
	 * @public
	 */
	zoomToBounds(bounds: Box2d, targetZoom?: number, animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this

		const { viewportScreenBounds } = this

		const inset = Math.min(256, viewportScreenBounds.width * 0.28)

		let zoom = clamp(
			Math.min(
				(viewportScreenBounds.width - inset) / bounds.width,
				(viewportScreenBounds.height - inset) / bounds.height
			),
			MIN_ZOOM,
			MAX_ZOOM
		)

		if (targetZoom !== undefined) {
			zoom = Math.min(targetZoom, zoom)
		}

		this.setCamera(
			{
				x: -bounds.minX + (viewportScreenBounds.width - bounds.width * zoom) / 2 / zoom,
				y: -bounds.minY + (viewportScreenBounds.height - bounds.height * zoom) / 2 / zoom,
				z: zoom,
			},
			animation
		)

		return this
	}

	/**
	 * Pan the camera.
	 *
	 * @example
	 * ```ts
	 * editor.pan({ x: 100, y: 100 })
	 * editor.pan({ x: 100, y: 100 }, { duration: 1000 })
	 * ```
	 *
	 * @param offset - The offset in the current page space.
	 * @param animation - (optional) The animation options.
	 */
	pan(offset: VecLike, animation?: TLAnimationOptions): this {
		if (!this.instanceState.canMoveCamera) return this
		const { x: cx, y: cy, z: cz } = this.camera
		this.setCamera({ x: cx + offset.x / cz, y: cy + offset.y / cz, z: cz }, animation)
		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @public
	 */
	stopCameraAnimation(): this {
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
			this._setCamera({ x: -end.x, y: -end.y, z: this.viewportScreenBounds.width / end.width })
			cancel()
			return
		}

		const remaining = duration - elapsed
		const t = easing(1 - remaining / duration)

		const left = start.minX + (end.minX - start.minX) * t
		const top = start.minY + (end.minY - start.minY) * t
		const right = start.maxX + (end.maxX - start.maxX) * t

		this._setCamera({ x: -left, y: -top, z: this.viewportScreenBounds.width / (right - left) })
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
			return this._setCamera({
				x: -targetViewportPage.x,
				y: -targetViewportPage.y,
				z: this.viewportScreenBounds.width / targetViewportPage.width,
			})
		}

		// Set our viewport animation
		this._viewportAnimation = {
			elapsed: 0,
			duration: duration / animationSpeed,
			easing,
			start: viewportPageBounds.clone(),
			end: targetViewportPage.clone(),
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
			direction: VecLike
			friction: number
			speedThreshold?: number
		}
	): this {
		if (!this.instanceState.canMoveCamera) return this

		this.stopCameraAnimation()

		const { animationSpeed } = this.user

		if (animationSpeed === 0) return this

		const { speed, friction, direction, speedThreshold = 0.01 } = opts
		let currentSpeed = Math.min(speed, 1)

		const cancel = () => {
			this.removeListener('tick', moveCamera)
			this.removeListener('stop-camera-animation', cancel)
		}

		this.once('stop-camera-animation', cancel)

		const moveCamera = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.camera
			const movementVec = Vec2d.Mul(direction, (currentSpeed * elapsed) / cz)

			// Apply friction
			currentSpeed *= 1 - friction
			if (currentSpeed < speedThreshold) {
				cancel()
			} else {
				this._setCamera({ x: cx + movementVec.x, y: cy + movementVec.y, z: cz })
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
	animateToUser(userId: string): this {
		const presences = this.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const presence = [...presences.value]
			.sort((a, b) => {
				return a.lastActivityTimestamp - b.lastActivityTimestamp
			})
			.pop()

		if (!presence) return this

		this.batch(() => {
			// If we're following someone, stop following them
			if (this.instanceState.followingUserId !== null) {
				this.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.currentPageId
			if (!isOnSamePage) {
				this.setCurrentPage(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			const options = isOnSamePage ? { duration: 500 } : undefined

			this.centerOnPoint(presence.cursor, options)

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

		return this
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

		const shapePageBounds = this.getShapePageBounds(shapeId)

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

	/** @internal */
	private _willSetInitialBounds = true

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
	updateViewportScreenBounds(center = false): this {
		const container = this.getContainer()

		if (!container) return this
		const rect = container.getBoundingClientRect()
		const screenBounds = new Box2d(
			rect.left || rect.x,
			rect.top || rect.y,
			Math.max(rect.width, 1),
			Math.max(rect.height, 1)
		)
		const boundsAreEqual = screenBounds.equals(this.viewportScreenBounds)

		const { _willSetInitialBounds } = this

		if (boundsAreEqual) {
			this._willSetInitialBounds = false
		} else {
			if (_willSetInitialBounds) {
				// If we have just received the initial bounds, don't center the camera.
				this._willSetInitialBounds = false
				this.updateInstanceState(
					{ screenBounds: screenBounds.toJson() },
					{ squashing: true, ephemeral: true }
				)
			} else {
				if (center && !this.instanceState.followingUserId) {
					// Get the page center before the change, make the change, and restore it
					const before = this.viewportPageCenter
					this.updateInstanceState(
						{ screenBounds: screenBounds.toJson() },
						{ squashing: true, ephemeral: true }
					)
					this.centerOnPoint(before)
				} else {
					// Otherwise,
					this.updateInstanceState(
						{ screenBounds: screenBounds.toJson() },
						{ squashing: true, ephemeral: true }
					)
				}
			}
		}

		this._tickCameraState()
		this.updateRenderingBounds()

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
	 * The current viewport in the current page space.
	 *
	 * @public
	 */
	@computed get viewportPageBounds() {
		const { w, h } = this.viewportScreenBounds
		const { x: cx, y: cy, z: cz } = this.camera
		return new Box2d(-cx, -cy, w / cz, h / cz)
	}

	/**
	 * The center of the viewport in the current page space.
	 *
	 * @public
	 */
	@computed get viewportPageCenter() {
		return this.viewportPageBounds.center
	}

	/**
	 * Convert a point in screen space to a point in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.screenToPage({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in screen space.
	 *
	 * @public
	 */
	screenToPage(point: VecLike) {
		const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.camera
		return {
			x: (point.x - screenBounds.x) / cz - cx,
			y: (point.y - screenBounds.y) / cz - cy,
			z: point.z ?? 0.5,
		}
	}

	/**
	 * Convert a point in the current page space to a point in current screen space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToScreen({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in screen space.
	 *
	 * @public
	 */
	pageToScreen(point: VecLike) {
		const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = this.camera

		return {
			x: (point.x + cx) * cz + screenBounds.x,
			y: (point.y + cy) * cz + screenBounds.y,
			z: point.z ?? 0.5,
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
	startFollowingUser(userId: string): this {
		const leaderPresences = this.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const thisUserId = this.user.id

		if (!thisUserId) {
			console.warn('You should set the userId for the current instance before following a user')
		}

		// If the leader is following us, then we can't follow them
		if (leaderPresences.value.some((p) => p.followingUserId === thisUserId)) {
			return this
		}

		transact(() => {
			this.stopFollowingUser()

			this.updateInstanceState({ followingUserId: userId }, { ephemeral: true })
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
				this.stopFollowingUser()
				this.setCurrentPage(leaderPresence.currentPageId)
				this.startFollowingUser(userId)
				return
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
			this._setCamera({
				x: -(targetCenter.x - targetWidth / 2),
				y: -(targetCenter.y - targetHeight / 2),
				z: targetZoom,
			})
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
	stopFollowingUser(): this {
		this.updateInstanceState({ followingUserId: null }, { ephemeral: true })
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

	private getUnorderedRenderingShapes(
		// The rendering state. We use this method both for rendering, which
		// is based on other state, and for computing order for SVG export,
		// which should work even when things are for example off-screen.
		useEditorState: boolean
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
			maskedPageBounds: Box2d | undefined
		}[] = []

		let nextIndex = MAX_SHAPES_PER_PAGE * 2
		let nextBackgroundIndex = MAX_SHAPES_PER_PAGE

		// We only really need these if we're using editor state, but that's ok
		const editingShapeId = this.editingShapeId
		const selectedShapeIds = this.selectedShapeIds
		const erasingShapeIds = this.erasingShapeIds
		const renderingBoundsExpanded = this.renderingBoundsExpanded

		// If renderingBoundsMargin is set to Infinity, then we won't cull offscreen shapes
		const isCullingOffScreenShapes = Number.isFinite(this.renderingBoundsMargin)

		const addShapeById = (id: TLShapeId, opacity: number, isAncestorErasing: boolean) => {
			const shape = this.getShape(id)
			if (!shape) return

			opacity *= shape.opacity
			let isCulled = false
			let isShapeErasing = false
			const util = this.getShapeUtil(shape)
			const maskedPageBounds = this.getShapeMaskedPageBounds(id)

			if (useEditorState) {
				isShapeErasing = !isAncestorErasing && erasingShapeIds.includes(id)
				if (isShapeErasing) {
					opacity *= 0.32
				}

				isCulled =
					isCullingOffScreenShapes &&
					// only cull shapes that allow unmounting, i.e. not stateful components
					util.canUnmount(shape) &&
					// never cull editingg shapes
					editingShapeId !== id &&
					// if the shape is fully outside of its parent's clipping bounds...
					(maskedPageBounds === undefined ||
						// ...or if the shape is outside of the expanded viewport bounds...
						(!renderingBoundsExpanded.includes(maskedPageBounds) &&
							// ...and if it's not selected... then cull it
							!selectedShapeIds.includes(id)))
			}

			renderingShapes.push({
				id,
				shape,
				util,
				index: nextIndex,
				backgroundIndex: nextBackgroundIndex,
				opacity,
				isCulled,
				maskedPageBounds,
			})

			nextIndex += 1
			nextBackgroundIndex += 1

			const childIds = this.getSortedChildIdsForParent(id)
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

		for (const childId of this.getSortedChildIdsForParent(this.currentPageId)) {
			addShapeById(childId, 1, false)
		}

		return renderingShapes
	}

	/**
	 * Get the shapes that should be displayed in the current viewport.
	 *
	 * @public
	 */
	@computed get renderingShapes() {
		const renderingShapes = this.getUnorderedRenderingShapes(true)

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
	 * The current rendering bounds in the current page space, used for checking which shapes are "on screen".
	 *
	 * @public
	 */
	@computed get renderingBounds() {
		return this._renderingBounds.value
	}

	/** @internal */
	private readonly _renderingBounds = atom('rendering viewport', new Box2d())

	/**
	 * The current rendering bounds in the current page space, expanded slightly. Used for determining which shapes
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

		if (Number.isFinite(this.renderingBoundsMargin)) {
			this._renderingBoundsExpanded.set(
				viewportPageBounds.clone().expandBy(this.renderingBoundsMargin / this.zoomLevel)
			)
		} else {
			this._renderingBoundsExpanded.set(viewportPageBounds)
		}
		return this
	}

	/**
	 * The distance to expand the viewport when measuring culling. A larger distance will
	 * mean that shapes near to the viewport (but still outside of it) will not be culled.
	 *
	 * @public
	 */
	renderingBoundsMargin = 100

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
	 * editor.getPage(myPage)
	 * ```
	 *
	 * @param page - The page (or page id) to get.
	 *
	 * @public
	 */
	getPage(page: TLPageId | TLPage): TLPage | undefined {
		return this.store.get(typeof page === 'string' ? page : page.id)
	}

	/* @internal */
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
	 * const idsOnPage1 = editor.getCurrentPageShapeIds('page1')
	 * const idsOnPage2 = editor.getCurrentPageShapeIds(myPage2)
	 * ```
	 *
	 * @param page - The page (or page id) to get.
	 *
	 * @public
	 **/
	getPageShapeIds(page: TLPageId | TLPage): Set<TLShapeId> {
		const pageId = typeof page === 'string' ? page : page.id
		const result = this.store.query.exec('shape', { parentId: { eq: pageId } })
		return this.getShapeAndDescendantIds(result.map((s) => s.id))
	}

	/**
	 * Set the current page.
	 *
	 * @example
	 * ```ts
	 * editor.setCurrentPage('page1')
	 * editor.setCurrentPage(myPage1)
	 * ```
	 *
	 * @param page - The page (or page id) to set as the current page.
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	setCurrentPage(page: TLPageId | TLPage, historyOptions?: TLCommandHistoryOptions): this {
		const pageId = typeof page === 'string' ? page : page.id
		this._setCurrentPageId(pageId, historyOptions)
		return this
	}
	/** @internal */
	private _setCurrentPageId = this.history.createCommand(
		'setCurrentPage',
		(pageId: TLPageId, historyOptions?: TLCommandHistoryOptions) => {
			if (!this.store.has(pageId)) {
				console.error("Tried to set the current page id to a page that doesn't exist.")
				return
			}

			this.stopFollowingUser()

			return {
				data: { toId: pageId, fromId: this.currentPageId },
				squashing: true,
				preservesRedoStack: true,
				...historyOptions,
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
	 * editor.updatePage({ id: 'page2', name: 'Page 2' }, { squashing: true })
	 * ```
	 *
	 * @param partial - The partial of the shape to update.
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	updatePage(partial: RequiredKeys<TLPage, 'id'>, historyOptions?: TLCommandHistoryOptions): this {
		this._updatePage(partial, historyOptions)
		return this
	}
	/** @internal */
	private _updatePage = this.history.createCommand(
		'updatePage',
		(partial: RequiredKeys<TLPage, 'id'>, historyOptions?: TLCommandHistoryOptions) => {
			if (this.instanceState.isReadonly) return null

			const prev = this.getPage(partial.id)

			if (!prev) return null

			return { data: { prev, partial }, ...historyOptions }
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
	 * editor.createPage(myPage)
	 * editor.createPage({ name: 'Page 2' })
	 * ```
	 *
	 * @param page - The page (or page partial) to create.
	 *
	 * @public
	 */
	createPage(page: Partial<TLPage>): this {
		this._createPage(page)
		return this
	}
	/** @internal */
	private _createPage = this.history.createCommand(
		'createPage',
		(page: Partial<TLPage>) => {
			if (this.instanceState.isReadonly) return null
			if (this.pages.length >= MAX_PAGES) return null
			const { pages } = this

			const name = getIncrementedName(
				page.name ?? 'Page',
				pages.map((p) => p.name)
			)

			let index = page.index

			if (!index || pages.some((p) => p.index === index)) {
				index = getIndexAbove(pages[pages.length - 1].index)
			}

			const newPage = PageRecordType.create({
				meta: {},
				...page,
				name,
				index,
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
					newPage,
					newTabPageState,
					newCamera,
				},
			}
		},
		{
			do: ({ newPage, newTabPageState, newCamera }) => {
				this.store.put([newPage, newCamera, newTabPageState])
			},
			undo: ({ newPage, newTabPageState, newCamera }) => {
				if (this.pages.length === 1) return
				this.store.remove([newTabPageState.id, newPage.id, newCamera.id])
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
	deletePage(page: TLPageId | TLPage): this {
		const id = typeof page === 'string' ? page : page.id
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
				this.setCurrentPage(next.id)
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
					this.setCurrentPage(next.id)
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
	duplicatePage(page: TLPageId | TLPage, createId: TLPageId = PageRecordType.createId()): this {
		if (this.pages.length >= MAX_PAGES) return this
		const id = typeof page === 'string' ? page : page.id
		const freshPage = this.getPage(id) // get the most recent version of the page anyway
		if (!freshPage) return this

		const prevCamera = { ...this.camera }
		const content = this.getContentFromCurrentPage(this.getSortedChildIdsForParent(freshPage.id))

		this.batch(() => {
			const { pages } = this
			const index = getIndexBetween(freshPage.index, pages[pages.indexOf(freshPage) + 1]?.index)

			// create the page (also creates the pagestate and camera for the new page)
			this.createPage({ name: freshPage.name + ' Copy', id: createId, index })
			// set the new page as the current page
			this.setCurrentPage(createId)
			// update the new page's camera to the previous page's camera
			this.setCamera(prevCamera)

			if (content) {
				// If we had content on the previous page, put it on the new page
				return this.putContentOntoCurrentPage(content)
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
	renamePage(page: TLPageId | TLPage, name: string, historyOptions?: TLCommandHistoryOptions) {
		const id = typeof page === 'string' ? page : page.id
		if (this.instanceState.isReadonly) return this
		this.updatePage({ id, name }, historyOptions)
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
	createAssets(assets: TLAsset[]): this {
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
	updateAssets(assets: TLAssetPartial[]): this {
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
	deleteAssets(assets: TLAssetId[] | TLAsset[]): this {
		const ids =
			typeof assets[0] === 'string'
				? (assets as TLAssetId[])
				: (assets as TLAsset[]).map((a) => a.id)
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
	 * @param asset - The asset (or asset id) to get.
	 *
	 * @public
	 */
	getAsset(asset: TLAssetId | TLAsset): TLAsset | undefined {
		return this.store.get(typeof asset === 'string' ? asset : asset.id) as TLAsset | undefined
	}

	/* --------------------- Shapes --------------------- */

	@computed
	private get _shapeGeometryCache(): ComputedCache<Geometry2d, TLShape> {
		return this.store.createComputedCache(
			'bounds',
			(shape) => this.getShapeUtil(shape).getGeometry(shape),
			(a, b) => a.props === b.props
		)
	}

	/**
	 * Get the geometry of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeGeometry(myShape)
	 * editor.getShapeGeometry(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the geometry for.
	 *
	 * @public
	 */
	getShapeGeometry<T extends Geometry2d>(shape: TLShape | TLShapeId): T {
		return this._shapeGeometryCache.get(typeof shape === 'string' ? shape : shape.id)! as T
	}

	/** @internal */
	@computed private get _shapeOutlineSegmentsCache(): ComputedCache<Vec2d[][], TLShape> {
		return this.store.createComputedCache('outline-segments', (shape) => {
			return this.getShapeUtil(shape).getOutlineSegments(shape)
		})
	}

	/**
	 * Get the local outline segments of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeOutlineSegments(myShape)
	 * editor.getShapeOutlineSegments(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the outline segments for.
	 *
	 * @public
	 */
	getShapeOutlineSegments<T extends TLShape>(shape: T | T['id']): Vec2d[][] {
		return (
			this._shapeOutlineSegmentsCache.get(typeof shape === 'string' ? shape : shape.id) ??
			EMPTY_ARRAY
		)
	}

	/** @internal */
	@computed private get _shapeHandlesCache(): ComputedCache<TLHandle[] | undefined, TLShape> {
		return this.store.createComputedCache('handles', (shape) => {
			return this.getShapeUtil(shape).getHandles?.(shape)
		})
	}

	/**
	 * Get the handles (if any) for a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeHandles(myShape)
	 * editor.getShapeHandles(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the handles for.
	 * @public
	 */
	getShapeHandles<T extends TLShape>(shape: T | T['id']): TLHandle[] | undefined {
		return this._shapeHandlesCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the local transform for a shape as a matrix model. This transform reflects both its
	 * translation (x, y) from from either its parent's top left corner, if the shape's parent is
	 * another shape, or else from the 0,0 of the page, if the shape's parent is the page; and the
	 * shape's rotation.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeLocalTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the local transform for.
	 *
	 * @public
	 */
	getShapeLocalTransform(shape: TLShape | TLShapeId): Matrix2d {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) throw Error('Editor.getTransform: shape not found')
		return Matrix2d.Identity().translate(freshShape.x, freshShape.y).rotate(freshShape.rotation)
	}

	/**
	 * A cache of page transforms.
	 *
	 * @internal
	 */
	@computed private get _shapePageTransformCache(): ComputedCache<Matrix2d, TLShape> {
		return this.store.createComputedCache<Matrix2d, TLShape>('pageTransformCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return this.getShapeLocalTransform(shape)
			}

			// If the shape's parent doesn't exist yet (e.g. when merging in changes from remote in the wrong order)
			// then we can't compute the transform yet, so just return the identity matrix.
			// In the future we should look at creating a store update mechanism that understands and preserves
			// ordering.
			const parentTransform =
				this._shapePageTransformCache.get(shape.parentId) ?? Matrix2d.Identity()
			return Matrix2d.Compose(parentTransform, this.getShapeLocalTransform(shape)!)
		})
	}

	/**
	 * Get the local transform of a shape's parent as a matrix model.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeParentTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the parent transform for.
	 *
	 * @public
	 */
	getShapeParentTransform(shape: TLShape | TLShapeId): Matrix2d {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape || isPageId(freshShape.parentId)) return Matrix2d.Identity()
		return this._shapePageTransformCache.get(freshShape.parentId) ?? Matrix2d.Identity()
	}

	/**
	 * Get the transform of a shape in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapePageTransform(myShape)
	 * editor.getShapePageTransform(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the page transform for.
	 *
	 * @public
	 */
	getShapePageTransform(shape: TLShape | TLShapeId): Matrix2d {
		const id = typeof shape === 'string' ? shape : this.getShape(shape)!.id
		return this._shapePageTransformCache.get(id) ?? Matrix2d.Identity()
	}

	/** @internal */
	@computed private get _shapePageBoundsCache(): ComputedCache<Box2d, TLShape> {
		return this.store.createComputedCache<Box2d, TLShape>('pageBoundsCache', (shape) => {
			const pageTransform = this._shapePageTransformCache.get(shape.id)

			if (!pageTransform) return new Box2d()

			const result = Box2d.FromPoints(
				Matrix2d.applyToPoints(pageTransform, this.getShapeGeometry(shape).vertices)
			)

			return result
		})
	}

	/**
	 * Get the bounds of a shape in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapePageBounds(myShape)
	 * editor.getShapePageBounds(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the bounds for.
	 *
	 * @public
	 */
	getShapePageBounds(shape: TLShape | TLShapeId): Box2d | undefined {
		return this._shapePageBoundsCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of clip paths used for clipping.
	 *
	 * @internal
	 */
	@computed private get _shapeClipPathCache(): ComputedCache<string, TLShape> {
		return this.store.createComputedCache<string, TLShape>('clipPathCache', (shape) => {
			const pageMask = this._shapeMaskCache.get(shape.id)
			if (!pageMask) return undefined
			const pageTransform = this._shapePageTransformCache.get(shape.id)
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
	 * const clipPath = editor.getShapeClipPath(shape)
	 * const clipPath = editor.getShapeClipPath(shape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the clip path for.
	 *
	 * @returns The clip path or undefined.
	 *
	 * @public
	 */
	getShapeClipPath(shape: TLShape | TLShapeId): string | undefined {
		return this._shapeClipPathCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/** @internal */
	@computed private get _shapeMaskCache(): ComputedCache<Vec2d[], TLShape> {
		return this.store.createComputedCache('pageMaskCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return undefined
			}

			const frameAncestors = this.getShapeAncestors(shape.id).filter((shape) =>
				this.isShapeOfType<TLFrameShape>(shape, 'frame')
			)

			if (frameAncestors.length === 0) return undefined

			const pageMask = frameAncestors
				.map<Vec2d[] | undefined>((s) =>
					// Apply the frame transform to the frame outline to get the frame outline in the current page space
					this._shapePageTransformCache.get(s.id)!.applyToPoints(this.getShapeGeometry(s).vertices)
				)
				.reduce((acc, b) => {
					if (!(b && acc)) return undefined
					const intersection = intersectPolygonPolygon(acc, b)
					if (intersection) {
						return intersection.map(Vec2d.Cast)
					}
					return []
				})

			return pageMask
		})
	}

	/**
	 * Get the mask (in the current page space) for a shape.
	 *
	 * @example
	 * ```ts
	 * const pageMask = editor.getShapeMask(shape.id)
	 * ```
	 *
	 * @param id - The id of the shape to get the mask for.
	 *
	 * @returns The mask for the shape.
	 *
	 * @public
	 */
	getShapeMask(shape: TLShapeId | TLShape): VecLike[] | undefined {
		return this._shapeMaskCache.get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the bounds of a shape in the current page space, incorporating any masks. For example, if the
	 * shape were the child of a frame and was half way out of the frame, the bounds would be the half
	 * of the shape that was in the frame.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeMaskedPageBounds(myShape)
	 * editor.getShapeMaskedPageBounds(myShapeId)
	 * ```
	 *
	 * @param shape - The shape to get the masked bounds for.
	 *
	 * @public
	 */
	getShapeMaskedPageBounds(shape: TLShapeId | TLShape): Box2d | undefined {
		if (typeof shape !== 'string') shape = shape.id
		const pageBounds = this._shapePageBoundsCache.get(shape)
		if (!pageBounds) return
		const pageMask = this._shapeMaskCache.get(shape)
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
	 * const ancestors = editor.getShapeAncestors(myShape)
	 * const ancestors = editor.getShapeAncestors(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the ancestors for.
	 *
	 * @public
	 */
	getShapeAncestors(shape: TLShapeId | TLShape, acc: TLShape[] = []): TLShape[] {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) return acc
		const parentId = freshShape.parentId
		if (isPageId(parentId)) {
			acc.reverse()
			return acc
		}

		const parent = this.store.get(parentId)
		if (!parent) return acc
		acc.push(parent)
		return this.getShapeAncestors(parent, acc)
	}

	/**
	 * Find the first ancestor matching the given predicate
	 *
	 * @example
	 * ```ts
	 * const ancestor = editor.findShapeAncestor(myShape)
	 * const ancestor = editor.findShapeAncestor(myShape.id)
	 * const ancestor = editor.findShapeAncestor(myShape.id, (shape) => shape.type === 'frame')
	 * ```
	 *
	 * @param shape - The shape to check the ancestors for.
	 *
	 * @public
	 */
	findShapeAncestor(
		shape: TLShape | TLShapeId,
		predicate: (parent: TLShape) => boolean
	): TLShape | undefined {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) return

		const parentId = freshShape.parentId
		if (isPageId(parentId)) return

		const parent = this.getShape(parentId)
		if (!parent) return
		return predicate(parent) ? parent : this.findShapeAncestor(parent, predicate)
	}

	/**
	 * Returns true if the the given shape has the given ancestor.
	 *
	 * @param shape - The shape.
	 * @param ancestorId - The id of the ancestor.
	 *
	 * @public
	 */
	hasAncestor(shape: TLShape | TLShapeId | undefined, ancestorId: TLShapeId): boolean {
		const id = typeof shape === 'string' ? shape : shape?.id
		const freshShape = id && this.getShape(id)
		if (!freshShape) return false
		if (freshShape.parentId === ancestorId) return true
		return this.hasAncestor(this.getShapeParent(freshShape), ancestorId)
	}

	/**
	 * Get the common ancestor of two or more shapes that matches a predicate.
	 *
	 * @param shapes - The shapes (or shape ids) to check.
	 * @param predicate - The predicate to match.
	 */
	findCommonAncestor(
		shapes: TLShape[] | TLShapeId[],
		predicate?: (shape: TLShape) => boolean
	): TLShapeId | undefined {
		if (shapes.length === 0) {
			return
		}

		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
		const freshShapes = compact(ids.map((id) => this.getShape(id)))

		if (freshShapes.length === 1) {
			const parentId = freshShapes[0].parentId
			if (isPageId(parentId)) {
				return
			}
			return predicate ? this.findShapeAncestor(freshShapes[0], predicate)?.id : parentId
		}

		const [nodeA, ...others] = freshShapes
		let ancestor = this.getShapeParent(nodeA)
		while (ancestor) {
			// TODO: this is not ideal, optimize
			if (predicate && !predicate(ancestor)) {
				ancestor = this.getShapeParent(ancestor)
				continue
			}
			if (others.every((shape) => this.hasAncestor(shape, ancestor!.id))) {
				return ancestor!.id
			}
			ancestor = this.getShapeParent(ancestor)
		}
		return undefined
	}

	/**
	 * Check whether a shape or its parent is locked.
	 *
	 * @param shape - The shape (or shape id) to check.
	 *
	 * @public
	 */
	isShapeOrAncestorLocked(shape?: TLShape): boolean
	isShapeOrAncestorLocked(id?: TLShapeId): boolean
	isShapeOrAncestorLocked(arg?: TLShape | TLShapeId): boolean {
		const shape = typeof arg === 'string' ? this.getShape(arg) : arg
		if (shape === undefined) return false
		if (shape.isLocked) return true
		return this.isShapeOrAncestorLocked(this.getShapeParent(shape))
	}

	/**
	 * The bounds of the current page (the common bounds of all of the shapes on the page).
	 *
	 * @public
	 */
	@computed get currentPageBounds(): Box2d | undefined {
		let commonBounds: Box2d | undefined

		this.currentPageShapeIds.forEach((shapeId) => {
			const bounds = this.getShapeMaskedPageBounds(shapeId)
			if (!bounds) return
			if (!commonBounds) {
				commonBounds = bounds.clone()
			} else {
				commonBounds = commonBounds.expand(bounds)
			}
		})

		return commonBounds
	}

	/**
	 * Get the top-most selected shape at the given point, ignoring groups.
	 *
	 * @param point - The point to check.
	 *
	 * @returns The top-most selected shape at the given point, or undefined if there is no shape at the point.
	 */
	getSelectedShapeAtPoint(point: VecLike): TLShape | undefined {
		const { selectedShapeIds } = this
		return this.currentPageShapesSorted
			.filter((shape) => shape.type !== 'group' && selectedShapeIds.includes(shape.id))
			.reverse() // findlast
			.find((shape) => this.isPointInShape(shape, point, { hitInside: true, margin: 0 }))
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
		point: VecLike,
		opts = {} as {
			renderingOnly?: boolean
			margin?: number
			hitInside?: boolean
			hitLabels?: boolean
			hitFrameInside?: boolean
			filter?: (shape: TLShape) => boolean
		}
	): TLShape | undefined {
		const { viewportPageBounds, zoomLevel } = this
		const {
			filter,
			margin = 0,
			hitLabels = false,
			hitInside = false,
			hitFrameInside = false,
		} = opts

		let inHollowSmallestArea = Infinity
		let inHollowSmallestAreaHit: TLShape | null = null

		let inMarginClosestToEdgeDistance = Infinity
		let inMarginClosestToEdgeHit: TLShape | null = null

		const shapesToCheck = (
			opts.renderingOnly ? this.currentPageRenderingShapesSorted : this.currentPageShapesSorted
		).filter((shape) => {
			if (this.isShapeOfType(shape, 'group')) return false
			const pageMask = this.getShapeMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) return false
			if (filter) return filter(shape)
			return true
		})

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			const geometry = this.getShapeGeometry(shape)
			const isGroup = geometry instanceof Group2d

			const pointInShapeSpace = this.getPointInShapeSpace(shape, point)

			// Check labels first
			if (
				this.isShapeOfType<TLArrowShape>(shape, 'arrow') ||
				(this.isShapeOfType<TLGeoShape>(shape, 'geo') && shape.props.fill === 'none')
			) {
				if (shape.props.text.trim()) {
					// let's check whether the shape has a label and check that
					for (const childGeometry of (geometry as Group2d).children) {
						if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
							return shape
						}
					}
				}
			}

			if (this.isShapeOfType(shape, 'frame')) {
				// On the rare case that we've hit a frame, test again hitInside to be forced true;
				// this prevents clicks from passing through the body of a frame to shapes behhind it.

				// If the hit is within the frame's outer margin, then select the frame
				const distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
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

			let distance: number

			if (isGroup) {
				let minDistance = Infinity
				for (const childGeometry of geometry.children) {
					if (childGeometry.isLabel && !hitLabels) continue

					// hit test the all of the child geometries that aren't labels
					const tDistance = childGeometry.distanceToPoint(pointInShapeSpace, hitInside)
					if (tDistance < minDistance) {
						minDistance = tDistance
					}
				}

				distance = minDistance
			} else {
				// If the margin is zero and the geometry has a very small width or height,
				// then check the actual distance. This is to prevent a bug where straight
				// lines would never pass the broad phase (point-in-bounds) check.
				if (margin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
					distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
				} else {
					// Broad phase
					if (geometry.bounds.containsPoint(pointInShapeSpace, margin)) {
						// Narrow phase (actual distance)
						distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
					} else {
						// Failed the broad phase, geddafugaotta'ere!
						distance = Infinity
					}
				}
			}

			if (geometry.isClosed) {
				// For closed shapes, the distance will be positive if outside of
				// the shape or negative if inside of the shape. If the distance
				// is greater than the margin, then it's a miss. Otherwise...

				if (distance <= margin) {
					if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
						// If the shape is filled, then it's a hit. Remember, we're
						// starting from the TOP-MOST shape in z-index order, so any
						// other hits would be occluded by the shape.
						return inMarginClosestToEdgeHit || shape
					} else {
						// If the shape is bigger than the viewport, then skip it.
						if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue

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
	 * Get the shapes, if any, at a given page point.
	 *
	 * @example
	 * ```ts
	 * editor.getShapesAtPoint({ x: 100, y: 100 })
	 * editor.getShapesAtPoint({ x: 100, y: 100 }, { hitInside: true, exact: true })
	 * ```
	 *
	 * @param point - The page point to test.
	 *
	 * @public
	 */
	getShapesAtPoint(
		point: VecLike,
		opts = {} as { margin?: number; hitInside?: boolean }
	): TLShape[] {
		return this.currentPageShapes.filter((shape) => this.isPointInShape(shape, point, opts))
	}

	/**
	 * Test whether a point (in the current page space) will will a shape. This method takes into account masks,
	 * such as when a shape is the child of a frame and is partially clipped by the frame.
	 *
	 * @example
	 * ```ts
	 * editor.isPointInShape({ x: 100, y: 100 }, myShape)
	 * ```
	 *
	 * @param shape - The shape to test against.
	 * @param point - The page point to test (in the current page space).
	 * @param hitInside - Whether to count as a hit if the point is inside of a closed shape.
	 *
	 * @public
	 */

	isPointInShape(
		shape: TLShape | TLShapeId,
		point: VecLike,
		opts = {} as {
			margin?: number
			hitInside?: boolean
		}
	): boolean {
		const { hitInside = false, margin = 0 } = opts
		const id = typeof shape === 'string' ? shape : shape.id
		// If the shape is masked, and if the point falls outside of that
		// mask, then it's defintely a miss—we don't need to test further.
		const pageMask = this.getShapeMask(id)
		if (pageMask && !pointInPolygon(point, pageMask)) return false

		return this.getShapeGeometry(id).hitTestPoint(
			this.getPointInShapeSpace(shape, point),
			margin,
			hitInside
		)
	}

	/**
	 * Convert a point in the current page space to a point in the local space of a shape. For example, if a
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
	getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec2d {
		const id = typeof shape === 'string' ? shape : shape.id
		return this._shapePageTransformCache.get(id)!.clone().invert().applyToPoint(point)
	}

	/**
	 * Convert a delta in the current page space to a point in the local space of a shape's parent.
	 *
	 * @example
	 * ```ts
	 * editor.getPointInParentSpace(myShape.id, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the point in the local space of.
	 * @param point - The page point to get in the local space of the shape.
	 *
	 * @public
	 */
	getPointInParentSpace(shape: TLShapeId | TLShape, point: VecLike): Vec2d {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) return new Vec2d(0, 0)
		if (isPageId(freshShape.parentId)) return Vec2d.From(point)

		const parentTransform = this.getShapePageTransform(freshShape.parentId)
		if (!parentTransform) return Vec2d.From(point)
		return parentTransform.clone().invert().applyToPoint(point)
	}

	/**
	 * An array containing all of the shapes in the current page.
	 *
	 * @example
	 * ```ts
	 * editor.currentPageShapes
	 * ```
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get currentPageShapes() {
		return Array.from(this.currentPageShapeIds, (id) => this.store.get(id)! as TLShape)
	}

	/**
	 * An array containing all of the shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @example
	 * ```ts
	 * editor.currentPageShapesSorted
	 * ```
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get currentPageShapesSorted(): TLShape[] {
		// todo: consider making into a function call that includes options for selected-only, rendering, etc.
		// todo: consider making a derivation or something, or merging with rendering shapes
		const shapes = new Set(this.currentPageShapes.sort(sortByIndex))

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
	 * An array containing all of the rendering shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @example
	 * ```ts
	 * editor.currentPageShapesSorted
	 * ```
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get currentPageRenderingShapesSorted(): TLShape[] {
		return this.renderingShapes
			.filter(({ isCulled }) => !isCulled)
			.sort((a, b) => a.index - b.index)
			.map(({ shape }) => shape)
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
	isShapeOfType<T extends TLUnknownShape>(shape: TLUnknownShape, type: T['type']): shape is T
	isShapeOfType<T extends TLUnknownShape>(
		shapeId: TLUnknownShape['id'],
		type: T['type']
	): shapeId is T['id']
	isShapeOfType<T extends TLUnknownShape>(
		arg: TLUnknownShape | TLUnknownShape['id'],
		type: T['type']
	) {
		const shape = typeof arg === 'string' ? this.getShape(arg)! : arg
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
	getShape<T extends TLShape = TLShape>(shape: TLShape | TLParentId): T | undefined {
		const id = typeof shape === 'string' ? shape : shape.id
		if (!isShapeId(id)) return undefined
		return this.store.get(id) as T
	}

	/**
	 * Get the parent shape for a given shape. Returns undefined if the shape is the direct child of
	 * the page.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeParent(myShape)
	 * ```
	 *
	 * @public
	 */
	getShapeParent(shape?: TLShape | TLShapeId): TLShape | undefined {
		const id = typeof shape === 'string' ? shape : shape?.id
		if (!id) return undefined
		const freshShape = this.getShape(id)
		if (freshShape === undefined || !isShapeId(freshShape.parentId)) return undefined
		return this.store.get(freshShape.parentId)
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

		const ancestor = this.findShapeAncestor(
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
	isShapeInPage(shape: TLShape | TLShapeId, pageId = this.currentPageId): boolean {
		const id = typeof shape === 'string' ? shape : shape.id
		const shapeToCheck = this.getShape(id)
		if (!shapeToCheck) return false

		let shapeIsInPage = false

		if (shapeToCheck.parentId === pageId) {
			shapeIsInPage = true
		} else {
			let parent = this.getShape(shapeToCheck.parentId)
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
	getAncestorPageId(shape?: TLShape | TLShapeId): TLPageId | undefined {
		const id = typeof shape === 'string' ? shape : shape?.id
		const _shape = id && this.getShape(id)
		if (!_shape) return undefined
		if (isPageId(_shape.parentId)) {
			return _shape.parentId
		} else {
			return this.getAncestorPageId(this.getShape(_shape.parentId))
		}
	}

	// Parents and children

	/**
	 * A cache of parents to children.
	 *
	 * @internal
	 */
	private readonly _parentIdsToChildIds: ReturnType<typeof parentsToChildren>

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
	reparentShapes(shapes: TLShapeId[] | TLShape[], parentId: TLParentId, insertIndex?: string) {
		const ids =
			typeof shapes[0] === 'string' ? (shapes as TLShapeId[]) : shapes.map((s) => (s as TLShape).id)
		const changes: TLShapePartial[] = []

		const parentTransform = isPageId(parentId)
			? Matrix2d.Identity()
			: this.getShapePageTransform(parentId)!

		const parentPageRotation = parentTransform.rotation()

		let indices: string[] = []

		const sibs = compact(this.getSortedChildIdsForParent(parentId).map((id) => this.getShape(id)))

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
			const pageTransform = this.getShapePageTransform(shape)!
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
	getHighestIndexForParent(parent: TLParentId | TLPage | TLShape): string {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const children = this._parentIdsToChildIds.value[parentId]

		if (!children || children.length === 0) {
			return 'a1'
		}
		const shape = this.getShape(children[children.length - 1])!
		return getIndexAbove(shape.index)
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
	 * editor.getSortedChildIdsForParent('frame1')
	 * ```
	 *
	 * @param parentId - The id of the parent shape.
	 *
	 * @public
	 */
	getSortedChildIdsForParent(parent: TLParentId | TLPage | TLShape): TLShapeId[] {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const ids = this._parentIdsToChildIds.value[parentId]
		if (!ids) return EMPTY_ARRAY
		return this._childIdsCache.get(ids, () => ids)
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
	visitDescendants(
		parent: TLParentId | TLPage | TLShape,
		visitor: (id: TLShapeId) => void | false
	): this {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const children = this.getSortedChildIdsForParent(parentId)
		for (const id of children) {
			if (visitor(id) === false) continue
			this.visitDescendants(id, visitor)
		}
		return this
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
			for (const childId of this.getSortedChildIdsForParent(id)) {
				idsToCheck.push(childId)
			}
		}

		return idsToInclude
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
	getDroppingOverShape(point: VecLike, droppingShapes: TLShape[] = []) {
		// starting from the top...
		return this.currentPageShapesSorted.findLast((shape) => {
			if (
				// only allow shapes that can receive children
				!this.getShapeUtil(shape).canDropShapes(shape, droppingShapes) ||
				// don't allow dropping a shape on itself or one of it's children
				droppingShapes.find((s) => s.id === shape.id || this.hasAncestor(shape, s.id))
			) {
				return false
			}

			// Only allow dropping into the masked page bounds of the shape, e.g. when a frame is
			// partially clipped by its own parent frame
			const maskedPageBounds = this.getShapeMaskedPageBounds(shape.id)

			if (
				maskedPageBounds &&
				maskedPageBounds.containsPoint(point) &&
				this.getShapeGeometry(shape).hitTestPoint(this.getPointInShapeSpace(shape, point), 0, true)
			) {
				return true
			}
		})
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
	getOutermostSelectableShape(
		shape: TLShape | TLShapeId,
		filter?: (shape: TLShape) => boolean
	): TLShape {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)!
		let match = freshShape
		let node = freshShape as TLShape | undefined

		const { focusedGroup } = this

		while (node) {
			if (
				this.isShapeOfType<TLGroupShape>(node, 'group') &&
				focusedGroup?.id !== node.id &&
				!this.hasAncestor(focusedGroup, node.id) &&
				(filter?.(node) ?? true)
			) {
				match = node
			} else if (focusedGroup?.id === node.id) {
				break
			}
			node = this.getShapeParent(node)
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
	 * editor.rotateShapesBy(editor.selectedShapeIds, Math.PI)
	 * editor.rotateShapesBy(editor.selectedShapeIds, Math.PI / 2)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) of the shapes to move.
	 * @param delta - The delta in radians to apply to the selection rotation.
	 */
	rotateShapesBy(shapes: TLShapeId[] | TLShape[], delta: number): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

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
	 * editor.nudgeShapes(['box1', 'box2'], { x: 8, y: 8 })
	 * editor.nudgeShapes(editor.selectedShapes, { x: 8, y: 8 }, { squashing: true })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 * @param direction - The direction in which to move the shapes.
	 * @param historyOptions - (optional) The history options for the change.
	 */
	nudgeShapes(
		shapes: TLShapeId[] | TLShape[],
		offset: VecLike,
		historyOptions?: TLCommandHistoryOptions
	): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (ids.length <= 0) return this
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = this.getShape(id)

			if (!shape) {
				throw Error(`Could not find a shape with the id ${id}.`)
			}

			const localDelta = Vec2d.Cast(offset)
			const parentTransform = this.getShapeParentTransform(shape)
			if (parentTransform) localDelta.rot(-parentTransform.rotation())

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

		this.updateShapes(changes, {
			squashing: true,
			...historyOptions,
		})

		return this
	}

	/**
	 * Duplicate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.duplicateShapes(['box1', 'box2'], { x: 8, y: 8 })
	 * editor.duplicateShapes(editor.selectedShapes, { x: 8, y: 8 })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to duplicate.
	 * @param offset - (optional) The offset (in pixels) to apply to the duplicated shapes.
	 *
	 * @public
	 */
	duplicateShapes(shapes: TLShapeId[] | TLShape[], offset?: VecLike): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (ids.length <= 0) return this

		const initialIds = new Set(ids)
		const idsToCreate: TLShapeId[] = []
		const idsToCheck = [...ids]

		while (idsToCheck.length > 0) {
			const id = idsToCheck.pop()
			if (!id) break
			idsToCreate.push(id)
			this.getSortedChildIdsForParent(id).forEach((childId) => idsToCheck.push(childId))
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
					const parentTransform = this.getShapeParentTransform(shape)
					const vec = new Vec2d(offset.x, offset.y).rot(-parentTransform!.rotation())
					ox = vec.x
					oy = vec.y
				}

				const parentId = shape.parentId ?? this.currentPageId
				const siblings = this.getSortedChildIdsForParent(parentId)
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
			this.setSelectedShapes(ids)

			if (offset !== undefined) {
				// If we've offset the duplicated shapes, check to see whether their new bounds is entirely
				// contained in the current viewport. If not, then animate the camera to be centered on the
				// new shapes.
				const { viewportPageBounds, selectionPageBounds: selectionPageBounds } = this
				if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
					this.centerOnPoint(selectionPageBounds.center, {
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
	 * @param shapes - The shapes (or shape ids) of the shapes to move.
	 * @param pageId - The id of the page where the shapes will be moved.
	 *
	 * @public
	 */
	moveShapesToPage(shapes: TLShapeId[] | TLShape[], pageId: TLPageId): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (ids.length === 0) return this
		if (this.instanceState.isReadonly) return this

		const { currentPageId } = this

		if (pageId === currentPageId) return this
		if (!this.store.has(pageId)) return this

		// Basically copy the shapes
		const content = this.getContentFromCurrentPage(ids)

		// Just to be sure
		if (!content) return this

		// If there is no space on pageId, or if the selected shapes
		// would take the new page above the limit, don't move the shapes
		if (this.getPageShapeIds(pageId).size + content.shapes.length > MAX_SHAPES_PER_PAGE) {
			alertMaxShapes(this, pageId)
			return this
		}

		const fromPageZ = this.camera.z

		this.history.batch(() => {
			// Delete the shapes on the current page
			this.deleteShapes(ids)

			// Move to the next page
			this.setCurrentPage(pageId)

			// Put the shape content onto the new page; parents and indices will
			// be taken care of by the putContent method; make sure to pop any focus
			// layers so that the content will be put onto the page.
			this.setFocusedGroup(null)
			this.selectNone()
			this.putContentOntoCurrentPage(content, {
				select: true,
				preserveIds: true,
				preservePosition: true,
			})

			// Force the new page's camera to be at the same zoom level as the
			// "from" page's camera, then center the "to" page's camera on the
			// pasted shapes
			this.setCamera({ ...this.camera, z: fromPageZ })
			this.centerOnPoint(this.selectionRotatedPageBounds!.center)
		})

		return this
	}

	/**
	 * Toggle the lock state of one or more shapes. If there is a mix of locked and unlocked shapes, all shapes will be locked.
	 *
	 * @param shapes - The shapes (or shape ids) to toggle.
	 *
	 * @public
	 */
	toggleLock(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly || ids.length === 0) return this

		let allLocked = true,
			allUnlocked = true
		const shapesToToggle: TLShape[] = []
		for (const id of ids) {
			const shape = this.getShape(id)
			if (shape) {
				shapesToToggle.push(shape)
				if (shape.isLocked) {
					allUnlocked = false
				} else {
					allLocked = false
				}
			}
		}
		this.batch(() => {
			if (allUnlocked) {
				this.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true }))
				)
				this.setSelectedShapes([])
			} else if (allLocked) {
				this.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: false }))
				)
			} else {
				this.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true }))
				)
			}
		})

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
	sendToBack(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
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
	sendBackward(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
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
	bringForward(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
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
	bringToFront(shapes: TLShapeId[] | TLShape[]): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
		const changes = getReorderingShapesChanges(this, 'toFront', ids as TLShapeId[])
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Flip shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.flipShapes([box1, box2], 'horizontal', 32)
	 * editor.flipShapes(editor.selectedShapeIds, 'horizontal', 32)
	 * ```
	 *
	 * @param shapes - The ids of the shapes to flip.
	 * @param operation - Whether to flip horizontally or vertically.
	 *
	 * @public
	 */
	flipShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly) return this

		let shapesToFlip = compact(ids.map((id) => this.getShape(id)))

		if (!shapesToFlip.length) return this

		shapesToFlip = compact(
			shapesToFlip
				.map((shape) => {
					if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
						return this.getSortedChildIdsForParent(shape.id).map((id) => this.getShape(id))
					}

					return shape
				})
				.flat()
		)

		const scaleOriginPage = Box2d.Common(
			compact(shapesToFlip.map((id) => this.getShapePageBounds(id)))
		).center

		this.batch(() => {
			for (const shape of shapesToFlip) {
				const bounds = this.getShapeGeometry(shape).bounds
				const initialPageTransform = this.getShapePageTransform(shape.id)
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
	 * editor.stackShapes([box1, box2], 'horizontal', 32)
	 * editor.stackShapes(editor.selectedShapeIds, 'horizontal', 32)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stack.
	 * @param operation - Whether to stack horizontally or vertically.
	 * @param gap - The gap to leave between shapes.
	 *
	 * @public
	 */
	stackShapes(
		shapes: TLShapeId[] | TLShape[],
		operation: 'horizontal' | 'vertical',
		gap: number
	): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)
		if (this.instanceState.isReadonly) return this

		const shapesToStack = compact(
			ids
				.map((id) => this.getShape(id)) // always fresh shapes
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

		const len = shapesToStack.length

		if ((gap === 0 && len < 3) || len < 2) return this

		const pageBounds = Object.fromEntries(
			shapesToStack.map((shape) => [shape.id, this.getShapePageBounds(shape)!])
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

		if (gap === 0) {
			const gaps: { gap: number; count: number }[] = []

			shapesToStack.sort((a, b) => pageBounds[a.id][min] - pageBounds[b.id][min])

			// Collect all of the gaps between shapes. We want to find
			// patterns (equal gaps between shapes) and use the most common
			// one as the gap for all of the shapes.
			for (let i = 0; i < len - 1; i++) {
				const shape = shapesToStack[i]
				const nextShape = shapesToStack[i + 1]

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

		let v = pageBounds[shapesToStack[0].id][max]

		shapesToStack.forEach((shape, i) => {
			if (i === 0) return

			const delta = { x: 0, y: 0 }
			delta[val] = v + shapeGap - pageBounds[shape.id][val]

			const parent = this.getShapeParent(shape)
			const localDelta = parent
				? Vec2d.Rot(delta, -this.getShapePageTransform(parent)!.decompose().rotation)
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
	 * Pack shapes into a grid centered on their current position. Based on potpack (https://github.com/mapbox/potpack).
	 *
	 * @example
	 * ```ts
	 * editor.packShapes([box1, box2], 32)
	 * editor.packShapes(editor.selectedShapeIds, 32)
	 * ```
	 *
	 *
	 * @param shapes - The shapes (or shape ids) to pack.
	 * @param gap - The padding to apply to the packed shapes. Defaults to 16.
	 */
	packShapes(shapes: TLShapeId[] | TLShape[], gap: number): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapesToPack = compact(
			ids
				.map((id) => this.getShape(id)) // always fresh shapes
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

		for (let i = 0; i < shapesToPack.length; i++) {
			shape = shapesToPack[i]
			bounds = this.getShapePageBounds(shape)!
			shapePageBounds[shape.id] = bounds
			nextShapePageBounds[shape.id] = bounds.clone()
			area += bounds.width * bounds.height
		}

		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		const maxWidth = commonBounds.width

		// sort the shapes by height, descending
		shapesToPack.sort((a, b) => shapePageBounds[b.id].height - shapePageBounds[a.id].height)

		// Start with is (sort of) the square of the area
		const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)

		// first shape fills the width and is infinitely tall
		const spaces: Box2d[] = [new Box2d(commonBounds.x, commonBounds.y, startWidth, Infinity)]

		let width = 0
		let height = 0
		let space: Box2d
		let last: Box2d

		for (let i = 0; i < shapesToPack.length; i++) {
			shape = shapesToPack[i]
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
					space.x += bounds.width + gap
					space.width -= bounds.width + gap
				} else if (bounds.width === space.width) {
					// fit the shape into the space (height)
					space.y += bounds.height + gap
					space.height -= bounds.height + gap
				} else {
					// split the space into two spaces
					spaces.push(
						new Box2d(
							space.x + (bounds.width + gap),
							space.y,
							space.width - (bounds.width + gap),
							bounds.height
						)
					)
					space.y += bounds.height + gap
					space.height -= bounds.height + gap
				}
				break
			}
		}

		const commonAfter = Box2d.Common(Object.values(nextShapePageBounds))
		const centerDelta = Vec2d.Sub(commonBounds.center, commonAfter.center)

		let nextBounds: Box2d

		const changes: TLShapePartial<any>[] = []

		for (let i = 0; i < shapesToPack.length; i++) {
			shape = shapesToPack[i]
			bounds = shapePageBounds[shape.id]
			nextBounds = nextShapePageBounds[shape.id]

			const delta = Vec2d.Sub(nextBounds.point, bounds.point).add(centerDelta)
			const parentTransform = this.getShapeParentTransform(shape)
			if (parentTransform) delta.rot(-parentTransform.rotation())

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
	 * editor.alignShapes([box1, box2], 'left')
	 * editor.alignShapes(editor.selectedShapeIds, 'left')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to align.
	 * @param operation - The align operation to apply.
	 *
	 * @public
	 */

	alignShapes(
		shapes: TLShapeId[] | TLShape[],
		operation: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
	): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapesToAlign = compact(ids.map((id) => this.getShape(id))) // always fresh shapes
		const shapePageBounds = Object.fromEntries(
			shapesToAlign.map((shape) => [shape.id, this.getShapePageBounds(shape)])
		)
		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		const changes: TLShapePartial[] = []

		shapesToAlign.forEach((shape) => {
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

			const parent = this.getShapeParent(shape)
			const localDelta = parent
				? Vec2d.Rot(delta, -this.getShapePageTransform(parent)!.decompose().rotation)
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
	 * editor.distributeShapes([box1, box2], 'horizontal')
	 * editor.distributeShapes(editor.selectedShapeIds, 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to distribute.
	 * @param operation - Whether to distribute shapes horizontally or vertically.
	 *
	 * @public
	 */
	distributeShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly) return this
		if (ids.length < 3) return this

		const len = ids.length
		const shapesToDistribute = compact(ids.map((id) => this.getShape(id))) // always fresh shapes
		const pageBounds = Object.fromEntries(
			shapesToDistribute.map((shape) => [shape.id, this.getShapePageBounds(shape)!])
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
		const first = shapesToDistribute.sort(
			(a, b) => pageBounds[a.id][min] - pageBounds[b.id][min]
		)[0]
		const last = shapesToDistribute.sort((a, b) => pageBounds[b.id][max] - pageBounds[a.id][max])[0]

		const midFirst = pageBounds[first.id][mid]
		const step = (pageBounds[last.id][mid] - midFirst) / (len - 1)
		const v = midFirst + step

		shapesToDistribute
			.filter((shape) => shape !== first && shape !== last)
			.sort((a, b) => pageBounds[a.id][mid] - pageBounds[b.id][mid])
			.forEach((shape, i) => {
				const delta = { x: 0, y: 0 }
				delta[val] = v + step * i - pageBounds[shape.id][dim] / 2 - pageBounds[shape.id][val]

				const parent = this.getShapeParent(shape)
				const localDelta = parent
					? Vec2d.Rot(delta, -this.getShapePageTransform(parent)!.rotation())
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
	 * editor.stretchShapes([box1, box2], 'horizontal')
	 * editor.stretchShapes(editor.selectedShapeIds, 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stretch.
	 * @param operation - Whether to stretch shapes horizontally or vertically.
	 *
	 * @public
	 */
	stretchShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (this.instanceState.isReadonly) return this
		if (ids.length < 2) return this

		const shapesToStretch = compact(ids.map((id) => this.getShape(id))) // always fresh shapes
		const shapeBounds = Object.fromEntries(ids.map((id) => [id, this.getShapeGeometry(id).bounds]))
		const shapePageBounds = Object.fromEntries(ids.map((id) => [id, this.getShapePageBounds(id)!]))
		const commonBounds = Box2d.Common(compact(Object.values(shapePageBounds)))

		switch (operation) {
			case 'vertical': {
				this.batch(() => {
					for (const shape of shapesToStretch) {
						const pageRotation = this.getShapePageTransform(shape)!.rotation()
						if (pageRotation % PI2) continue
						const bounds = shapeBounds[shape.id]
						const pageBounds = shapePageBounds[shape.id]
						const localOffset = new Vec2d(0, commonBounds.minY - pageBounds.minY)
						const parentTransform = this.getShapeParentTransform(shape)
						if (parentTransform) localOffset.rot(-parentTransform.rotation())

						const { x, y } = Vec2d.Add(localOffset, shape)
						this.updateShapes([{ id: shape.id, type: shape.type, x, y }], { squashing: true })
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
					for (const shape of shapesToStretch) {
						const bounds = shapeBounds[shape.id]
						const pageBounds = shapePageBounds[shape.id]
						const pageRotation = this.getShapePageTransform(shape)!.rotation()
						if (pageRotation % PI2) continue
						const localOffset = new Vec2d(commonBounds.minX - pageBounds.minX, 0)
						const parentTransform = this.getShapeParentTransform(shape)
						if (parentTransform) localOffset.rot(-parentTransform.rotation())

						const { x, y } = Vec2d.Add(localOffset, shape)
						this.updateShapes([{ id: shape.id, type: shape.type, x, y }], { squashing: true })
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
		shape: TLShapeId | TLShape,
		scale: VecLike,
		options: TLResizeShapeOptions = {}
	): this {
		const id = typeof shape === 'string' ? shape : shape.id
		if (this.instanceState.isReadonly) return this

		if (!Number.isFinite(scale.x)) scale = new Vec2d(1, scale.y)
		if (!Number.isFinite(scale.y)) scale = new Vec2d(scale.x, 1)

		const initialShape = options.initialShape ?? this.getShape(id)
		if (!initialShape) return this

		const scaleOrigin = options.scaleOrigin ?? this.getShapePageBounds(id)?.center
		if (!scaleOrigin) return this

		const pageTransform = options.initialPageTransform
			? Matrix2d.Cast(options.initialPageTransform)
			: this.getShapePageTransform(id)
		if (!pageTransform) return this

		const pageRotation = pageTransform.rotation()

		if (pageRotation == null) return this

		const scaleAxisRotation = options.scaleAxisRotation ?? pageRotation

		const initialBounds = options.initialBounds ?? this.getShapeGeometry(id).bounds

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
				{ squashing: true }
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
				{ squashing: true }
			)
		}

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
			this.updateShapes([{ id, type, rotation }], { squashing: true })
		}

		// Next we need to translate the shape so that it's center point ends up in the right place.
		// To do that we first need to calculate the center point of the shape in the current page space before the scale was applied.
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
		const pageBounds = this.getShapePageBounds(id)!
		const pageTransform = this.getShapePageTransform(id)!
		const currentPageCenter = pageBounds.center
		const shapePageTransformOrigin = pageTransform.point()
		if (!currentPageCenter || !shapePageTransformOrigin) return this
		const pageDelta = Vec2d.Sub(postScaleShapePageCenter, currentPageCenter)

		// and finally figure out what the shape's new position should be
		const postScaleShapePagePoint = Vec2d.Add(shapePageTransformOrigin, pageDelta)
		const { x, y } = this.getPointInParentSpace(id, postScaleShapePagePoint)

		this.updateShapes([{ id, type, x, y }], { squashing: true })

		return this
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
	 * editor.createShape(myShape)
	 * editor.createShape({ id: 'box1', type: 'text', props: { text: "ok" } })
	 * ```
	 *
	 * @param shape - The shape (or shape partial) to create.
	 *
	 * @public
	 */
	createShape<T extends TLUnknownShape>(shape: OptionalKeys<TLShapePartial<T>, 'id'>): this {
		this._createShapes([shape])
		return this
	}

	/**
	 * Create shapes.
	 *
	 * @example
	 * ```ts
	 * editor.createShapes([myShape])
	 * editor.createShapes([{ id: 'box1', type: 'text', props: { text: "ok" } }])
	 * ```
	 *
	 * @param shapes - The shapes (or shape partials) to create.
	 * @param select - Whether to select the created shapes. Defaults to false.
	 *
	 * @public
	 */
	createShapes<T extends TLUnknownShape>(shapes: OptionalKeys<TLShapePartial<T>, 'id'>[]) {
		if (!Array.isArray(shapes)) {
			throw Error('Editor.createShapes: must provide an array of shapes or shape partials')
		}
		this._createShapes(shapes)
		return this
	}

	/** @internal */
	private _createShapes = this.history.createCommand(
		'createShapes',
		(partials: OptionalKeys<TLShapePartial, 'id'>[]) => {
			if (this.instanceState.isReadonly) return null
			if (partials.length <= 0) return null

			const { currentPageShapeIds } = this

			const maxShapesReached = partials.length + currentPageShapeIds.size > MAX_SHAPES_PER_PAGE

			if (maxShapesReached) {
				// can't create more shapes than fit on the page
				alertMaxShapes(this)
				return
			}

			if (partials.length === 0) return null

			return {
				data: {
					currentPageId: this.currentPageId,
					partials: partials.map((p) =>
						p.id ? p : { ...p, id: createShapeId() }
					) as TLShapePartial[],
				},
			}
		},
		{
			do: ({ partials }) => {
				const { focusedGroupId } = this

				// 1. Parents

				// Make sure that each partial will become the child of either the
				// page or another shape that exists (or that will exist) in this page.

				const { currentPageShapesSorted } = this
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
							currentPageShapesSorted.findLast(
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
							)?.id ?? this.focusedGroupId

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
								-this.getShapePageTransform(parentId)!.rotation() + (partial.rotation ?? 0)
						}

						// a shape cannot be it's own parent. This was a rare issue with frames/groups in the syncFuzz tests.
						if (partial.parentId === partial.id) {
							partial.parentId = focusedGroupId
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
						const parentId = partial.parentId ?? focusedGroupId

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
						parentId: partial.parentId ?? focusedGroupId,
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
			},
			undo: ({ partials }) => {
				this.store.remove(partials.map((p) => p.id))
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
		animationOptions?: TLAnimationOptions
	): this {
		return this.animateShapes([partial], animationOptions)
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
		animationOptions = {} as TLAnimationOptions
	): this {
		const { duration = 500, easing = EASINGS.linear } = animationOptions

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
					this.updateShapes(partialsToUpdate, { squashing: false })
					// update shapes also removes the shape from animating shapes
				}

				this.removeListener('tick', handleTick)
				return
			}

			t = easing(1 - remaining / duration)

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

				this._updateShapes(tPartials, { squashing: true })
			} catch (e) {
				// noop
			}
		}

		this.addListener('tick', handleTick)

		return this
	}

	/**
	 * Create a group containing the provided shapes.
	 *
	 * @param shapes - The shapes (or shape ids) to group. Defaults to the selected shapes.
	 * @param groupId - (optional) The id of the group to create.
	 *
	 * @public
	 */
	groupShapes(shapes: TLShapeId[] | TLShape[], groupId = createShapeId()): this {
		if (!Array.isArray(shapes)) {
			throw Error('Editor.groupShapes: must provide an array of shapes or shape ids')
		}
		if (this.instanceState.isReadonly) return this

		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes.map((s) => (s as TLShape).id) as TLShapeId[])

		if (ids.length <= 1) return this

		const shapesToGroup = compact(this._getUnlockedShapeIds(ids).map((id) => this.getShape(id)))
		const sortedShapeIds = shapesToGroup.sort(sortByIndex).map((s) => s.id)
		const pageBounds = Box2d.Common(compact(shapesToGroup.map((id) => this.getShapePageBounds(id))))

		const { x, y } = pageBounds.point

		const parentId = this.findCommonAncestor(shapesToGroup) ?? this.currentPageId

		// Only group when the select tool is active
		if (this.currentToolId !== 'select') return this

		// If not already in idle, cancel the current interaction (get back to idle)
		if (!this.isIn('select.idle')) {
			this.cancel()
		}

		// Find all the shapes that have the same parentId, and use the highest index.
		const shapesWithRootParent = shapesToGroup
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
				const childIds = this.getSortedChildIdsForParent(group.id)

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
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	updateShape<T extends TLUnknownShape>(
		partial: TLShapePartial<T> | null | undefined,
		historyOptions?: TLCommandHistoryOptions
	) {
		this.updateShapes([partial], historyOptions)
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
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	updateShapes<T extends TLUnknownShape>(
		partials: (TLShapePartial<T> | null | undefined)[],
		historyOptions?: TLCommandHistoryOptions
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

		this._updateShapes(compactedPartials, historyOptions)
		return this
	}

	/** @internal */
	private _updateShapes = this.history.createCommand(
		'updateShapes',
		(
			_partials: (TLShapePartial | null | undefined)[],
			historyOptions?: TLCommandHistoryOptions
		) => {
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

			return { data: { snapshots, updates }, ...historyOptions }
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
			const prevSelectedShapeIds = [...this.currentPageState.selectedShapeIds]

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

			const postSelectedShapeIds = prevSelectedShapeIds.filter((id) => !allIds.has(id))

			return { data: { deletedIds, snapshots, prevSelectedShapeIds, postSelectedShapeIds } }
		},
		{
			do: ({ deletedIds, postSelectedShapeIds }) => {
				this.store.remove(deletedIds)
				this.store.update(this.currentPageState.id, (state) => ({
					...state,
					selectedShapeIds: postSelectedShapeIds,
				}))
			},
			undo: ({ snapshots, prevSelectedShapeIds }) => {
				this.store.put(snapshots)
				this.store.update(this.currentPageState.id, (state) => ({
					...state,
					selectedShapeIds: prevSelectedShapeIds,
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
				this._extractSharedStyles(this.getShape(childIds[i])!, sharedStyleMap)
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
	 *   print('All selected shapes have the same color:', color.value)
	 * }
	 * ```
	 *
	 * @public
	 */
	@computed<ReadonlySharedStyleMap>({ isEqual: (a, b) => a.equals(b) })
	get sharedStyles(): ReadonlySharedStyleMap {
		// If we're in selecting and if we have a selection, return the shared styles from the
		// current selection
		if (this.isIn('select') && this.selectedShapeIds.length > 0) {
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
		if (this.isIn('select') && this.selectedShapeIds.length > 0) {
			const shapesToCheck: TLShape[] = []
			const addShape = (shapeId: TLShapeId) => {
				const shape = this.getShape(shapeId)
				if (!shape) return
				// For groups, ignore the opacity of the group shape and instead include
				// the opacity of the group's children. These are the shapes that would have
				// their opacity changed if the user called `setOpacity` on the current selection.
				if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
					for (const childId of this.getSortedChildIdsForParent(shape.id)) {
						addShape(childId)
					}
				} else {
					shapesToCheck.push(shape)
				}
			}
			for (const shapeId of this.selectedShapeIds) {
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
	 * Set the opacity for the next shapes. This will effect subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForNextShapes(0.5)
	 * editor.setOpacityForNextShapes(0.5, { squashing: true })
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 * @param historyOptions - The history options for the change.
	 */
	setOpacityForNextShapes(opacity: number, historyOptions?: TLCommandHistoryOptions): this {
		this.updateInstanceState({ opacityForNextShape: opacity }, historyOptions)
		return this
	}

	/**
	 * Set the current opacity. This will effect any selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForSelectedShapes(0.5)
	 * editor.setOpacityForSelectedShapes(0.5, { squashing: true })
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 * @param historyOptions - The history options for the change.
	 */
	setOpacityForSelectedShapes(opacity: number, historyOptions?: TLCommandHistoryOptions): this {
		const { selectedShapes } = this

		if (selectedShapes.length > 0) {
			const shapesToUpdate: TLShape[] = []

			// We can have many deep levels of grouped shape
			// Making a recursive function to look through all the levels
			const addShapeById = (shape: TLShape) => {
				if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
					const childIds = this.getSortedChildIdsForParent(shape)
					for (const childId of childIds) {
						addShapeById(this.getShape(childId)!)
					}
				} else {
					shapesToUpdate.push(shape)
				}
			}

			for (const id of selectedShapes) {
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
				historyOptions
			)
		}

		return this
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp} for the selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red', { ephemeral: true })
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	setStyleForNextShapes<T>(
		style: StyleProp<T>,
		value: T,
		historyOptions?: TLCommandHistoryOptions
	): this {
		const {
			instanceState: { stylesForNextShape },
		} = this

		this.updateInstanceState(
			{ stylesForNextShape: { ...stylesForNextShape, [style.id]: value } },
			historyOptions
		)

		return this
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp}. This change will be applied to the currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red', { ephemeral: true })
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 * @param historyOptions - (optional) The history options for the change.
	 *
	 * @public
	 */
	setStyleForSelectedShapes<T>(
		style: StyleProp<T>,
		value: T,
		historyOptions?: TLCommandHistoryOptions
	): this {
		const { selectedShapes } = this

		if (selectedShapes.length > 0) {
			const updates: {
				util: ShapeUtil
				originalShape: TLShape
				updatePartial: TLShapePartial
			}[] = []

			// We can have many deep levels of grouped shape
			// Making a recursive function to look through all the levels
			const addShapeById = (shape: TLShape) => {
				if (this.isShapeOfType<TLGroupShape>(shape, 'group')) {
					const childIds = this.getSortedChildIdsForParent(shape.id)
					for (const childId of childIds) {
						addShapeById(this.getShape(childId)!)
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

			for (const shape of selectedShapes) {
				addShapeById(shape)
			}

			this.updateShapes(
				updates.map(({ updatePartial }) => updatePartial),
				historyOptions
			)
		}

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
	 * @param shapes - The shapes (or shape ids) to get content for.
	 *
	 * @returns The exported content.
	 *
	 * @public
	 */
	getContentFromCurrentPage(shapes: TLShapeId[] | TLShape[]): TLContent | undefined {
		// todo: make this work with any page, not just the current page
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

		if (!ids) return
		if (ids.length === 0) return

		const pageTransforms: Record<string, Matrix2dModel> = {}

		let shapesForContent = dedupe(
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

		shapesForContent = shapesForContent.map((shape) => {
			pageTransforms[shape.id] = this.getShapePageTransform(shape.id)!

			shape = structuredClone(shape) as typeof shape

			if (this.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
				const startBindingId =
					shape.props.start.type === 'binding' ? shape.props.start.boundShapeId : undefined

				const endBindingId =
					shape.props.end.type === 'binding' ? shape.props.end.boundShapeId : undefined

				const info = this.getArrowInfo(shape)

				if (shape.props.start.type === 'binding') {
					if (!shapesForContent.some((s) => s.id === startBindingId)) {
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
					if (!shapesForContent.some((s) => s.id === endBindingId)) {
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

		shapesForContent.forEach((shape) => {
			if (shapesForContent.find((s) => s.id === shape.parentId) === undefined) {
				// Need to get page point and rotation of the shape because shapes in
				// groups use local position/rotation

				const pageTransform = this.getShapePageTransform(shape.id)!
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

		shapesForContent.forEach((shape) => {
			if ('assetId' in shape.props) {
				if (shape.props.assetId !== null) {
					assetsSet.add(shape.props.assetId)
				}
			}
		})

		return {
			shapes: shapesForContent,
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
	putContentOntoCurrentPage(
		content: TLContent,
		options: {
			point?: VecLike
			select?: boolean
			preservePosition?: boolean
			preserveIds?: boolean
		} = {}
	): this {
		if (this.instanceState.isReadonly) return this

		// todo: make this able to support putting content onto any page, not just the current page

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
			const ancestors = this.getShapeAncestors(shape)
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
				if (!this.viewportPageBounds.includes(this.getShapePageBounds(parent)!)) {
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

		let index = this.getHighestIndexForParent(pasteParentId) // todo: requires that the putting page is the current page

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
			this.createShapes(newShapes)

			if (select) {
				this.select(...rootShapes.map((s) => s.id))
			}

			// And then, if needed, reparent the root shapes to the paste parent
			if (pasteParentId !== currentPageId) {
				this.reparentShapes(
					rootShapes.map((s) => s.id),
					pasteParentId
				)
			}

			const newCreatedShapes = newShapes.map((s) => this.getShape(s.id)!)
			const bounds = Box2d.Common(newCreatedShapes.map((s) => this.getShapePageBounds(s)!))

			if (point === undefined) {
				if (!isPageId(pasteParentId)) {
					// Put the shapes in the middle of the (on screen) parent
					const shape = this.getShape(pasteParentId)!
					point = Matrix2d.applyToPoint(
						this.getShapePageTransform(shape),
						this.getShapeGeometry(shape).bounds.center
					)
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

			const pageCenter = Box2d.Common(
				compact(rootShapes.map(({ id }) => this.getShapePageBounds(id)))
			).center

			const offset = Vec2d.Sub(point, pageCenter)

			this.updateShapes(
				rootShapes.map(({ id }) => {
					const s = this.getShape(id)!
					const localRotation = this.getShapeParentTransform(id).decompose().rotation
					const localDelta = Vec2d.Rot(offset, -localRotation)

					return { id: s.id, type: s.type, x: s.x + localDelta.x, y: s.y + localDelta.y }
				})
			)
		})

		return this
	}

	/**
	 * Get an exported SVG of the given shapes.
	 *
	 * @param ids - The shapes (or shape ids) to export.
	 * @param opts - Options for the export.
	 *
	 * @returns The SVG element.
	 *
	 * @public
	 */
	async getSvg(
		shapes: TLShapeId[] | TLShape[],
		opts = {} as Partial<{
			scale: number
			background: boolean
			padding: number
			darkMode?: boolean
			preserveAspectRatio: React.SVGAttributes<SVGSVGElement>['preserveAspectRatio']
		}>
	) {
		const ids =
			typeof shapes[0] === 'string'
				? (shapes as TLShapeId[])
				: (shapes as TLShape[]).map((s) => s.id)

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
		const renderingShapes = this.getUnorderedRenderingShapes(false).filter(({ id }) =>
			shapeIdsToInclude.has(id)
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
						const bounds = this.getShapePageBounds(shape)!
						const elm = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect')
						elm.setAttribute('width', bounds.width + '')
						elm.setAttribute('height', bounds.height + '')
						elm.setAttribute('fill', theme.solid)
						elm.setAttribute('stroke', theme.grey.pattern)
						elm.setAttribute('stroke-width', '1')
						shapeSvgElement = elm
					}

					let pageTransform = this.getShapePageTransform(shape)!.toCssString()
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
					const pageMask = this.getShapeMask(shape.id)
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
		/** The most recent pointer down's position in the current page space. */
		originPagePoint: new Vec2d(),
		/** The most recent pointer down's position in screen space. */
		originScreenPoint: new Vec2d(),
		/** The previous pointer position in the current page space. */
		previousPagePoint: new Vec2d(),
		/** The previous pointer position in screen space. */
		previousScreenPoint: new Vec2d(),
		/** The most recent pointer position in the current page space. */
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
	private _selectedShapeIdsAtPointerDown: TLShapeId[] = []

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
	dispatch = (info: TLEventInfo): this => {
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
								if (!this._selectedShapeIdsAtPointerDown.length) {
									this._selectedShapeIdsAtPointerDown = this.selectedShapeIds
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

							this.setCamera({
								x: cx + dx / cz - x / cz + x / zoom,
								y: cy + dy / cz - y / cz + y / zoom,
								z: zoom,
							})

							return // Stop here!
						}
						case 'pinch_end': {
							if (!inputs.isPinching) return this

							inputs.isPinching = false
							const { _selectedShapeIdsAtPointerDown } = this
							this.setSelectedShapes(this._selectedShapeIdsAtPointerDown, { squashing: true })
							this._selectedShapeIdsAtPointerDown = []

							if (this._didPinch) {
								this._didPinch = false
								requestAnimationFrame(() => {
									if (!this._didPinch) {
										this.setSelectedShapes(_selectedShapeIdsAtPointerDown, { squashing: true })
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

							this.setCamera({
								x: cx + (x / zoom - x) - (x / cz - x),
								y: cy + (y / zoom - y) - (y / cz - y),
								z: zoom,
							})

							// We want to return here because none of the states in our
							// statechart should respond to this event (a camera zoom)
							return
						}

						// Update the camera here, which will dispatch a pointer move...
						// this will also update the pointer position, etc
						this.pan(info.delta)

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
							this._selectedShapeIdsAtPointerDown = this.selectedShapeIds

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
								this.pan(Vec2d.Sub(currentScreenPoint, previousScreenPoint))
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
