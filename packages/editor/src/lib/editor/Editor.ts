import { Atom, EMPTY_ARRAY, atom, computed, react, unsafe__withoutCapture } from '@tldraw/state'
import { ComputedCache, RecordType, StoreSideEffects } from '@tldraw/store'
import {
	CameraRecordType,
	InstancePageStateRecordType,
	PageRecordType,
	StyleProp,
	StylePropValue,
	TLAsset,
	TLAssetId,
	TLAssetPartial,
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLCamera,
	TLCreateShapePartial,
	TLCursor,
	TLDOCUMENT_ID,
	TLDocument,
	TLGroupShape,
	TLHandle,
	TLINSTANCE_ID,
	TLInstance,
	TLInstancePageState,
	TLPage,
	TLPageId,
	TLParentId,
	TLRecord,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLStore,
	TLStoreSnapshot,
	TLTheme,
	TLThemeId,
	TLThemes,
	TLUser,
	TLUserId,
	UserRecordType,
	createBindingId,
	createShapeId,
	createUserId,
	getShapePropKeysByStyle,
	isPageId,
	isShapeId,
} from '@tldraw/tlschema'
import {
	IndexKey,
	JsonObject,
	ZERO_INDEX_KEY,
	annotateError,
	areArraysShallowEqual,
	assert,
	assertExists,
	bind,
	compact,
	debounce,
	dedupe,
	exhaustiveSwitchError,
	getIndexAbove,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBetween,
	getOwnProperty,
	hasOwnProperty,
	sortById,
	sortByIndex,
	uniqueId,
} from '@tldraw/utils'
import EventEmitter from 'eventemitter3'
import { TLCurrentUser } from '../config/createTLCurrentUser'
import { TLAnyAssetUtilConstructor, checkAssets } from '../config/defaultAssets'
import { TLAnyBindingUtilConstructor, checkBindings } from '../config/defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from '../config/defaultShapes'
import {
	TLEditorSnapshot,
	TLLoadSnapshotOptions,
	getSnapshot,
	loadSnapshot,
} from '../config/TLEditorSnapshot'
import { TLI18nAdapter, defaultI18n } from '../config/TLI18n'
import { DEFAULT_ANIMATION_OPTIONS } from '../constants'
import { getOwnerWindow } from '../exports/domUtils'
import { registerMountedEditor, unregisterMountedEditor } from '../globals/editors'
import { tlmenus } from '../globals/menus'
import { tltime } from '../globals/time'
import { LicenseManager } from '../license/LicenseManager'
import { TldrawOptions, defaultTldrawOptions } from '../options'
import { cameraCapability } from '../plugins/builtin/camera'
import type { CameraController } from '../plugins/builtin/CameraController'
import { clickDetectionCapability } from '../plugins/builtin/clickDetection'
import { collaboratorsCapability } from '../plugins/builtin/collaborators'
import type { ContentController } from '../plugins/builtin/ContentController'
import { contentTransferCapability } from '../plugins/builtin/contentTransfer'
import { containerFocusCapability } from '../plugins/builtin/domFocus'
import { edgeScrollCapability } from '../plugins/builtin/edgeScroll'
import { editingCapability } from '../plugins/builtin/editing'
import type { EditingController } from '../plugins/builtin/EditingController'
import { eventDispatchCapability } from '../plugins/builtin/eventDispatch'
import type { EventDispatcher } from '../plugins/builtin/EventDispatcher'
import {
	TLExternalAssetHandlers,
	TLExternalContentHandlers,
	externalContentCapability,
} from '../plugins/builtin/externalContent'
import { fontsCapability } from '../plugins/builtin/fonts'
import { imageExportCapability } from '../plugins/builtin/imageExport'
import { inputsCapability } from '../plugins/builtin/inputs'
import { overlaysCapability } from '../plugins/builtin/overlays'
import { performanceCapability } from '../plugins/builtin/performance'
import { scribblesCapability } from '../plugins/builtin/scribbles'
import { selectionCapability } from '../plugins/builtin/selection'
import type { SelectionController } from '../plugins/builtin/SelectionController'
import { shapeAnimationCapability } from '../plugins/builtin/shapeAnimation'
import type { ShapeAnimator } from '../plugins/builtin/ShapeAnimator'
import { shapeArrangementCapability } from '../plugins/builtin/shapeArrangement'
import type { ShapeArranger } from '../plugins/builtin/ShapeArranger'
import { snappingCapability } from '../plugins/builtin/snapping'
import { spatialIndexCapability } from '../plugins/builtin/spatialIndex'
import type { StyleController } from '../plugins/builtin/StyleController'
import { stylesCapability } from '../plugins/builtin/styles'
import { svgExportCapability } from '../plugins/builtin/svgExport'
import { TLTextMeasurer, textMeasurementCapability } from '../plugins/builtin/textMeasurement'
import { themesCapability } from '../plugins/builtin/themes'
import { userPreferencesCapability } from '../plugins/builtin/userPreferences'
import { createKernelPlugins } from '../plugins/kernelPlugins'
import type { TLPlugin } from '../plugins/plugin'
import { TLPluginHost } from '../plugins/PluginHost'
import { Box, BoxLike } from '../primitives/Box'
import { Geometry2d } from '../primitives/geometry/Geometry2d'
import { Group2d } from '../primitives/geometry/Group2d'
import { intersectPolygonPolygon } from '../primitives/intersect'
import { Mat, MatLike } from '../primitives/Mat'
import {
	approximately,
	areAnglesCompatible,
	pointInPolygon,
	shortAngleDist,
} from '../primitives/utils'
import { Vec, VecLike } from '../primitives/Vec'
import { areShapesContentEqual } from '../utils/areShapesContentEqual'
import {
	TLDeepLink,
	TLDeepLinkOptions,
	createDeepLinkString,
	parseDeepLinkString,
} from '../utils/deepLinks'
import { getIncrementedName } from '../utils/getIncrementedName'
import { getReorderingShapesChanges } from '../utils/reorderShapes'
import { TLTextOptions, TiptapEditor } from '../utils/richText'
import { applyRotationToSnapshotShapes, getRotationSnapshot } from '../utils/rotation'
import { ReadonlySharedStyleMap, SharedStyle } from '../utils/SharedStylesMap'
import { AssetUtil } from './assets/AssetUtil'
import { BindingOnDeleteOptions, BindingUtil } from './bindings/BindingUtil'
import { bindingsIndex } from './derivations/bindingsIndex'
import { notVisibleShapes } from './derivations/notVisibleShapes'
import { parentsToChildren } from './derivations/parentsToChildren'
import { deriveShapeIdsInCurrentPage } from './derivations/shapeIdsInCurrentPage'
import type { ClickManager } from './managers/ClickManager/ClickManager'
import type { CollaboratorsManager } from './managers/CollaboratorsManager/CollaboratorsManager'
import type { EdgeScrollManager } from './managers/EdgeScrollManager/EdgeScrollManager'
import type { FontManager } from './managers/FontManager/FontManager'
import { HistoryManager } from './managers/HistoryManager/HistoryManager'
import type { InputsManager } from './managers/InputsManager/InputsManager'
import type { PerformanceManager } from './managers/PerformanceManager/PerformanceManager'
import type { ScribbleManager } from './managers/ScribbleManager/ScribbleManager'
import type { SnapManager } from './managers/SnapManager/SnapManager'
import type { SpatialIndexManager } from './managers/SpatialIndexManager/SpatialIndexManager'
import type { ThemeManager } from './managers/ThemeManager/ThemeManager'
import type { UserPreferencesManager } from './managers/UserPreferencesManager/UserPreferencesManager'
import type { OverlayManager } from './overlays/OverlayManager'
import { TLAnyOverlayUtilConstructor } from './overlays/OverlayUtil'
import {
	alertMaxShapes,
	applyPartialToRecordWithProps,
	toShapeIds,
	withIsolatedShapes,
} from './recordUtils'
import {
	ShapeUtil,
	TLEditStartInfo,
	TLGeometryOpts,
	TLResizeMode,
	TLShapeUtilCanBindOpts,
} from './shapes/ShapeUtil'
import { RootState } from './tools/RootState'
import { StateNode, TLStateNodeConstructor } from './tools/StateNode'
import { TLContent } from './types/clipboard-types'
import { TLEventMap } from './types/emit-types'
import {
	TLCancelEventInfo,
	TLCompleteEventInfo,
	TLEventInfo,
	TLInterruptEventInfo,
	TLPointerEventInfo,
} from './types/event-types'
import { TLExternalAsset, TLExternalContent } from './types/external-content'
import { TLHistoryBatchOptions } from './types/history-types'
import {
	OptionalKeys,
	RequiredKeys,
	TLCameraMoveOptions,
	TLCameraOptions,
	TLGetShapeAtPointOptions,
	TLImageExportOptions,
	TLSvgExportOptions,
	TLUpdatePointerOptions,
} from './types/misc-types'
import { TLAdjacentDirection, TLResizeHandle } from './types/selection-types'

/** @public */
export type TLResizeShapeOptions = Partial<{
	initialBounds: Box
	scaleOrigin: VecLike
	scaleAxisRotation: number
	initialShape: TLShape
	initialPageTransform: MatLike
	dragHandle: TLResizeHandle
	isAspectRatioLocked: boolean
	mode: TLResizeMode
	skipStartAndEndCallbacks: boolean
}>

/** @public */
export interface TLEditorOptions {
	/**
	 * The Store instance to use for keeping the editor's data. This may be prepopulated, e.g. by loading
	 * from a server or database.
	 */
	store: TLStore
	/**
	 * An array of shapes to use in the editor. These will be used to create and manage shapes in the editor.
	 */
	shapeUtils: readonly TLAnyShapeUtilConstructor[]
	/**
	 * An array of bindings to use in the editor. These will be used to create and manage bindings in the editor.
	 */
	bindingUtils: readonly TLAnyBindingUtilConstructor[]
	/**
	 * An array of asset utils to use in the editor. These will be used to handle asset-type-specific behavior.
	 */
	assetUtils?: readonly TLAnyAssetUtilConstructor[]
	/**
	 * An array of overlay utils to use in the editor. These define canvas overlay UI elements
	 * like selection handles, rotation corners, shape handles, etc.
	 */
	overlayUtils?: readonly TLAnyOverlayUtilConstructor[]
	/**
	 * An array of tools to use in the editor. These will be used to handle events and manage user interactions in the editor.
	 */
	tools: readonly TLStateNodeConstructor[]
	/**
	 * Every plugin that the editor installs. Their shape utils, binding utils and tools are added
	 * to the ones above. Defaults to {@link createDefaultPlugins}. To keep the defaults and add
	 * your own, pass `[...createDefaultPlugins(), ...yours]`.
	 */
	plugins?: readonly TLPlugin[]
	/**
	 * A user defined externally to replace the default user.
	 */
	user?: TLCurrentUser
	/**
	 * The editor's initial active tool (or other state node id).
	 */
	initialState?: string
	/**
	 * Whether to automatically focus the editor when it mounts.
	 */
	autoFocus?: boolean
	licenseKey?: string
	fontAssetUrls?: { [key: string]: string | undefined }
	/**
	 * Should return a containing html element which has all the styles applied to the editor. If not
	 * given, the body element will be used.
	 */
	getContainer(): HTMLElement

	/**
	 * An i18n adapter for translating strings.
	 */
	i18n?: TLI18nAdapter
	/**
	 * Provides a way to hide shapes.
	 *
	 * @example
	 * ```ts
	 * getShapeVisibility={(shape, editor) => shape.meta.hidden ? 'hidden' : 'inherit'}
	 * ```
	 *
	 * - `'inherit' | undefined` - (default) The shape will be visible unless its parent is hidden.
	 * - `'hidden'` - The shape will be hidden.
	 * - `'visible'` - The shape will be visible.
	 *
	 * @param shape - The shape to check.
	 * @param editor - The editor instance.
	 */
	getShapeVisibility?(
		shape: TLShape,
		editor: Editor
	): 'visible' | 'hidden' | 'inherit' | null | undefined
	/**
	 * Named theme definitions for the editor. Each theme contains shared
	 * properties (font size, line height, stroke width) and color palettes
	 * for both light and dark modes.
	 */
	themes?: Partial<TLThemes>
	/**
	 * The id of the initially active theme. Defaults to `'default'`.
	 */
	initialTheme?: TLThemeId
	/**
	 * The editor's color scheme preference, controls the default color mode. Defaults to `'light'`.
	 *
	 * - `'light'` - Always use light mode.
	 * - `'dark'` - Always use dark mode.
	 * - `'system'` - Follow the OS color scheme preference.
	 */
	colorScheme?: 'light' | 'dark' | 'system'
	/**
	 * Additional configuration options for the tldraw editor.
	 */
	options?: Partial<TldrawOptions>
	// --- Deprecated ----
	/**
	 * Options for the editor's camera.
	 *
	 * @deprecated Use `options.cameraOptions` instead. This will be removed in a future release.
	 */
	cameraOptions?: Partial<TLCameraOptions>
	/**
	 * Text options for the editor.
	 *
	 * @deprecated Use `options.text` instead. This prop will be removed in a future release.
	 */
	textOptions?: TLTextOptions
}

/**
 * Options for {@link Editor.(run:1)}.
 * @public
 */
export interface TLEditorRunOptions extends TLHistoryBatchOptions {
	ignoreShapeLock?: boolean
}

/** @public */
export interface TLRenderingShape {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
}

const RENDERING_SHAPES_SORT_CACHE_THRESHOLD = 100

// The plugins for `new Editor()` without `plugins`. Here they are the kernel plugins. The
// `@tldraw/editor` entry sets this to `createDefaultPlugins`, which adds the DOM and React
// plugins, so that this module does not import React and `createEditor` stays headless.
let createDefaultEditorPlugins: () => readonly TLPlugin[] = createKernelPlugins

/** @internal */
export function setDefaultEditorPlugins(create: () => readonly TLPlugin[]) {
	createDefaultEditorPlugins = create
}

/** @public */
export class Editor extends EventEmitter<TLEventMap> {
	readonly id = uniqueId()
	constructor(editorOptions: TLEditorOptions) {
		super()
		const {
			store,
			shapeUtils,
			bindingUtils,
			assetUtils: assetUtilConstructors,
			tools,
			plugins = createDefaultEditorPlugins(),
			getContainer,
			initialState,
			autoFocus,
			options: _options,
			// needs to be here for backwards compatibility with TldrawEditor
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			textOptions: _textOptions,
			getShapeVisibility,
			i18n,
		} = editorOptions

		this.i18n = i18n ?? defaultI18n
		this._getShapeVisibility = getShapeVisibility

		// Merge deprecated textOptions prop with options.text
		// options.text takes precedence over the deprecated textOptions prop
		const options = _textOptions ? { ..._options, text: _options?.text ?? _textOptions } : _options

		this.options = { ...defaultTldrawOptions, ...options }

		this.store = store
		this.history = new HistoryManager<TLRecord>({
			store,
			annotateError: (error: any) => {
				this.annotateError(error, { origin: 'history.batch', willCrashApp: true })
				this.crash(error)
			},
		})

		this.plugins = new TLPluginHost(this, plugins, editorOptions)
		const installedPlugins = this.plugins.getPlugins()
		// Members that predate plugins are facades over plugin capabilities. Until setup, they
		// forward to the capability once its plugin has set up. After setup (below), they are the
		// capability itself, or a stub that throws when no plugin provides it.
		Object.assign(this, this._getPluginFacades())

		this.disposables.add(this.timers.dispose)

		this.getContainer = getContainer

		this._textOptions = atom('text options', options?.text ?? null)

		class NewRoot extends RootState {
			static override initial = initialState ?? ''
		}

		this.root = new NewRoot(this)
		this.root.children = {}

		this.markEventAsHandled = this.markEventAsHandled.bind(this)

		const allShapeUtils = checkShapesAndAddCore([
			...shapeUtils,
			...installedPlugins.flatMap((p) => p.shapeUtils ?? []),
		])

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

		const _shapeUtilsByAssetType = {} as Record<string, ShapeUtil<any>>
		for (const Util of allShapeUtils) {
			const assetTypes = Util.handledAssetTypes
			if (assetTypes) {
				for (const assetType of assetTypes) {
					_shapeUtilsByAssetType[assetType] = _shapeUtils[Util.type]
				}
			}
		}
		this._shapeUtilsByAssetType = _shapeUtilsByAssetType

		const allBindingUtils = checkBindings([
			...bindingUtils,
			...installedPlugins.flatMap((p) => p.bindingUtils ?? []),
		])
		const _bindingUtils = {} as Record<string, BindingUtil<any>>
		for (const Util of allBindingUtils) {
			const util = new Util(this)
			_bindingUtils[Util.type] = util
		}
		this.bindingUtils = _bindingUtils

		// Asset utils
		if (assetUtilConstructors) {
			const allAssetUtils = checkAssets(assetUtilConstructors)
			const _assetUtils = {} as Record<string, AssetUtil<any>>
			for (const Util of allAssetUtils) {
				const util = new Util(this)
				_assetUtils[Util.type] = util
			}
			this.assetUtils = _assetUtils
		}

		// Tools.
		// Accept tools from constructor parameters which may not conflict with the root note's default or
		// "baked in" tools, select and zoom.
		for (const Tool of [...tools, ...installedPlugins.flatMap((p) => p.tools ?? [])]) {
			if (hasOwnProperty(this.root.children!, Tool.id)) {
				throw Error(`Can't override tool with id "${Tool.id}"`)
			}
			this.root.children![Tool.id] = new Tool(this, this.root)
		}

		// Cleanup

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

			if (
				prevPageState.croppingShapeId &&
				shapesNoLongerInPage.has(prevPageState.croppingShapeId)
			) {
				if (!nextPageState) nextPageState = { ...prevPageState }
				nextPageState.croppingShapeId = null
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

		this.sideEffects = this.store.sideEffects

		let deletedBindings = new Map<TLBindingId, BindingOnDeleteOptions<any>>()
		const deletedShapeIds = new Set<TLShapeId>()
		const invalidParents = new Set<TLShapeId>()
		const createdShapes = new Set<TLShapeId>()
		let invalidBindingTypes = new Set<TLBinding['type']>()

		this.disposables.add(
			this.sideEffects.registerOperationCompleteHandler(() => {
				// this needs to be cleared here because further effects may delete more shapes
				// and we want the next invocation of this handler to handle those separately
				const deletedIds = deletedShapeIds.size ? new Set(deletedShapeIds) : null
				deletedShapeIds.clear()

				if (deletedIds) {
					const updates = compact(
						this.getPageStates().map((pageState) => {
							return cleanupInstancePageState(pageState, deletedIds)
						})
					)

					if (updates.length) {
						this.store.put(updates)
					}
				}

				const justCreatedShapeIds = new Set(createdShapes)
				createdShapes.clear()

				for (const parentId of invalidParents) {
					invalidParents.delete(parentId)
					if (justCreatedShapeIds.has(parentId)) continue
					const parent = this.getShape(parentId)
					if (!parent) continue

					const util = this.getShapeUtil(parent)
					const changes = util.onChildrenChange?.(parent)

					if (changes?.length) {
						this.updateShapes(changes)
					}
				}

				if (invalidBindingTypes.size) {
					const t = invalidBindingTypes
					invalidBindingTypes = new Set()
					for (const type of t) {
						const util = this.getBindingUtil(type)
						util.onOperationComplete?.()
					}
				}

				if (deletedBindings.size) {
					const t = deletedBindings
					deletedBindings = new Map()
					for (const opts of t.values()) {
						this.getBindingUtil(opts.binding).onAfterDelete?.(opts)
					}
				}

				this.emit('update')
			})
		)

		this.disposables.add(
			this.sideEffects.register({
				shape: {
					afterCreate: (shape) => {
						createdShapes.add(shape.id)
						if (shape.parentId && isShapeId(shape.parentId)) {
							invalidParents.add(shape.parentId)
						}
					},
					afterChange: (shapeBefore, shapeAfter) => {
						for (const binding of this.getBindingsInvolvingShape(shapeAfter)) {
							invalidBindingTypes.add(binding.type)
							if (binding.fromId === shapeAfter.id) {
								this.getBindingUtil(binding).onAfterChangeFromShape?.({
									binding,
									shapeBefore,
									shapeAfter,
									reason: 'self',
								})
							}
							if (binding.toId === shapeAfter.id) {
								this.getBindingUtil(binding).onAfterChangeToShape?.({
									binding,
									shapeBefore,
									shapeAfter,
									reason: 'self',
								})
							}
						}

						// if the shape's parent changed and it has a binding, update the binding
						if (shapeBefore.parentId !== shapeAfter.parentId) {
							const notifyBindingAncestryChange = (id: TLShapeId) => {
								const descendantShape = this.getShape(id)
								if (!descendantShape) return

								for (const binding of this.getBindingsInvolvingShape(descendantShape)) {
									invalidBindingTypes.add(binding.type)

									if (binding.fromId === descendantShape.id) {
										this.getBindingUtil(binding).onAfterChangeFromShape?.({
											binding,
											shapeBefore: descendantShape,
											shapeAfter: descendantShape,
											reason: 'ancestry',
										})
									}
									if (binding.toId === descendantShape.id) {
										this.getBindingUtil(binding).onAfterChangeToShape?.({
											binding,
											shapeBefore: descendantShape,
											shapeAfter: descendantShape,
											reason: 'ancestry',
										})
									}
								}
							}
							notifyBindingAncestryChange(shapeAfter.id)
							this.visitDescendants(shapeAfter.id, notifyBindingAncestryChange)
						}

						// if this shape moved to a new page, clean up any previous page's instance state
						if (shapeBefore.parentId !== shapeAfter.parentId && isPageId(shapeAfter.parentId)) {
							const allMovingIds = new Set([shapeBefore.id])
							this.visitDescendants(shapeBefore.id, (id) => {
								allMovingIds.add(id)
							})

							for (const instancePageState of this.getPageStates()) {
								if (instancePageState.pageId === shapeAfter.parentId) continue
								const nextPageState = cleanupInstancePageState(instancePageState, allMovingIds)

								if (nextPageState) {
									this.store.put([nextPageState])
								}
							}
						}

						if (shapeBefore.parentId && isShapeId(shapeBefore.parentId)) {
							invalidParents.add(shapeBefore.parentId)
						}

						if (shapeAfter.parentId !== shapeBefore.parentId && isShapeId(shapeAfter.parentId)) {
							invalidParents.add(shapeAfter.parentId)
						}
					},
					beforeDelete: (shape) => {
						// if we triggered this delete with a recursive call, don't do anything
						if (deletedShapeIds.has(shape.id)) return
						// if the deleted shape has a parent shape make sure we call it's onChildrenChange callback
						if (shape.parentId && isShapeId(shape.parentId)) {
							invalidParents.add(shape.parentId)
						}

						deletedShapeIds.add(shape.id)

						const deleteBindingIds: TLBindingId[] = []
						for (const binding of this.getBindingsInvolvingShape(shape)) {
							invalidBindingTypes.add(binding.type)
							deleteBindingIds.push(binding.id)
							const util = this.getBindingUtil(binding)
							if (binding.fromId === shape.id) {
								util.onBeforeIsolateToShape?.({ binding, removedShape: shape })
								util.onBeforeDeleteFromShape?.({ binding, shape })
							} else {
								util.onBeforeIsolateFromShape?.({ binding, removedShape: shape })
								util.onBeforeDeleteToShape?.({ binding, shape })
							}
						}

						if (deleteBindingIds.length) {
							// straight to the store: this cleanup must run even when deleteBindings would
							// refuse (readonly), e.g. for a deletion that arrived from a remote peer
							this.store.remove(deleteBindingIds)
						}
					},
				},
				binding: {
					beforeCreate: (binding) => {
						const next = this.getBindingUtil(binding).onBeforeCreate?.({ binding })
						if (next) return next
						return binding
					},
					afterCreate: (binding) => {
						invalidBindingTypes.add(binding.type)
						this.getBindingUtil(binding).onAfterCreate?.({ binding })
					},
					beforeChange: (bindingBefore, bindingAfter) => {
						const updated = this.getBindingUtil(bindingAfter).onBeforeChange?.({
							bindingBefore,
							bindingAfter,
						})
						if (updated) return updated
						return bindingAfter
					},
					afterChange: (bindingBefore, bindingAfter) => {
						invalidBindingTypes.add(bindingAfter.type)
						this.getBindingUtil(bindingAfter).onAfterChange?.({ bindingBefore, bindingAfter })
					},
					beforeDelete: (binding) => {
						this.getBindingUtil(binding).onBeforeDelete?.({ binding })
					},
					afterDelete: (binding) => {
						this.getBindingUtil(binding).onAfterDelete?.({ binding })
						invalidBindingTypes.add(binding.type)
					},
				},
				page: {
					afterCreate: (record) => {
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
					},
					afterDelete: (record, source) => {
						// page was deleted, need to check whether it's the current page and select another one if so
						if (this.getInstanceState()?.currentPageId === record.id) {
							const backupPageId = this.getPages().find((p) => p.id !== record.id)?.id
							if (backupPageId) {
								this.store.put([{ ...this.getInstanceState(), currentPageId: backupPageId }])
							} else if (source === 'user') {
								// fall back to ensureStoreIsUsable:
								this.store.ensureStoreIsUsable()
							}
						}

						// delete the camera and state for the page if necessary
						const cameraId = CameraRecordType.createId(record.id)
						const instance_PageStateId = InstancePageStateRecordType.createId(record.id)
						this.store.remove([cameraId, instance_PageStateId])
					},
				},
				instance: {
					afterChange: (prev, next, source) => {
						// instance should never be updated to a page that no longer exists (this can
						// happen when undoing a change that involves switching to a page that has since
						// been deleted by another user)
						if (!this.store.has(next.currentPageId)) {
							const backupPageId = this.store.has(prev.currentPageId)
								? prev.currentPageId
								: this.getPages()[0]?.id
							if (backupPageId) {
								this.store.update(next.id, (instance) => ({
									...instance,
									currentPageId: backupPageId,
								}))
							} else if (source === 'user') {
								// fall back to ensureStoreIsUsable:
								this.store.ensureStoreIsUsable()
							}
						}
					},
				},
				instance_page_state: {
					afterChange: (prev, next) => {
						if (prev?.focusedGroupId !== next?.focusedGroupId) {
							this.cancelDoubleClick()
						}

						if (prev?.selectedShapeIds !== next?.selectedShapeIds) {
							// ensure that descendants and ancestors are not selected at the same time
							const selectedShapeIds = new Set(next.selectedShapeIds)
							const filtered = next.selectedShapeIds.filter((id) => {
								let parentId = this.getShape(id)?.parentId
								while (isShapeId(parentId)) {
									if (selectedShapeIds.has(parentId)) {
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
									(shape) => this.isShapeOfType(shape, 'group')
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
									{
										...next,
										selectedShapeIds: filtered,
										focusedGroupId: nextFocusedGroupId ?? null,
									},
								])
							}
						}
					},
				},
			})
		)

		this._currentPageShapeIds = deriveShapeIdsInCurrentPage(this.store, () =>
			this.getCurrentPageId()
		)
		this._parentIdsToChildIds = parentsToChildren(this.store)

		this.disposables.add(
			this.store.listen((changes) => {
				this.emit('change', changes)
			})
		)
		this.disposables.add(this.history.dispose)

		this.run(
			() => {
				this.store.ensureStoreIsUsable()

				// clear ephemeral state
				this._updateCurrentPageState({
					editingShapeId: null,
					hoveredShapeId: null,
					erasingShapeIds: [],
				})
			},
			{ history: 'ignore' }
		)

		if (initialState && this.root.children[initialState] === undefined) {
			throw Error(`No state found for initialState "${initialState}".`)
		}

		// Plugins set up when the rest of the core exists (utils, tools and store side effects),
		// and before the first tool is entered.
		this.plugins.setup()
		this.disposables.add(() => this.plugins.dispose())
		Object.assign(this, this._getPluginFacades())

		this.root.enter(undefined, 'initial')

		if (!!autoFocus !== this.getInstanceState().isFocused) {
			this.updateInstanceState({ isFocused: !!autoFocus })
		}

		if (this.getInstanceState().followingUserId) {
			this.stopFollowingUser()
		}

		// The event dispatcher batches pointer moves until the next tick.
		const events = this.plugins.getOptional(eventDispatchCapability)
		if (events) this.on('tick', events._flushEventsForTick)

		this.on('mount', () => {
			this._isMounted.set(true)
			registerMountedEditor(this)
		})

		this.on('unmount', () => {
			this._isMounted.set(false)
			unregisterMountedEditor(this)
		})

		if (this.store.props.collaboration?.mode) {
			const mode = this.store.props.collaboration.mode
			this.disposables.add(
				react('update collaboration mode', () => {
					const isReadonly = mode.get() === 'readonly'
					// only track `mode`, and keep the sync out of the user's undo history
					unsafe__withoutCapture(() =>
						this._updateInstanceState({ isReadonly }, { history: 'ignore' })
					)
				})
			)
		}

		this.disposables.add(
			react('sync current user record', () => {
				const user = this.store.props.users.currentUser.get()
				if (user) {
					this._ensureUserRecord(user)
				}
			})
		)
	}

	private readonly _getShapeVisibility?: TLEditorOptions['getShapeVisibility']

	@computed
	private getIsShapeHiddenCache() {
		if (!this._getShapeVisibility) return null
		return this.store.createComputedCache<boolean, TLShape>('isShapeHidden', (shape: TLShape) => {
			const visibility = this._getShapeVisibility!(shape, this)
			const isParentHidden = PageRecordType.isId(shape.parentId)
				? false
				: this.isShapeHidden(shape.parentId)

			if (isParentHidden) return visibility !== 'visible'
			return visibility === 'hidden'
		})
	}
	isShapeHidden(shapeOrId: TLShape | TLShapeId): boolean {
		if (!this._getShapeVisibility) return false
		return !!this.getIsShapeHiddenCache!()!.get(
			typeof shapeOrId === 'string' ? shapeOrId : shapeOrId.id
		)
	}

	readonly options: TldrawOptions

	/**
	 * The license manager whose feature flags apply to this editor. Assigned by `<TldrawEditor />`
	 * when it creates the editor, so that UI rendered outside the editor tree can resolve the
	 * editor's license through the editor instance. Undefined for editors created directly.
	 *
	 * @internal
	 */
	licenseManager?: LicenseManager

	readonly contextId = uniqueId()

	/**
	 * The i18n adapter for translating strings.
	 *
	 * @public
	 */
	readonly i18n: TLI18nAdapter

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
	readonly root: StateNode

	/**
	 * Set a tool. Useful if you need to add a tool to the state chart on demand,
	 * after the editor has already been initialized.
	 *
	 * @param Tool - The tool to set.
	 * @param parent - The parent state node to set the tool on.
	 *
	 * @public
	 */
	setTool(Tool: TLStateNodeConstructor, parent?: StateNode) {
		parent ??= this.root
		if (hasOwnProperty(parent.children!, Tool.id)) {
			throw Error(`Can't override tool with id "${Tool.id}"`)
		}
		parent.children![Tool.id] = new Tool(this, parent)
	}

	/**
	 * Remove a tool. Useful if you need to remove a tool from the state chart on demand,
	 * after the editor has already been initialized.
	 *
	 * @param Tool - The tool to delete.
	 * @param parent - The parent state node to remove the tool from.
	 *
	 * @public
	 */
	removeTool(Tool: TLStateNodeConstructor, parent?: StateNode) {
		parent ??= this.root
		if (hasOwnProperty(parent.children!, Tool.id)) {
			delete parent.children![Tool.id]
		}
	}

	/**
	 * A set of functions to call when the editor is disposed.
	 *
	 * @public
	 */
	readonly disposables = new Set<() => void>()

	/**
	 * Whether the editor is disposed.
	 *
	 * @public
	 */
	isDisposed = false

	private readonly _isMounted = atom('isMounted', false)

	/**
	 * Whether the editor is currently mounted. This is `true` while the editor's component is
	 * mounted in the DOM (after the `mount` event) and `false` before mount and after `unmount`.
	 *
	 * Unlike disposal, mounting is not terminal: the editor's component can unmount and remount
	 * (for example when the canvas is replaced by an error fallback and restored) without the
	 * editor itself being disposed. To react to the transitions, listen to the editor's `mount`
	 * and `unmount` events.
	 *
	 * @public
	 */
	@computed getIsMounted(): boolean {
		return this._isMounted.get()
	}

	/**
	 * A manager for the editor's input state.
	 *
	 * @public
	 */
	readonly inputs!: InputsManager

	/**
	 * The editor's plugins: their capabilities and slot contributions.
	 *
	 * @public
	 */
	readonly plugins: TLPluginHost

	/**
	 * The editor members that forward to plugin capabilities. The constructor assigns them twice.
	 * Before plugin setup they forward to their capability once its plugin has set up, so a plugin
	 * can use another plugin's member during setup. After setup they are the capability itself, or
	 * a stub that throws when no plugin provides it.
	 */
	private _getPluginFacades() {
		const p = this.plugins
		return {
			_camera: p.facade(cameraCapability, (c) => c),
			_eventDispatcher: p.facade(eventDispatchCapability, (c) => c),
			_arranger: p.facade(shapeArrangementCapability, (c) => c),
			_shapeAnimator: p.facade(shapeAnimationCapability, (c) => c),
			_editing: p.facade(editingCapability, (c) => c),
			_selection: p.facade(selectionCapability, (c) => c),
			_contentTransfer: p.facade(contentTransferCapability, (c) => c),
			_styles: p.facade(stylesCapability, (c) => c),
			snaps: p.facade(snappingCapability, (c) => c),
			textMeasure: p.facade(textMeasurementCapability, (c) => c),
			externalContentHandlers: p.facade(externalContentCapability, (c) => c.contentHandlers),
			externalAssetContentHandlers: p.facade(externalContentCapability, (c) => c.assetHandlers),
			user: p.facade(userPreferencesCapability, (c) => c),
			_themeManager: p.facade(themesCapability, (c) => c),
			inputs: p.facade(inputsCapability, (c) => c),
			_clickManager: p.facade(clickDetectionCapability, (c) => c),
			_spatialIndex: p.facade(spatialIndexCapability, (c) => c),
			scribbles: p.facade(scribblesCapability, (c) => c),
			edgeScrollManager: p.facade(edgeScrollCapability, (c) => c),
			overlays: p.facade(overlaysCapability, (c) => c),
			collaborators: p.facade(collaboratorsCapability, (c) => c),
			performance: p.facade(performanceCapability, (c) => c),
			fonts: p.facade(fontsCapability, (c) => c),
		}
	}

	/**
	 * A manager for the editor's snapping feature. The snapping plugin provides it.
	 *
	 * @public
	 */
	readonly snaps!: SnapManager

	/** @internal */
	readonly _camera!: CameraController

	/** @internal */
	readonly _eventDispatcher!: EventDispatcher

	/** @internal */
	readonly _arranger!: ShapeArranger

	/** @internal */
	readonly _shapeAnimator!: ShapeAnimator

	/** @internal */
	readonly _editing!: EditingController

	/** @internal */
	readonly _selection!: SelectionController

	/** @internal */
	readonly _contentTransfer!: ContentController

	/** @internal */
	readonly _styles!: StyleController

	/**
	 * A manager for performance measurement hooks.
	 *
	 * @public
	 */
	readonly performance!: PerformanceManager

	/**
	 * A manager for the spatial index, tracking where shapes exist on the canvas.
	 *
	 * @internal
	 */
	private readonly _spatialIndex!: SpatialIndexManager

	/**
	 * A manager for the any asynchronous events and making sure they're
	 * cleaned up upon disposal.
	 *
	 * @public
	 */
	readonly timers = tltime.forContext(this.contextId)

	/**
	 * A manager for remote peer collaborators connected to this editor.
	 *
	 * @public
	 */
	readonly collaborators!: CollaboratorsManager

	/**
	 * A manager for the user and their preferences.
	 *
	 * @public
	 */
	readonly user!: UserPreferencesManager

	/**
	 * A manager for the editor's themes.
	 *
	 * @internal
	 */
	private readonly _themeManager!: ThemeManager

	/**
	 * A helper for measuring text. A text measurement plugin provides it.
	 *
	 * @public
	 */
	readonly textMeasure!: TLTextMeasurer

	/**
	 * A utility for managing the set of fonts that should be rendered in the document.
	 *
	 * @public
	 */
	readonly fonts!: FontManager

	/**
	 * A manager for the editor's scribbles.
	 *
	 * @public
	 */
	readonly scribbles!: ScribbleManager

	/**
	 * A manager for canvas overlay UI elements (selection handles, shape handles, etc.).
	 *
	 * @public
	 */
	readonly overlays!: OverlayManager

	/**
	 * A manager for side effects and correct state enforcement. See {@link @tldraw/store#StoreSideEffects} for details.
	 *
	 * @public
	 */
	readonly sideEffects: StoreSideEffects<TLRecord>

	/**
	 * A manager for moving the camera when the mouse is at the edge of the screen.
	 *
	 * @public
	 */
	edgeScrollManager!: EdgeScrollManager

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
	 * The document that the editor's container element belongs to.
	 * Use this instead of the global `document` to support cross-window embedding.
	 *
	 * @internal
	 */
	getContainerDocument(): Document {
		return this.getContainer().ownerDocument
	}

	/**
	 * The window that the editor's container element belongs to.
	 * Use this instead of the global `window` to support cross-window embedding.
	 *
	 * @internal
	 */
	getContainerWindow(): Window & typeof globalThis {
		return getOwnerWindow(this.getContainer())
	}

	/**
	 * Dispose the editor.
	 *
	 * @public
	 */
	dispose() {
		// If the editor is disposed while still mounted (for example when its component tree is
		// unmounted all at once), emit `unmount` first — while listeners are still attached — so
		// that `mount` is always balanced by an `unmount` and `getIsMounted()` reads `false`.
		if (this._isMounted.get()) {
			this.emit('unmount')
		}
		// The unmount listener above normally handles this; unregister again in case a listener
		// threw or was removed, so a disposed editor never lingers in `tleditors`.
		unregisterMountedEditor(this)

		// Stop any in-progress camera animations and following before
		// running disposables, so their cleanup listeners fire first
		this.stopCameraAnimation()
		if (this.getInstanceState().followingUserId) {
			this.stopFollowingUser()
		}
		this.plugins.getOptional(cameraCapability)?._setCameraState('idle')

		this.disposables.forEach((dispose) => dispose())
		this.disposables.clear()

		// Clear any open menus for this editor's context
		this.menus.clearOpenMenus()

		this.store.dispose()
		this.isDisposed = true
		this.emit('dispose')
		this.removeAllListeners()
	}

	/* ------------------ Themes (shadowing the theme manager) ------------------ */

	/**
	 * Get the current color mode (`'light'` or `'dark'`), based on the user's dark mode preference.
	 *
	 * @public
	 */
	getColorMode(): 'light' | 'dark' {
		return this._themeManager.getColorMode()
	}

	/**
	 * Set the color mode. Note that this is a convenience method that passes the mode to
	 * `user.updateUserPreferences`, which is the source of truth for the user's color mode preference.
	 *
	 * @public
	 */
	setColorMode(mode: 'light' | 'dark') {
		this.user.updateUserPreferences({ colorScheme: mode })
		return this
	}

	/**
	 * Get the id of the current theme.
	 *
	 * @public
	 */
	getCurrentThemeId(): TLThemeId {
		return this._themeManager.getCurrentThemeId()
	}

	/**
	 * Get the current theme definition.
	 *
	 * @public
	 */
	getCurrentTheme(): TLTheme {
		return this._themeManager.getCurrentTheme()
	}

	/**
	 * Set the current theme by id.
	 *
	 * @public
	 */
	setCurrentTheme(id: TLThemeId) {
		this._themeManager.setCurrentTheme(id)
		return this
	}

	/**
	 * Get all registered theme definitions.
	 *
	 * @public
	 */
	getThemes(): TLThemes {
		return this._themeManager.getThemes()
	}

	/**
	 * Get a single theme definition by id.
	 *
	 * @public
	 */
	getTheme(id: TLThemeId): TLTheme | undefined {
		return this._themeManager.getTheme(id)
	}

	/**
	 * Replace all theme definitions, or update them via a callback that receives a deep copy.
	 * The `'default'` theme must always be present in the result.
	 *
	 * @example
	 * ```ts
	 * // Replace all themes
	 * editor.updateThemes({ default: myDefaultTheme, ocean: myOceanTheme })
	 *
	 * // Update via callback
	 * editor.updateThemes((themes) => {
	 *   delete themes.ocean
	 *   return themes
	 * })
	 * ```
	 *
	 * @public
	 */
	updateThemes(themes: TLThemes | ((themes: TLThemes) => TLThemes)) {
		this._themeManager.updateThemes(themes)
		return this
	}

	/**
	 * Register or update a single theme definition. The theme is keyed by its `id` property.
	 *
	 * @example
	 * ```ts
	 * // Override a property on the default theme
	 * editor.updateTheme({ ...editor.getTheme('default')!, fontSize: 24 })
	 *
	 * // Register a new theme
	 * editor.updateTheme({ id: 'ocean', ...myOceanTheme })
	 * ```
	 *
	 * @public
	 */
	updateTheme(theme: TLTheme) {
		this._themeManager.updateTheme(theme)
		return this
	}

	/* ------------------- Shape Utils ------------------ */

	/**
	 * A map of shape utility classes (TLShapeUtils) by shape type.
	 *
	 * @public
	 */
	shapeUtils: { readonly [K in string]?: ShapeUtil<TLShape> }

	/** @internal */
	private _shapeUtilsByAssetType: { readonly [K in string]?: ShapeUtil<TLShape> } = {}

	styleProps: { [key: string]: Map<StyleProp<any>, string> }

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
	getShapeUtil<K extends TLShape['type']>(type: K): ShapeUtil<Extract<TLShape, { type: K }>>
	getShapeUtil<S extends TLShape>(shape: S | TLShapePartial<S> | S['type']): ShapeUtil<S>
	getShapeUtil<T extends ShapeUtil>(type: T extends ShapeUtil<infer R> ? R['type'] : string): T
	getShapeUtil(arg: string | { type: string }) {
		const type = typeof arg === 'string' ? arg : arg.type
		const shapeUtil = getOwnProperty(this.shapeUtils, type)
		// hot path: avoid building the message (and the assert wrapper) on every successful call
		if (!shapeUtil) throw new Error(`No shape util found for type "${type}"`)
		return shapeUtil
	}

	/**
	 * Returns true if the editor has a shape util for the given shape / shape type.
	 *
	 * @param shape - A shape, shape partial, or shape type.
	 */
	hasShapeUtil(shape: TLShape | TLShapePartial<TLShape>): boolean
	hasShapeUtil(type: TLShape['type']): boolean
	hasShapeUtil<T extends ShapeUtil>(
		type: T extends ShapeUtil<infer R> ? R['type'] : string
	): boolean
	hasShapeUtil(arg: string | { type: string }): boolean {
		const type = typeof arg === 'string' ? arg : arg.type
		return hasOwnProperty(this.shapeUtils, type)
	}

	/**
	 * Get the shape util that handles the given asset type.
	 * Returns the shape util whose {@link ShapeUtil.handledAssetTypes} includes
	 * the given asset type, or undefined if none matches.
	 *
	 * @param assetType - The asset type string.
	 * @public
	 */
	getShapeUtilForAssetType(assetType: string): ShapeUtil | undefined {
		return getOwnProperty(this._shapeUtilsByAssetType, assetType)
	}

	/* ------------------- Binding Utils ------------------ */
	/**
	 * A map of shape utility classes (TLShapeUtils) by shape type.
	 *
	 * @public
	 */
	bindingUtils: { readonly [K in string]?: BindingUtil<TLBinding> }

	/**
	 * Get a binding util from a binding itself.
	 *
	 * @example
	 * ```ts
	 * const util = editor.getBindingUtil(myArrowBinding)
	 * const util = editor.getBindingUtil('arrow')
	 * const util = editor.getBindingUtil<TLArrowBinding>(myArrowBinding)
	 * const util = editor.getBindingUtil(TLArrowBinding)('arrow')
	 * ```
	 *
	 * @param binding - A binding, binding partial, or binding type.
	 *
	 * @public
	 */
	getBindingUtil<K extends TLBinding['type']>(type: K): BindingUtil<Extract<TLBinding, { type: K }>>
	getBindingUtil<S extends TLBinding>(binding: S | { type: S['type'] }): BindingUtil<S>
	getBindingUtil<T extends BindingUtil>(
		type: T extends BindingUtil<infer R> ? R['type'] : string
	): T
	getBindingUtil(arg: string | { type: string }) {
		const type = typeof arg === 'string' ? arg : arg.type
		const bindingUtil = getOwnProperty(this.bindingUtils, type)
		assert(bindingUtil, `No binding util found for type "${type}"`)
		return bindingUtil
	}

	/* ------------------- Asset Utils ------------------ */

	/**
	 * A map of asset utility classes by asset type.
	 *
	 * @public
	 */
	assetUtils: { readonly [K in string]?: AssetUtil<TLAsset> } = {}

	/**
	 * Get an asset util from an asset or asset type.
	 *
	 * @param arg - An asset, asset type string, or object with type.
	 *
	 * @public
	 */
	getAssetUtil<S extends TLAsset>(asset: S | { type: S['type'] }): AssetUtil<S>
	getAssetUtil(type: string): AssetUtil
	getAssetUtil(arg: string | { type: string }) {
		const type = typeof arg === 'string' ? arg : arg.type
		const assetUtil = getOwnProperty(this.assetUtils, type)
		assert(assetUtil, `No asset util found for type "${type}"`)
		return assetUtil
	}

	/**
	 * Returns true if the editor has an asset util for the given asset type.
	 *
	 * @public
	 */
	hasAssetUtil(arg: string | { type: string }): boolean {
		const type = typeof arg === 'string' ? arg : arg.type
		return hasOwnProperty(this.assetUtils, type)
	}

	/**
	 * Get the asset util that accepts the given MIME type.
	 * Returns null if no registered asset util accepts the MIME type.
	 *
	 * @public
	 */
	getAssetUtilForMimeType(mimeType: string): AssetUtil | null {
		for (const util of Object.values(this.assetUtils)) {
			if (util && util.acceptsMimeType(mimeType)) {
				return util
			}
		}
		return null
	}

	/* --------------------- History -------------------- */

	/**
	 * A manager for the editor's history.
	 *
	 * @readonly
	 */
	protected readonly history: HistoryManager<TLRecord>

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
		this.plugins.getOptional(eventDispatchCapability)?._flushEventsForTick(0)
		this.complete()
		this.history.undo()
		this.plugins
			.getOptional(performanceCapability)
			?._notifyUndoRedo('undo', this.history.getNumUndos(), this.history.getNumRedos())
		return this
	}

	/**
	 * Whether the editor can undo.
	 *
	 * @public
	 */
	@computed canUndo(): boolean {
		return this.history.getNumUndos() > 0
	}

	getCanUndo() {
		return this.canUndo()
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
		this.plugins.getOptional(eventDispatchCapability)?._flushEventsForTick(0)
		this.complete()
		this.history.redo()
		this.plugins
			.getOptional(performanceCapability)
			?._notifyUndoRedo('redo', this.history.getNumUndos(), this.history.getNumRedos())
		return this
	}

	/**
	 * Whether the editor can redo.
	 *
	 * @public
	 */
	@computed canRedo(): boolean {
		return this.history.getNumRedos() > 0
	}

	getCanRedo() {
		return this.canRedo()
	}

	clearHistory() {
		this.history.clear()
		return this
	}

	/**
	 * Create a new "mark", or stopping point, in the undo redo history. Creating a mark will clear
	 * any redos. You typically want to do this just before a user interaction begins or is handled.
	 *
	 * @example
	 * ```ts
	 * editor.markHistoryStoppingPoint()
	 * editor.flipShapes(editor.getSelectedShapes())
	 * ```
	 * @example
	 * ```ts
	 * const beginRotateMark = editor.markHistoryStoppingPoint()
	 * // if the use cancels the rotation, you can bail back to this mark
	 * editor.bailToMark(beginRotateMark)
	 * ```
	 *
	 * @public
	 * @param name - The name of the mark, useful for debugging the undo/redo stacks
	 * @returns a unique id for the mark that can be used with `squashToMark` or `bailToMark`.
	 */
	markHistoryStoppingPoint(name?: string): string {
		const id = `[${name ?? 'stop'}]_${uniqueId()}`
		this.history._mark(id)
		return id
	}

	/**
	 * @internal this is only used to implement some backwards-compatibility logic. Should be fine to delete after 6 months or whatever.
	 */
	getMarkIdMatching(idSubstring: string) {
		return this.history.getMarkIdMatching(idSubstring)
	}

	/**
	 * Whether the editor is currently replaying history (i.e. an undo or redo is being applied).
	 *
	 * @internal
	 */
	isReplayingHistory(): boolean {
		return this.history.isReplaying()
	}

	/**
	 * Coalesces all changes since the given mark into a single change, removing any intermediate marks.
	 *
	 * This is useful if you need to 'compress' the recent history to simplify the undo/redo experience of a complex interaction.
	 *
	 * @example
	 * ```ts
	 * const bumpShapesMark = editor.markHistoryStoppingPoint()
	 * // ... some changes
	 * editor.squashToMark(bumpShapesMark)
	 * ```
	 *
	 * @param markId - The mark id to squash to.
	 */
	squashToMark(markId: string): this {
		this.history.squashToMark(markId)
		return this
	}

	/**
	 * Undo to the closest mark, discarding the changes so they cannot be redone.
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
	 * Undo to the given mark, discarding the changes so they cannot be redone.
	 *
	 * @example
	 * ```ts
	 * const beginDrag = editor.markHistoryStoppingPoint()
	 * // ... some changes
	 * editor.bailToMark(beginDrag)
	 * ```
	 *
	 * @public
	 */
	bailToMark(id: string): this {
		this.history.bailToMark(id)
		return this
	}

	/** @internal */
	_shouldIgnoreShapeLock = false

	/**
	 * Run a function in a transaction with optional options for context.
	 * You can use the options to change the way that history is treated
	 * or allow changes to locked shapes.
	 *
	 * @example
	 * ```ts
	 * // updating with
	 * editor.run(() => {
	 * 	editor.updateShape({ ...myShape, x: 100 })
	 * }, { history: "ignore" })
	 *
	 * // forcing changes / deletions for locked shapes
	 * editor.toggleLock([myShape])
	 * editor.run(() => {
	 * 	editor.updateShape({ ...myShape, x: 100 })
	 * 	editor.deleteShape(myShape)
	 * }, { ignoreShapeLock: true }, )
	 * ```
	 *
	 * @param fn - The callback function to run.
	 * @param opts - The options for the batch.
	 *
	 *
	 * @public
	 */
	run(fn: () => void, opts?: TLEditorRunOptions): this {
		const previousIgnoreShapeLock = this._shouldIgnoreShapeLock
		this._shouldIgnoreShapeLock = opts?.ignoreShapeLock ?? previousIgnoreShapeLock
		try {
			this.history.batch(fn, opts)
		} finally {
			this._shouldIgnoreShapeLock = previousIgnoreShapeLock
		}

		return this
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
	createErrorAnnotations(origin: string, willCrashApp: boolean | 'unknown') {
		try {
			const editingShapeId = this.getEditingShapeId()
			return {
				tags: {
					origin: origin,
					willCrashApp,
				},
				extras: {
					activeStateNode: this.root.getPath(),
					selectedShapes: this.getSelectedShapes().map((s) => {
						const { props, ...rest } = s
						const { text: _text, richText: _richText, ...restProps } = props as any
						return {
							...rest,
							props: restProps,
						}
					}),
					selectionCount: this.getSelectedShapes().length,
					editingShape: editingShapeId ? this.getShape(editingShapeId) : undefined,
					inputs: this.inputs.toJson(),
					pageState: this.getCurrentPageState(),
					instanceState: this.getInstanceState(),
					collaboratorCount: this.getCollaboratorsOnCurrentPage().length,
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
	 * Instead, to listen to changes to this value, you need to listen to editor's `crash` event.
	 *
	 * @internal
	 */
	getCrashingError() {
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
	 * The editor's current path of active states.
	 *
	 * @example
	 * ```ts
	 * editor.getPath() // "select.idle"
	 * ```
	 *
	 * @public
	 */
	@computed getPath() {
		return this.root.getPath().split('root.')[1]
	}

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
			const current = state.getCurrent()
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
	@computed getCurrentTool(): StateNode {
		return this.root.getCurrent()!
	}

	/**
	 * The id of the current selected tool.
	 *
	 * @public
	 */
	@computed getCurrentToolId(): string {
		const currentTool = this.getCurrentTool()
		if (!currentTool) return ''
		return currentTool.getCurrentToolIdMask() ?? currentTool.id
	}

	/**
	 * Get a descendant by its path.
	 *
	 * @example
	 * ```ts
	 * editor.getStateDescendant('select')
	 * editor.getStateDescendant('select.brushing')
	 * ```
	 *
	 * @param path - The descendant's path of state ids, separated by periods.
	 *
	 * @public
	 */
	getStateDescendant<T extends StateNode>(path: string): T | undefined {
		const ids = path.split('.').reverse()
		let state = this.root as StateNode
		while (ids.length > 0) {
			const id = ids.pop()
			if (!id) return state as T
			const childState = state.children?.[id]
			if (!childState) return undefined
			state = childState
		}
		return state as T
	}

	/* ---------------- Document Settings --------------- */

	/**
	 * The global document settings that apply to all users.
	 *
	 * @public
	 **/
	@computed getDocumentSettings() {
		return this.store.get(TLDOCUMENT_ID)!
	}

	/**
	 * Update the global document settings that apply to all users.
	 *
	 * @public
	 **/
	updateDocumentSettings(settings: Partial<TLDocument>): this {
		if (this.getIsReadonly()) return this
		this.run(
			() => {
				this.store.put([{ ...this.getDocumentSettings(), ...settings }])
			},
			{ history: 'ignore' }
		)
		return this
	}

	/* ----------------- Instance State ----------------- */

	/**
	 * The current instance's state.
	 *
	 * @public
	 */
	@computed getInstanceState(): TLInstance {
		return this.store.get(TLINSTANCE_ID)!
	}

	/**
	 * Update the instance's state.
	 *
	 * @param partial - A partial object to update the instance state with.
	 * @param historyOptions - History batch options.
	 *
	 * @public
	 */
	updateInstanceState(
		partial: Partial<Omit<TLInstance, 'currentPageId'>>,
		historyOptions?: TLHistoryBatchOptions
	): this {
		this._updateInstanceState(partial, { history: 'ignore', ...historyOptions })

		if (partial.isChangingStyle !== undefined) {
			this.timers.clearTimeout(this._isChangingStyleTimeout)
			if (partial.isChangingStyle === true) {
				// If we've set to true, set a new reset timeout to change the value back to false after 1 seconds
				this._isChangingStyleTimeout = this.timers.setTimeout(() => {
					this._updateInstanceState({ isChangingStyle: false }, { history: 'ignore' })
				}, 1000)
			}
		}

		return this
	}

	/** @internal */
	_updateInstanceState(
		partial: Partial<Omit<TLInstance, 'currentPageId'>>,
		opts?: TLHistoryBatchOptions
	) {
		this.run(() => {
			this.store.put([
				{
					...this.getInstanceState(),
					...partial,
				},
			])
		}, opts)
	}

	/** @internal */
	private _isChangingStyleTimeout = -1 as any

	// Menus

	menus = tlmenus.forContext(this.contextId)

	/* --------------------- Cursor --------------------- */

	/**
	 * Set the cursor.
	 *
	 * No-op when the partial wouldn't change the current cursor — `setCursor`
	 * is called from pointer-move hot paths (see `updateHoveredOverlayId`,
	 * various tool states) and skipping redundant writes avoids needlessly
	 * dirtying instance state.
	 *
	 * @param cursor - The cursor to set.
	 * @public
	 */
	setCursor(cursor: Partial<TLCursor>) {
		const current = this.getInstanceState().cursor
		if (
			(cursor.type === undefined || cursor.type === current.type) &&
			(cursor.rotation === undefined || cursor.rotation === current.rotation)
		) {
			return this
		}
		this.updateInstanceState({ cursor: { ...current, ...cursor } })
		return this
	}

	/* ------------------- Page State ------------------- */

	/**
	 * Page states.
	 *
	 * @public
	 */
	@computed getPageStates(): TLInstancePageState[] {
		return this._getPageStatesQuery().get()
	}

	/** @internal */
	@computed private _getPageStatesQuery() {
		return this.store.query.records('instance_page_state')
	}

	/**
	 * The current page state.
	 *
	 * @public
	 */
	@computed getCurrentPageState(): TLInstancePageState {
		return this.store.get(this._getCurrentPageStateId())!
	}

	/** @internal */
	/** @internal */
	@computed _getCurrentPageStateId() {
		return InstancePageStateRecordType.createId(this.getCurrentPageId())
	}

	/**
	 * Update this instance's page state.
	 *
	 * @example
	 * ```ts
	 * editor.updateCurrentPageState({ id: 'page1', editingShapeId: 'shape:123' })
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 *
	 * @public
	 */
	updateCurrentPageState(
		partial: Partial<
			Omit<TLInstancePageState, 'selectedShapeIds' | 'editingShapeId' | 'pageId' | 'focusedGroupId'>
		>
	): this {
		this._updateCurrentPageState(partial)
		return this
	}

	_updateCurrentPageState(partial: Partial<Omit<TLInstancePageState, 'selectedShapeIds'>>) {
		this.store.update(partial.id ?? this.getCurrentPageState().id, (state) => ({
			...state,
			...partial,
		}))
	}

	/**
	 * The current selected ids.
	 *
	 * @public
	 */
	@computed getSelectedShapeIds() {
		return this.getCurrentPageState().selectedShapeIds
	}

	/**
	 * An array containing all of the currently selected shapes.
	 *
	 * @public
	 * @readonly
	 */
	@computed getSelectedShapes(): TLShape[] {
		return compact(this.getSelectedShapeIds().map((id) => this.store.get(id)))
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
	 * @param shapes - The shape (or shape ids) to select.
	 *
	 * @public
	 */
	setSelectedShapes(shapes: TLShapeId[] | TLShape[]): this {
		return this.run(
			() => {
				const ids = shapes.map((shape) => (typeof shape === 'string' ? shape : shape.id))
				const { selectedShapeIds: prevSelectedShapeIds } = this.getCurrentPageState()
				const prevSet = new Set(prevSelectedShapeIds)

				if (ids.length === prevSet.size && ids.every((id) => prevSet.has(id))) return null

				this.store.put([{ ...this.getCurrentPageState(), selectedShapeIds: ids }])
			},
			{ history: 'record-preserveRedoStack' }
		)
	}

	/**
	 * Determine whether or not any of a shape's ancestors are selected.
	 *
	 * @param shape - The shape (or shape id) of the shape to check.
	 *
	 * @public
	 */
	isAncestorSelected(shape: TLShape | TLShapeId): boolean {
		return this._selection.isAncestorSelected(shape)
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
	 * @param shapes - The shape (or the shape ids) to select.
	 *
	 * @public
	 */
	select(...shapes: TLShapeId[] | TLShape[]): this {
		this._selection.select(...shapes)
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
		this._selection.deselect(...shapes)
		return this
	}

	/**
	 * Select all shapes. If the user has selected shapes that share a parent,
	 * select all shapes within that parent. If the user has not selected any shapes,
	 * or if the shapes shapes are only on select all shapes on the current page.
	 *
	 * @example
	 * ```ts
	 * editor.selectAll()
	 * ```
	 *
	 * @public
	 */
	selectAll(): this {
		this._selection.selectAll()
		return this
	}

	/**
	 * Select the next shape in the reading order or in cardinal order.
	 *
	 * @example
	 * ```ts
	 * editor.selectAdjacentShape('next')
	 * ```
	 *
	 * @public
	 */
	selectAdjacentShape(direction: TLAdjacentDirection) {
		return this._selection.selectAdjacentShape(direction)
	}

	/**
	 * Generates a reading order for shapes based on rows grouping.
	 * Tries to keep a natural reading order (left-to-right, top-to-bottom).
	 * Shapes whose util returns `false` from {@link ShapeUtil.canTabTo} are left out. Locked
	 * shapes are included, so keyboard users can reach them to unlock them.
	 *
	 * @public
	 */
	getCurrentPageShapesInReadingOrder(): TLShape[] {
		return this._selection.getCurrentPageShapesInReadingOrder()
	}

	/**
	 * Sort the given shapes into reading order (left-to-right, top-to-bottom), dropping any that
	 * can't be tabbed to. Use this for the children of a frame or group, which
	 * {@link Editor.getCurrentPageShapesInReadingOrder} leaves out.
	 *
	 * @internal
	 */
	getShapesInReadingOrder(shapes: TLShape[]): TLShape[] {
		return this._selection.getShapesInReadingOrder(shapes)
	}

	/**
	 * Find the nearest adjacent shape in a specific direction.
	 *
	 * @public
	 */
	getNearestAdjacentShape(
		shapes: TLShape[],
		currentShapeId: TLShapeId,
		direction: 'left' | 'right' | 'up' | 'down'
	): TLShapeId {
		return this._selection.getNearestAdjacentShape(shapes, currentShapeId, direction)
	}

	selectParentShape() {
		return this._selection.selectParentShape()
	}

	selectFirstChildShape() {
		return this._selection.selectFirstChildShape()
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
		this._selection.selectNone()
		return this
	}

	/**
	 * The id of the editor's only selected shape.
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected shape's id.
	 *
	 * @public
	 * @readonly
	 */
	getOnlySelectedShapeId(): TLShapeId | null {
		return this._selection.getOnlySelectedShapeId()
	}

	/**
	 * The editor's only selected shape.
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected shape.
	 *
	 * @public
	 * @readonly
	 */
	getOnlySelectedShape(): TLShape | null {
		return this._selection.getOnlySelectedShape()
	}

	/**
	 * Get the page bounds of all the provided shapes.
	 *
	 * @public
	 */
	getShapesPageBounds(shapeIds: TLShapeId[]): Box | null {
		return this._selection.getShapesPageBounds(shapeIds)
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
	getSelectionPageBounds(): Box | null {
		return this._selection.getSelectionPageBounds()
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionScreenBounds(): Box | undefined {
		return this._selection.getSelectionScreenBounds()
	}

	/**
	 * @internal
	 */
	getShapesSharedRotation(shapeIds: TLShapeId[]) {
		return this._selection.getShapesSharedRotation(shapeIds)
	}

	/**
	 * The rotation of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionRotation(): number {
		return this._selection.getSelectionRotation()
	}

	/**
	 * @internal
	 */
	getShapesRotatedPageBounds(shapeIds: TLShapeId[]): Box | undefined {
		return this._selection.getShapesRotatedPageBounds(shapeIds)
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionRotatedPageBounds(): Box | undefined {
		return this._selection.getSelectionRotatedPageBounds()
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionRotatedScreenBounds(): Box | undefined {
		return this._selection.getSelectionRotatedScreenBounds()
	}

	// Focus Group

	/**
	 * The current focused group id.
	 *
	 * @public
	 */
	@computed getFocusedGroupId(): TLShapeId | TLPageId {
		return this.getCurrentPageState().focusedGroupId ?? this.getCurrentPageId()
	}

	/**
	 * The current focused group.
	 *
	 * @public
	 */
	getFocusedGroup(): TLShape | undefined {
		return this._selection.getFocusedGroup()
	}

	/**
	 * Set the current focused group shape.
	 *
	 * @param shape - The group shape id (or group shape's id) to set as the focused group shape.
	 *
	 * @public
	 */
	setFocusedGroup(shape: TLShapeId | TLGroupShape | null): this {
		this._selection.setFocusedGroup(shape)
		return this
	}

	/**
	 * Exit the current focused group, moving up to the next parent group if there is one.
	 *
	 * @public
	 */
	popFocusedGroupId(): this {
		this._selection.popFocusedGroupId()
		return this
	}

	/**
	 * The current editing shape's id.
	 *
	 * @public
	 */
	@computed getEditingShapeId(): TLShapeId | null {
		return this.getCurrentPageState().editingShapeId
	}

	/**
	 * The current editing shape.
	 *
	 * @public
	 */
	@computed getEditingShape(): TLShape | undefined {
		const editingShapeId = this.getEditingShapeId()
		return editingShapeId ? this.getShape(editingShapeId) : undefined
	}

	/**
	 * Whether the shape can be edited.
	 *
	 * @param shape - The shape (or shape id) to check if it can be edited.
	 * @param info - The info about the edit start.
	 *
	 * @public
	 * @returns true if the shape can be edited, false otherwise.
	 */
	canEditShape<T extends TLShape | TLShapeId>(shape: T | null, info?: TLEditStartInfo): shape is T {
		return this._editing.canEditShape(shape, info)
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
		this._editing.setEditingShape(shape)
		return this
	}

	/**
	 * The current editing shape's text editor.
	 *
	 * @public
	 */
	getRichTextEditor(): TiptapEditor | null {
		return this._editing.getRichTextEditor()
	}

	/**
	 * Set the current editing shape's rich text editor.
	 *
	 * @example
	 * ```ts
	 * editor.setRichTextEditor(richTextEditorView)
	 * ```
	 *
	 * @param textEditor - The text editor to set as the current editing shape's text editor.
	 *
	 * @public
	 */
	setRichTextEditor(textEditor: TiptapEditor | null) {
		return this._editing.setRichTextEditor(textEditor)
	}

	// Hovered

	/**
	 * The current hovered shape id.
	 *
	 * @readonly
	 * @public
	 */
	@computed getHoveredShapeId(): TLShapeId | null {
		return this.getCurrentPageState().hoveredShapeId
	}

	/**
	 * The current hovered shape.
	 *
	 * @public
	 */
	@computed getHoveredShape(): TLShape | undefined {
		const hoveredShapeId = this.getHoveredShapeId()
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
	 * @param shape - The shape (or shape id) to set as hovered.
	 *
	 * @public
	 */
	setHoveredShape(shape: TLShapeId | TLShape | null): this {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (id === this.getHoveredShapeId()) return this
		this.run(
			() => {
				this.updateCurrentPageState({ hoveredShapeId: id })
			},
			{ history: 'ignore' }
		)
		return this
	}

	// Hinting

	/**
	 * The editor's current hinting shape ids.
	 *
	 * @public
	 */
	@computed getHintingShapeIds() {
		return this.getCurrentPageState().hintingShapeIds
	}

	/**
	 * The editor's current hinting shapes.
	 *
	 * @public
	 */
	@computed getHintingShape() {
		const hintingShapeIds = this.getHintingShapeIds()
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
		const ids = toShapeIds(shapes)
		// always ephemeral
		this.run(
			() => {
				this._updateCurrentPageState({ hintingShapeIds: dedupe(ids) })
			},
			{ history: 'ignore' }
		)
		return this
	}

	// Erasing

	/**
	 * The editor's current erasing ids.
	 *
	 * @public
	 */
	@computed getErasingShapeIds() {
		return this.getCurrentPageState().erasingShapeIds
	}

	/**
	 * The editor's current erasing shapes.
	 *
	 * @public
	 */
	@computed getErasingShapes() {
		const erasingShapeIds = this.getErasingShapeIds()
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
		// copy before sorting: the caller may pass a store-owned (frozen) array
		const ids = toShapeIds(shapes).slice()
		ids.sort() // sort the incoming ids
		const erasingShapeIds = this.getErasingShapeIds()
		this.run(
			() => {
				// the current ids are also sorted, so a shallow comparison tells us whether they changed
				if (!areArraysShallowEqual(ids, erasingShapeIds)) {
					this._updateCurrentPageState({ erasingShapeIds: ids })
				}
			},
			{ history: 'ignore' }
		)

		return this
	}

	// Cropping

	/**
	 * The current cropping shape's id.
	 *
	 * @public
	 */
	getCroppingShapeId() {
		return this.getCurrentPageState().croppingShapeId
	}

	/**
	 * Whether the shape can be cropped.
	 *
	 * @param shape - The shape (or shape id) to check if it can be cropped.
	 *
	 * @public
	 * @returns true if the shape can be cropped, false otherwise.
	 */
	canCropShape<T extends TLShape | TLShapeId>(shape: T | null): shape is T {
		return this._editing.canCropShape(shape)
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
		this._editing.setCroppingShape(shape)
		return this
	}

	private _textOptions: Atom<TLTextOptions | null>

	/**
	 * Get the current text options.
	 *
	 * @example
	 * ```ts
	 * editor.getTextOptions()
	 * ```
	 *
	 *  @public */
	getTextOptions() {
		return assertExists(this._textOptions.get(), 'Cannot use text without setting textOptions')
	}

	/* --------------------- Camera --------------------- */

	/**
	 * The current camera.
	 *
	 * @public
	 */
	getCamera(): TLCamera {
		return this._camera.getCamera()
	}

	/**
	 * The current camera zoom level.
	 *
	 * @public
	 */
	getZoomLevel() {
		return this._camera.getZoomLevel()
	}

	/**
	 * Get the scale factor used when creating or resizing shapes in dynamic size mode.
	 *
	 * @public
	 */
	getResizeScaleFactor() {
		return this._camera.getResizeScaleFactor()
	}

	/**
	 * Get the debounced zoom level. When the camera is moving, this returns the zoom level
	 * from when the camera started moving rather than the current zoom level. This can be
	 * used to avoid expensive re-renders during camera movements.
	 *
	 * This behavior is controlled by the `useDebouncedZoom` option. When `useDebouncedZoom`
	 * is `false`, this method always returns the current zoom level.
	 *
	 * @public
	 */
	getDebouncedZoomLevel() {
		return this._camera.getDebouncedZoomLevel()
	}

	/**
	 * Get the efficient zoom level. This returns the current zoom level if there are less than a certain number of shapes on the page,
	 * otherwise it returns the debounced zoom level. This can be used to avoid expensive re-renders during camera movements.
	 *
	 * @public
	 * @example
	 * ```ts
	 * editor.getEfficientZoomLevel()
	 * ```
	 *
	 * @public
	 */
	getEfficientZoomLevel() {
		return this._camera.getEfficientZoomLevel()
	}

	/**
	 * Get the camera's initial or reset zoom level.
	 *
	 * @example
	 * ```ts
	 * editor.getInitialZoom()
	 * ```
	 *
	 * @public */
	getInitialZoom() {
		return this._camera.getInitialZoom()
	}

	/**
	 * Get the camera's base level for calculating actual zoom levels based on the zoom steps.
	 *
	 * @example
	 * ```ts
	 * editor.getBaseZoom()
	 * ```
	 *
	 * @public */
	getBaseZoom() {
		return this._camera.getBaseZoom()
	}

	/**
	 * Get the current camera options.
	 *
	 * @example
	 * ```ts
	 * editor.getCameraOptions()
	 * ```
	 *
	 *  @public */
	getCameraOptions() {
		return this._camera.getCameraOptions()
	}

	/**
	 * Set the camera options. Changing the options won't immediately change the camera itself, so you may want to call `setCamera` after changing the options.
	 *
	 * @example
	 * ```ts
	 * editor.setCameraOptions(myCameraOptions)
	 * editor.setCamera(editor.getCamera())
	 * ```
	 *
	 * @param opts - The camera options to set.
	 *
	 * @public */
	setCameraOptions(opts: Partial<TLCameraOptions>): this {
		this._camera.setCameraOptions(opts)
		return this
	}

	/**
	 * Set the current camera.
	 *
	 * @example
	 * ```ts
	 * editor.setCamera({ x: 0, y: 0})
	 * editor.setCamera({ x: 0, y: 0, z: 1.5})
	 * editor.setCamera({ x: 0, y: 0, z: 1.5}, { animation: { duration: 1000, easing: (t) => t * t } })
	 * ```
	 *
	 * @param point - The new camera position.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	setCamera(point: VecLike, opts?: TLCameraMoveOptions): this {
		this._camera.setCamera(point, opts)
		return this
	}

	/**
	 * Center the camera on a point (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.centerOnPoint({ x: 100, y: 100 })
	 * editor.centerOnPoint({ x: 100, y: 100 }, { animation: { duration: 200 } })
	 * ```
	 *
	 * @param point - The point in the current page space to center on.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	centerOnPoint(point: VecLike, opts?: TLCameraMoveOptions): this {
		this._camera.centerOnPoint(point, opts)
		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToFit()
	 * editor.zoomToFit({ animation: { duration: 200 } })
	 * ```
	 *
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomToFit(opts?: TLCameraMoveOptions): this {
		this._camera.zoomToFit(opts)
		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.resetZoom()
	 * editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
	 * editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
	 * ```
	 *
	 * @param point - The screen point to zoom out on. Defaults to the viewport screen center.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	resetZoom(point = this.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		this._camera.resetZoom(point, opts)
		return this
	}

	/**
	 * Zoom the camera in.
	 *
	 * @example
	 * ```ts
	 * editor.zoomIn()
	 * editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 200 } })
	 * editor.zoomIn(editor.inputs.getCurrentScreenPoint(), { animation: { duration: 200 } })
	 * ```
	 *
	 * @param point - The screen point to zoom in on. Defaults to the screen center
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomIn(point = this.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		this._camera.zoomIn(point, opts)
		return this
	}

	/**
	 * Zoom the camera out.
	 *
	 * @example
	 * ```ts
	 * editor.zoomOut()
	 * editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 120 } })
	 * editor.zoomOut(editor.inputs.getCurrentScreenPoint(), { animation: { duration: 120 } })
	 * ```
	 *
	 * @param point - The point to zoom out on. Defaults to the viewport screen center.
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomOut(point = this.getViewportScreenCenter(), opts?: TLCameraMoveOptions): this {
		this._camera.zoomOut(point, opts)
		return this
	}

	/**
	 * Zoom the camera to fit the current selection in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToSelection()
	 * editor.zoomToSelection({ animation: { duration: 200 } })
	 * ```
	 *
	 * @param opts - The camera move options.
	 *
	 * @public
	 */
	zoomToSelection(opts?: TLCameraMoveOptions): this {
		this._camera.zoomToSelection(opts)
		return this
	}

	/**
	 * Zoom the camera to the current selection if offscreen.
	 *
	 * @public
	 */
	zoomToSelectionIfOffscreen(
		padding = 16,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	) {
		return this._camera.zoomToSelectionIfOffscreen(padding, opts)
	}

	/**
	 * Zoom the camera to fit a bounding box (in the current page space).
	 *
	 * @example
	 * ```ts
	 * editor.zoomToBounds(myBounds)
	 * editor.zoomToBounds(myBounds, { animation: { duration: 200 } })
	 * editor.zoomToBounds(myBounds, { animation: { duration: 200 }, inset: 0, targetZoom: 1 })
	 * ```
	 *
	 * @param bounds - The bounding box.
	 * @param opts - The camera move options, target zoom, or custom inset amount.
	 *
	 * @public
	 */
	zoomToBounds(
		bounds: BoxLike,
		opts?: { targetZoom?: number; inset?: number } & TLCameraMoveOptions
	): this {
		this._camera.zoomToBounds(bounds, opts)
		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @example
	 * ```ts
	 * editor.stopCameraAnimation()
	 * ```
	 *
	 * @public
	 */
	stopCameraAnimation(): this {
		this.emit('stop-camera-animation')
		return this
	}

	/**
	 * Slide the camera in a certain direction.
	 *
	 * @example
	 * ```ts
	 * editor.slideCamera({ speed: 1, direction: { x: 1, y: 0 }, friction: 0.1 })
	 * ```
	 *
	 * @param opts - Options for the slide
	 * @public
	 */
	slideCamera(
		opts = {} as {
			speed: number
			direction: VecLike
			friction?: number
			speedThreshold?: number
			force?: boolean
		}
	): this {
		this._camera.slideCamera(opts)
		return this
	}

	/**
	 * Animate the camera to a user's cursor position. This also briefly show the user's cursor if it's not currently visible.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToUser(myUserId)
	 * editor.zoomToUser(myUserId, { animation: { duration: 200 } })
	 * ```
	 *
	 * @param userId - The id of the user to animate to.
	 * @param opts - The camera move options.
	 * @public
	 */
	zoomToUser(userId: TLUserId, opts: TLCameraMoveOptions = { animation: { duration: 500 } }): this {
		this._camera.zoomToUser(userId, opts)
		return this
	}

	/**
	 * Update the viewport. The viewport will measure the size and screen position of its container
	 * element. This should be done whenever the container's position on the screen changes.
	 *
	 * @example
	 * ```ts
	 * editor.updateViewportScreenBounds(new Box(0, 0, 1280, 1024))
	 * editor.updateViewportScreenBounds(new Box(0, 0, 1280, 1024), true)
	 * ```
	 *
	 * @param screenBounds - The new screen bounds of the viewport.
	 * @param center - Whether to preserve the viewport page center as the viewport changes.
	 *
	 * @public
	 */
	updateViewportScreenBounds(screenBounds: Box | HTMLElement, center = false): this {
		this._camera.updateViewportScreenBounds(screenBounds, center)
		return this
	}

	/**
	 * The bounds of the editor's viewport in screen space.
	 *
	 * @public
	 */
	getViewportScreenBounds() {
		return this._camera.getViewportScreenBounds()
	}

	/**
	 * The center of the editor's viewport in screen space.
	 *
	 * @public
	 */
	getViewportScreenCenter() {
		return this._camera.getViewportScreenCenter()
	}

	/**
	 * The current viewport in the current page space.
	 *
	 * @public
	 */
	getViewportPageBounds() {
		return this._camera.getViewportPageBounds()
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
		return this._camera.screenToPage(point)
	}

	/**
	 * Convert a point in the current page space to a point in current screen space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToScreen({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in page space.
	 *
	 * @public
	 */
	pageToScreen(point: VecLike) {
		return this._camera.pageToScreen(point)
	}

	/**
	 * Convert a point in the current page space to a point in current viewport space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToViewport({ x: 100, y: 100 })
	 * ```
	 *
	 * @param point - The point in page space.
	 *
	 * @public
	 */
	pageToViewport(point: VecLike) {
		return this._camera.pageToViewport(point)
	}

	// Collaborators

	/**
	 * Returns a list of presence records for all peer collaborators.
	 * This will return the latest presence record for each connected user.
	 *
	 * Convenience wrapper for {@link CollaboratorsManager.getCollaborators}.
	 *
	 * @public
	 */
	getCollaborators() {
		return this.collaborators.getCollaborators()
	}

	/**
	 * Returns a list of presence records for all peer collaborators on the current page.
	 * This will return the latest presence record for each connected user.
	 *
	 * Convenience wrapper for {@link CollaboratorsManager.getCollaboratorsOnCurrentPage}.
	 *
	 * @public
	 */
	getCollaboratorsOnCurrentPage() {
		return this.collaborators.getCollaboratorsOnCurrentPage()
	}

	/**
	 * Returns a list of presence records for peer collaborators who should currently be
	 * shown in the UI. Filters {@link Editor.getCollaborators} by activity state
	 * (active / idle / inactive) and visibility rules such as following and highlighted
	 * users. Re-evaluates on the collaborator visibility clock, so callers don't need to
	 * drive their own activity timer.
	 *
	 * Convenience wrapper for {@link CollaboratorsManager.getVisibleCollaborators}.
	 *
	 * @public
	 */
	getVisibleCollaborators() {
		return this.collaborators.getVisibleCollaborators()
	}

	/**
	 * Returns a list of presence records for peer collaborators who should currently be
	 * shown in the UI, filtered to those on the current page.
	 *
	 * Convenience wrapper for {@link CollaboratorsManager.getVisibleCollaboratorsOnCurrentPage}.
	 *
	 * @public
	 */
	getVisibleCollaboratorsOnCurrentPage() {
		return this.collaborators.getVisibleCollaboratorsOnCurrentPage()
	}

	// Attribution

	/**
	 * Get the current user's ID for attribution purposes.
	 * Also ensures a `user:` record exists in the store for the current user.
	 * Returns `null` when the user store has no current user.
	 *
	 * @public
	 */
	getAttributionUserId(): string | null {
		const user = this.store.props.users.currentUser.get()
		if (!user) return null
		this._ensureUserRecord(user)
		return UserRecordType.parseId(user.id)
	}

	/**
	 * Ensure a user record exists in the store for the given user,
	 * updating it if the data has changed.
	 *
	 * @internal
	 */
	_ensureUserRecord(user: TLUser): void {
		const existing = this.store.get(user.id)
		if (
			existing &&
			existing.name === user.name &&
			existing.color === user.color &&
			existing.imageUrl === user.imageUrl &&
			existing.meta === user.meta
		) {
			return
		}
		this.run(
			() => {
				this.store.put([user])
			},
			{ history: 'ignore' }
		)
	}

	/**
	 * Resolve a display name for a user ID. Asks the
	 * {@link @tldraw/tlschema#TLUserStore} first (the app's source of truth),
	 * falling back to the `user:` record in the store.
	 *
	 * @public
	 */
	getAttributionDisplayName(userId: string | null): string | null {
		if (!userId) return null
		return (
			this.store.props.users.resolve(userId).get()?.name ??
			this.store.get(createUserId(userId))?.name ??
			null
		)
	}

	/**
	 * Resolve a user record by ID. Asks the
	 * {@link @tldraw/tlschema#TLUserStore} first (the app's source of truth),
	 * falling back to the `user:` record in the store.
	 *
	 * @public
	 */
	getAttributionUser(userId: string | null): TLUser | null {
		if (!userId) return null
		return (
			this.store.props.users.resolve(userId).get() ?? this.store.get(createUserId(userId)) ?? null
		)
	}

	/**
	 * Collect user IDs referenced by a set of shapes via shape-specific props
	 * (e.g. `textLastEditedBy` on notes).
	 *
	 * @internal
	 */
	_getReferencedUserIds(shapes: TLShape[]): Set<string> {
		const userIds = new Set<string>()
		for (const shape of shapes) {
			const util = this.getShapeUtil(shape)
			for (const id of util.getReferencedUserIds(shape)) {
				userIds.add(id)
			}
		}
		return userIds
	}

	/**
	 * Start viewport-following a user.
	 *
	 * @example
	 * ```ts
	 * editor.startFollowingUser(myUserId)
	 * ```
	 *
	 * @param userId - The id of the user to follow.
	 *
	 * @public
	 */
	startFollowingUser(userId: TLUserId): this {
		this._camera.startFollowingUser(userId)
		return this
	}

	/**
	 * Stop viewport-following a user.
	 *
	 * @example
	 * ```ts
	 * editor.stopFollowingUser()
	 * ```
	 * @public
	 */
	stopFollowingUser(): this {
		this._camera.stopFollowingUser()
		return this
	}

	/** @internal */
	getUnorderedRenderingShapes(
		// The rendering state. We use this method both for rendering, which
		// is based on other state, and for computing order for SVG export,
		// which should work even when things are for example off-screen.
		useEditorState: boolean
	): TLRenderingShape[] {
		// Here we get the shape as well as any of its children, as well as their
		// opacities. If the shape is being erased, and none of its ancestors are
		// being erased, then we reduce the opacity of the shape and all of its
		// ancestors; but we don't apply this effect more than once among a set
		// of descendants so that it does not compound.

		// This is designed to keep all the shapes in a single list which
		// allows the DOM nodes to be reused even when they become children
		// of other nodes.

		const renderingShapes: TLRenderingShape[] = []

		let nextIndex = this.options.maxShapesPerPage * 2
		let nextBackgroundIndex = this.options.maxShapesPerPage

		const erasingShapeIds = new Set(this.getErasingShapeIds())

		const addShapeById = (id: TLShapeId, opacity: number, isAncestorErasing: boolean) => {
			const shape = this.getShape(id)
			if (!shape) return

			if (this.isShapeHidden(shape)) {
				// process children just in case they are overriding the hidden state
				const isErasing = isAncestorErasing || erasingShapeIds.has(id)
				for (const childId of this.getSortedChildIdsForParent(id)) {
					addShapeById(childId, opacity, isErasing)
				}
				return
			}

			opacity *= shape.opacity
			let isShapeErasing = false
			const util = this.getShapeUtil(shape)

			if (useEditorState) {
				isShapeErasing = !isAncestorErasing && erasingShapeIds.has(id)
				if (isShapeErasing) {
					opacity *= 0.32
				}
			}

			renderingShapes.push({
				id,
				shape,
				util,
				index: nextIndex,
				backgroundIndex: nextBackgroundIndex,
				opacity,
			})

			nextIndex += 1
			nextBackgroundIndex += 1

			const childIds = this.getSortedChildIdsForParent(id)
			if (!childIds.length) return

			let backgroundIndexToRestore = null
			if (util.providesBackgroundForChildren(shape)) {
				backgroundIndexToRestore = nextBackgroundIndex
				nextBackgroundIndex = nextIndex
				nextIndex += this.options.maxShapesPerPage
			}

			for (const childId of childIds) {
				addShapeById(childId, opacity, isAncestorErasing || isShapeErasing)
			}

			if (backgroundIndexToRestore !== null) {
				nextBackgroundIndex = backgroundIndexToRestore
			}
		}

		// If we're using editor state, then we're only interested in on-screen shapes.
		// If we're not using the editor state, then we're interested in ALL shapes, even those from other pages.
		const pages = useEditorState ? [this.getCurrentPage()] : this.getPages()
		for (const page of pages) {
			for (const childId of this.getSortedChildIdsForParent(page.id)) {
				addShapeById(childId, 1, false)
			}
		}

		return renderingShapes
	}

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @example
	 * ```ts
	 * editor.getCameraState()
	 * ```
	 *
	 * @public
	 */
	getCameraState() {
		return this._camera.getCameraState()
	}

	/**
	 * Get the shapes that should be displayed in the current viewport.
	 *
	 * @example
	 * ```ts
	 * editor.getRenderingShapes()
	 * ```
	 *
	 * @public
	 */
	@computed getRenderingShapes() {
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

		// For small N, native Array.sort is fast enough that the cache
		// bookkeeping is a net loss. Only use the permutation cache when
		// there are enough shapes for sort cost to matter.
		if (renderingShapes.length <= RENDERING_SHAPES_SORT_CACHE_THRESHOLD) {
			this._renderingShapesSortCache = null
			return renderingShapes.sort(sortById)
		}

		// Sort permutation cache: when the set of ids on the page doesn't
		// change (e.g. while drawing a stroke, only props change), we can
		// reuse the previous sorted order and place each entry at its known
		// sorted position in O(N) instead of running Array.sort O(N log N).
		const cache = this._renderingShapesSortCache
		if (cache !== null && cache.size === renderingShapes.length) {
			const sorted = new Array<TLRenderingShape>(renderingShapes.length)
			let allMatched = true
			for (let i = 0; i < renderingShapes.length; i++) {
				const entry = renderingShapes[i]
				const pos = cache.get(entry.id)
				if (pos === undefined) {
					allMatched = false
					break
				}
				sorted[pos] = entry
			}
			if (allMatched) return sorted
		}

		// Slow path: full sort, then cache the permutation by id.
		renderingShapes.sort(sortById)
		const positionById = new Map<TLShapeId, number>()
		for (let i = 0; i < renderingShapes.length; i++) {
			positionById.set(renderingShapes[i].id, i)
		}
		this._renderingShapesSortCache = positionById
		return renderingShapes
	}

	private _renderingShapesSortCache: Map<TLShapeId, number> | null = null

	/* --------------------- Pages ---------------------- */

	@computed private _getAllPagesQuery() {
		return this.store.query.records('page')
	}

	/**
	 * Info about the project's current pages.
	 *
	 * @example
	 * ```ts
	 * editor.getPages()
	 * ```
	 *
	 * @public
	 */
	@computed getPages(): TLPage[] {
		return Array.from(this._getAllPagesQuery().get()).sort(sortByIndex)
	}

	/**
	 * The current page.
	 *
	 * @example
	 * ```ts
	 * editor.getCurrentPage()
	 * ```
	 *
	 * @public
	 */
	getCurrentPage(): TLPage {
		return this.getPage(this.getCurrentPageId())!
	}

	/**
	 * The current page id.
	 *
	 * @example
	 * ```ts
	 * editor.getCurrentPageId()
	 * ```
	 *
	 * @public
	 */
	@computed getCurrentPageId(): TLPageId {
		return this.getInstanceState().currentPageId
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
	 * @param page - The page (or the page id) to get.
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
	 * @example
	 * ```ts
	 * editor.getCurrentPageIds()
	 * ```
	 *
	 * @public
	 */
	getCurrentPageShapeIds() {
		return this._currentPageShapeIds.get()
	}

	/**
	 * @internal
	 */
	@computed
	getCurrentPageShapeIdsSorted() {
		return Array.from(this.getCurrentPageShapeIds()).sort()
	}

	/**
	 * Get the ids of shapes on a page.
	 *
	 * @example
	 * ```ts
	 * const idsOnPage1 = editor.getPageShapeIds('page1')
	 * const idsOnPage2 = editor.getPageShapeIds(myPage2)
	 * ```
	 *
	 * @param page - The page (or the page id) to get the shape ids for.
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
	 * @param page - The page (or the page id) to set as the current page.
	 *
	 * @public
	 */
	setCurrentPage(page: TLPageId | TLPage): this {
		const pageId = typeof page === 'string' ? page : page.id
		if (!this.store.has(pageId)) {
			console.error("Tried to set the current page id to a page that doesn't exist.")
			return this
		}

		this.stopFollowingUser()
		// finish off any in-progress interactions
		this.complete()

		return this.run(
			() => {
				this.store.put([{ ...this.getInstanceState(), currentPageId: pageId }])
				// ensure camera constraints are applied
				this.setCamera(this.getCamera())
			},
			{ history: 'record-preserveRedoStack' }
		)
	}

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
	updatePage(partial: RequiredKeys<Partial<TLPage>, 'id'>): this {
		if (this.getIsReadonly()) return this

		const prev = this.getPage(partial.id)
		if (!prev) return this

		return this.run(() => this.store.update(partial.id, (page) => ({ ...page, ...partial })))
	}

	/**
	 * Create a page whilst ensuring that the page name is unique.
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
		this.run(() => {
			if (this.getIsReadonly()) return
			if (this.getPages().length >= this.options.maxPages) return
			const pages = this.getPages()

			const name = getIncrementedName(
				page.name ?? 'Page 1',
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

			this.store.put([newPage])
		})
		return this
	}

	/**
	 * Delete a page.
	 *
	 * @example
	 * ```ts
	 * editor.deletePage('page1')
	 * ```
	 *
	 * @param page - The page (or the page id) to delete.
	 *
	 * @public
	 */
	deletePage(page: TLPageId | TLPage): this {
		const id = typeof page === 'string' ? page : page.id
		this.run(
			() => {
				if (this.getIsReadonly()) return
				const pages = this.getPages()
				if (pages.length === 1) return

				const deletedPage = this.getPage(id)
				if (!deletedPage) return

				if (id === this.getCurrentPageId()) {
					const index = pages.findIndex((page) => page.id === id)
					const next = pages[index - 1] ?? pages[index + 1]
					this.setCurrentPage(next.id)
				}

				const shapes = this.getSortedChildIdsForParent(deletedPage.id)
				this.deleteShapes(shapes)

				this.store.remove([deletedPage.id])
			},
			{ ignoreShapeLock: true }
		)
		return this
	}

	/**
	 * Duplicate a page.
	 *
	 * @param page - The page (or the page id) to duplicate. Defaults to the current page.
	 * @param createId - The id of the new page. Defaults to a new id.
	 *
	 * @public
	 */
	duplicatePage(page: TLPageId | TLPage, createId: TLPageId = PageRecordType.createId()): this {
		if (this.getPages().length >= this.options.maxPages) return this
		const id = typeof page === 'string' ? page : page.id
		const freshPage = this.getPage(id) // get the most recent version of the page anyway
		if (!freshPage) return this

		// Read the source page's own camera rather than getCamera(), which is the
		// current page's and is wrong when duplicating a page that isn't being viewed
		const prevCamera = {
			...(this.store.get(CameraRecordType.createId(freshPage.id)) ?? this.getCamera()),
		}
		const content = this.getContentFromCurrentPage(this.getSortedChildIdsForParent(freshPage.id))

		this.run(() => {
			const pages = this.getPages()
			const index = getIndexBetween(freshPage.index, pages[pages.indexOf(freshPage) + 1]?.index)

			// create the page (also creates the pagestate and camera for the new page)
			this.createPage({ name: freshPage.name + ' Copy', id: createId, index })
			// set the new page as the current page
			this.setCurrentPage(createId)
			// update the new page's camera to the previous page's camera
			this.setCamera(prevCamera)

			if (content) {
				// Without preservePosition the paste rule recenters off-screen content
				// in the viewport, so the copy's layout would not match the original
				return this.putContentOntoCurrentPage(content, { preservePosition: true })
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
	 * @param page - The page (or the page id) to rename.
	 * @param name - The new name.
	 *
	 * @public
	 */
	renamePage(page: TLPageId | TLPage, name: string) {
		const id = typeof page === 'string' ? page : page.id
		if (this.getIsReadonly()) return this
		this.updatePage({ id, name })
		return this
	}

	/* --------------------- Assets --------------------- */

	/** @internal */
	@computed private _getAllAssetsQuery() {
		return this.store.query.records('asset')
	}

	/**
	 * Get all assets in the editor.
	 *
	 * @public
	 */
	getAssets() {
		return this._getAllAssetsQuery().get()
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
		if (this.getIsReadonly()) return this
		if (assets.length <= 0) return this
		this.run(() => this.store.put(assets), { history: 'ignore' })
		return this
	}

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
		if (this.getIsReadonly()) return this
		if (assets.length <= 0) return this
		this.run(
			() => {
				this.store.put(
					assets.map((partial) => ({
						...this.store.get(partial.id)!,
						...partial,
					}))
				)
			},
			{ history: 'ignore' }
		)
		return this
	}

	/**
	 * Delete one or more assets.
	 *
	 * @example
	 * ```ts
	 * editor.deleteAssets(['asset1', 'asset2'])
	 * ```
	 *
	 * @param assets - The assets (or asset ids) to delete.
	 *
	 * @public
	 */
	deleteAssets(assets: TLAssetId[] | TLAsset[]): this {
		if (this.getIsReadonly()) return this

		const ids =
			typeof assets[0] === 'string'
				? (assets as TLAssetId[])
				: (assets as TLAsset[]).map((a) => a.id)
		if (ids.length <= 0) return this

		this.run(
			() => {
				// the asset store's remove is async; surface failures instead of leaving an unhandled rejection
				Promise.resolve(this.store.props.assets.remove?.(ids)).catch((err) =>
					console.error('Error while removing assets from the asset store:', err)
				)
				this.store.remove(ids)
			},
			{ history: 'ignore' }
		)
		return this
	}

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
	getAsset<T extends TLAsset>(asset: T | T['id']): T | undefined {
		return this.store.get(typeof asset === 'string' ? asset : asset.id) as T | undefined
	}

	async resolveAssetUrl(
		assetId: TLAssetId | null,
		context: {
			screenScale?: number
			shouldResolveToOriginal?: boolean
			dpr?: number
		}
	): Promise<string | null> {
		if (!assetId) return null
		const asset = this.getAsset(assetId)
		if (!asset) return null

		const {
			screenScale = 1,
			shouldResolveToOriginal = false,
			dpr = this.getInstanceState().devicePixelRatio,
		} = context

		// We only look at the zoom level at powers of 2.
		const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
		const steppedScreenScale = zoomStepFunction(screenScale)
		const networkEffectiveType: string | null =
			'connection' in navigator ? ((navigator as any).connection?.effectiveType ?? null) : null

		return await this.store.props.assets.resolve(asset, {
			screenScale: screenScale || 1,
			steppedScreenScale,
			dpr,
			networkEffectiveType,
			shouldResolveToOriginal,
		})
	}
	/**
	 * Upload an asset to the store's asset service, returning a URL that can be used to resolve the
	 * asset.
	 */
	async uploadAsset(
		asset: TLAsset,
		file: File,
		abortSignal?: AbortSignal
	): Promise<{ src: string; meta?: JsonObject }> {
		return await this.store.props.assets.upload(asset, file, abortSignal)
	}

	/* --------------------- Shapes --------------------- */

	private _shapeGeometryCaches: Record<string, ComputedCache<Geometry2d, TLShape>> = {}

	/**
	 * Get the geometry of a shape in shape-space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeGeometry(myShape)
	 * editor.getShapeGeometry(myShapeId)
	 * editor.getShapeGeometry(myShapeId, { context: "arrow" })
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the geometry for.
	 * @param opts - Additional options about the request for geometry. Passed to {@link ShapeUtil.getGeometry}.
	 *
	 * @public
	 */
	getShapeGeometry<T extends Geometry2d>(shape: TLShape | TLShapeId, opts?: TLGeometryOpts): T {
		const context = opts?.context ?? 'none'
		if (!this._shapeGeometryCaches[context]) {
			this._shapeGeometryCaches[context] = this.store.createComputedCache(
				'bounds',
				(shape) => {
					this.plugins.getOptional(fontsCapability)?.trackFontsForShape(shape)
					return this.getShapeUtil(shape).getGeometry(shape, opts)
				},
				{ areRecordsEqual: areShapesContentEqual }
			)
		}
		return this._shapeGeometryCaches[context].get(
			typeof shape === 'string' ? shape : shape.id
		)! as T
	}

	/** @internal */
	@computed private _getShapeHandlesCache(): ComputedCache<TLHandle[] | undefined, TLShape> {
		return this.store.createComputedCache(
			'handles',
			(shape) => {
				return this.getShapeUtil(shape).getHandles?.(shape)
			},
			{
				areRecordsEqual: areShapesContentEqual,
			}
		)
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
		return this._getShapeHandlesCache().get(typeof shape === 'string' ? shape : shape.id)
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
	getShapeLocalTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) throw Error('Editor.getTransform: shape not found')
		return Mat.Identity().translate(freshShape.x, freshShape.y).rotate(freshShape.rotation)
	}

	/**
	 * A cache of page transforms.
	 *
	 * @internal
	 */
	@computed private _getShapePageTransformCache(): ComputedCache<Mat, TLShape> {
		return this.store.createComputedCache<Mat, TLShape>('pageTransformCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return this.getShapeLocalTransform(shape)
			}

			// If the shape's parent doesn't exist yet (e.g. when merging in changes from remote in the wrong order)
			// then we can't compute the transform yet, so just return the identity matrix.
			// In the future we should look at creating a store update mechanism that understands and preserves
			// ordering.
			const parentTransform =
				this._getShapePageTransformCache().get(shape.parentId) ?? Mat.Identity()
			return Mat.Compose(parentTransform, this.getShapeLocalTransform(shape)!)
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
	getShapeParentTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape || isPageId(freshShape.parentId)) return Mat.Identity()
		return this._getShapePageTransformCache().get(freshShape.parentId) ?? Mat.Identity()
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
	getShapePageTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		return this._getShapePageTransformCache().get(id) ?? Mat.Identity()
	}

	/** @internal */
	@computed private _getShapePageBoundsCache(): ComputedCache<Box, TLShape> {
		return this.store.createComputedCache<Box, TLShape>('pageBoundsCache', (shape) => {
			return Box.FromPoints(
				this.getShapePageTransform(shape).applyToPoints(this.getShapeGeometry(shape).boundsVertices)
			)
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
	getShapePageBounds(shape: TLShape | TLShapeId): Box | undefined {
		return this._getShapePageBoundsCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of clip paths used for clipping.
	 *
	 * @internal
	 */
	@computed private _getShapeClipPathCache(): ComputedCache<string, TLShape> {
		return this.store.createComputedCache<string, TLShape>('clipPathCache', (shape) => {
			const pageMask = this._getShapeMaskCache().get(shape.id)
			if (!pageMask) return undefined
			if (pageMask.length === 0) {
				return `polygon(0px 0px, 0px 0px, 0px 0px)`
			}

			const pageTransform = this._getShapePageTransformCache().get(shape.id)
			if (!pageTransform) return undefined

			const localMask = Mat.applyToPoints(Mat.Inverse(pageTransform), pageMask)

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
		return this._getShapeClipPathCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/** @internal */
	@computed private _getShapeMaskCache(): ComputedCache<Vec[], TLShape> {
		return this.store.createComputedCache('pageMaskCache', (shape) => {
			if (isPageId(shape.parentId)) return undefined

			const clipPaths: Vec[][] = []
			// Get all ancestors that can potentially clip this shape
			for (const ancestor of this.getShapeAncestors(shape.id)) {
				const util = this.getShapeUtil(ancestor)
				const clipPath = util.getClipPath?.(ancestor)
				if (!clipPath) continue
				if (util.shouldClipChild?.(shape) === false) continue
				const pageTransform = this.getShapePageTransform(ancestor.id)
				clipPaths.push(pageTransform.applyToPoints(clipPath))
			}
			if (clipPaths.length === 0) return undefined

			const pageMask = clipPaths.reduce((acc, b) => {
				const intersection = intersectPolygonPolygon(acc, b)
				if (intersection) {
					return intersection.map(Vec.Cast)
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
	 * @param shape - The shape (or the shape id) of the shape to get the mask for.
	 *
	 * @returns The mask for the shape.
	 *
	 * @public
	 */
	getShapeMask(shape: TLShapeId | TLShape): VecLike[] | undefined {
		return this._getShapeMaskCache().get(typeof shape === 'string' ? shape : shape.id)
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
	getShapeMaskedPageBounds(shape: TLShapeId | TLShape): Box | undefined {
		if (typeof shape !== 'string') shape = shape.id
		return this._getShapeMaskedPageBoundsCache().get(shape)
	}

	/** @internal */
	@computed private _getShapeMaskedPageBoundsCache(): ComputedCache<Box, TLShape> {
		return this.store.createComputedCache('shapeMaskedPageBoundsCache', (shape) => {
			const pageBounds = this._getShapePageBoundsCache().get(shape.id)
			if (!pageBounds) return
			const pageMask = this._getShapeMaskCache().get(shape.id)
			if (pageMask) {
				if (pageMask.length === 0) return undefined
				const { corners } = pageBounds
				// the mask may have fewer than four points (e.g. a triangular clip path)
				if (
					pageMask.length === corners.length &&
					corners.every((p, i) => Vec.Equals(p, pageMask[i]))
				) {
					return pageBounds.clone()
				}
				const intersection = intersectPolygonPolygon(pageMask, corners)
				if (!intersection) return
				return Box.FromPoints(intersection)
			}
			return pageBounds
		})
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
	 * @param acc - The accumulator.
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
	 * @param predicate - The predicate to match.
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

		const ids = toShapeIds(shapes)
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
	isShapeOrAncestorLocked(shape?: TLShape | TLShapeId): boolean {
		const _shape = shape && this.getShape(shape)
		if (_shape === undefined) return false
		if (_shape.isLocked) return true
		return this.isShapeOrAncestorLocked(this.getShapeParent(_shape))
	}

	/**
	 * Get shapes that are outside of the viewport.
	 *
	 * @public
	 */
	@computed
	getNotVisibleShapes() {
		return this._notVisibleShapes.get()
	}

	private _notVisibleShapes = notVisibleShapes(this)
	private _culledShapesCache: Set<TLShapeId> | null = null

	/**
	 * Get culled shapes (those that should not render), taking into account which shapes are selected or editing.
	 *
	 * @public
	 */
	@computed
	getCulledShapes() {
		const notVisibleShapes = this.getNotVisibleShapes()
		const selectedShapeIds = this.getSelectedShapeIds()
		const editingId = this.getEditingShapeId()
		const nextValue = new Set<TLShapeId>(notVisibleShapes)
		// we don't cull the shape we are editing
		if (editingId) {
			nextValue.delete(editingId)
		}
		// we also don't cull selected shapes
		selectedShapeIds.forEach((id) => {
			nextValue.delete(id)
		})

		// Cache optimization: return same Set object if contents unchanged
		// This allows consumers to use === comparison and prevents unnecessary re-renders
		const prevValue = this._culledShapesCache
		if (prevValue) {
			// If sizes differ, contents must differ
			if (prevValue.size !== nextValue.size) {
				this._culledShapesCache = nextValue
				return nextValue
			}

			// Check if all elements are the same
			for (const id of prevValue) {
				if (!nextValue.has(id)) {
					// Found a difference, update cache and return new set
					this._culledShapesCache = nextValue
					return nextValue
				}
			}

			// Loop completed without finding differences - contents identical
			return prevValue
		}

		this._culledShapesCache = nextValue
		return nextValue
	}

	/**
	 * The bounds of the current page (the common bounds of all of the shapes on the page).
	 *
	 * @public
	 */
	@computed getCurrentPageBounds(): Box | undefined {
		let commonBounds: Box | undefined

		this.getCurrentPageShapeIdsSorted().forEach((shapeId) => {
			if (this.isShapeHidden(shapeId)) return
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
	 * Get the hit-test margin in page space—the distance in page units within which a pointer is
	 * considered to be touching a shape. This resolves to {@link TldrawOptions.hitTestMargin} (or
	 * {@link TldrawOptions.coarseHitTestMargin} when using a coarse pointer) divided by the current
	 * zoom level, so it stays a constant distance in screen space.
	 *
	 * @returns The hit-test margin in page space.
	 *
	 * @public
	 */
	@computed getHitTestMargin(): number {
		const { hitTestMargin, coarseHitTestMargin } = this.options
		const margin = this.getInstanceState().isCoarsePointer ? coarseHitTestMargin : hitTestMargin
		return margin / this.getZoomLevel()
	}

	/**
	 * Get the top-most selected shape at the given point, ignoring groups.
	 *
	 * @param point - The point to check.
	 *
	 * @returns The top-most selected shape at the given point, or undefined if there is no shape at the point.
	 */
	getSelectedShapeAtPoint(point: VecLike): TLShape | undefined {
		const selectedShapeIds = this.getSelectedShapeIds()
		if (selectedShapeIds.length === 0) return undefined
		const selectedShapeIdSet = new Set(selectedShapeIds)
		const margin = this.getHitTestMargin()
		const sortedShapes = this.getCurrentPageShapesSorted()

		// iterate from the top (highest z-index) to find the top-most matching shape
		for (let i = sortedShapes.length - 1; i >= 0; i--) {
			const shape = sortedShapes[i]
			if (shape.type === 'group') continue
			if (!selectedShapeIdSet.has(shape.id)) continue
			if (
				this.getShapeGeometry(shape).hitTestPoint(
					this.getPointInShapeSpace(shape, point),
					margin,
					true
				)
			) {
				return shape
			}
		}

		return undefined
	}

	/**
	 * Get the shape at the current point.
	 *
	 * @param point - The point to check.
	 * @param opts - Options for the check: `hitInside` to check if the point is inside the shape, `margin` to check if the point is within a margin of the shape, `hitFrameInside` to check if the point is inside the frame, and `filter` to filter the shapes to check.
	 *
	 * @returns The shape at the given point, or undefined if there is no shape at the point.
	 */
	getShapeAtPoint(point: VecLike, opts: TLGetShapeAtPointOptions = {}): TLShape | undefined {
		const viewportPageBounds = this.getViewportPageBounds()
		const {
			filter,
			margin = 0,
			hitLocked = false,
			hitLabels = false,
			hitInside = false,
			hitFrameInside = false,
		} = opts

		const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]

		let inHollowSmallestArea = Infinity
		let inHollowSmallestAreaHit: TLShape | null = null

		let inMarginClosestToEdgeDistance = Infinity
		let inMarginClosestToEdgeHit: TLShape | null = null

		// Use larger margin for spatial search to account for edge distance checks
		const searchMargin = Math.max(innerMargin, outerMargin, this.getHitTestMargin())
		const candidateIds = this._spatialIndex.getShapeIdsAtPoint(point, searchMargin)

		const shapesToCheck = opts.renderingOnly
			? this.getCurrentPageRenderingShapesSorted()
			: this.getCurrentPageShapesSorted()

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			// Frame-like shapes have labels positioned above the shape (outside bounds), so always include them
			if (!candidateIds.has(shape.id) && !this.isShapeFrameLike(shape)) continue
			if (
				(shape.isLocked && !hitLocked) ||
				this.isShapeHidden(shape) ||
				this.isShapeOfType(shape, 'group')
			) {
				continue
			}
			const pageMask = this.getShapeMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) continue
			if (filter && !filter(shape)) continue

			const geometry = this.getShapeGeometry(shape)
			const isGroup = geometry instanceof Group2d

			const pointInShapeSpace = this.getPointInShapeSpace(shape, point)

			// Check labels first. Only group geometries can carry a label child; a frame-like
			// shape util may still return a plain geometry.
			const shapeUtil = this.getShapeUtil(shape)
			const isShapeFrameLike = this.isShapeFrameLike(shape)
			if (
				isGroup &&
				(isShapeFrameLike ||
					((this.isShapeOfType(shape, 'note') ||
						this.isShapeOfType(shape, 'arrow') ||
						(this.isShapeOfType(shape, 'geo') && shape.props.fill === 'none')) &&
						shapeUtil.getText(shape)?.trim()))
			) {
				for (const childGeometry of geometry.children) {
					if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
						return shape
					}
				}
			}

			if (isShapeFrameLike) {
				// On the rare case that we've hit a frame-like shape (not its label), test again hitInside to be forced true;
				// this prevents clicks from passing through the body of a frame to shapes behind it.

				// If the hit is within the frame's outer margin, then select the frame
				const distance = geometry.distanceToPoint(pointInShapeSpace, hitFrameInside)
				if (
					hitFrameInside
						? (distance > 0 && distance <= outerMargin) ||
							(distance <= 0 && distance > -innerMargin)
						: distance > 0 && distance <= outerMargin
				) {
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
				if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
					distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
				} else {
					// Broad phase
					if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
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

				// Are we close to the shape's edge?
				if (distance <= outerMargin || (hitInside && distance <= 0 && distance > -innerMargin)) {
					if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
						// If the geometry rejects this hit (e.g. transparent image pixel),
						// skip this shape and check shapes behind it.
						if (geometry.ignoreHit(pointInShapeSpace)) {
							continue
						}
						// If the shape is filled, then it's a hit. Remember, we're
						// starting from the TOP-MOST shape in z-index order, so any
						// other hits would be occluded by the shape.
						return inMarginClosestToEdgeHit || shape
					} else {
						// If we're close to the edge of the shape, and if it's the closest edge among
						// all the edges that we've gotten close to so far, then we will want to hit the
						// shape unless we hit something else or closer in later iterations.
						if (
							hitInside
								? // On hitInside, the distance will be negative for hits inside
									// If the distance is positive, check against the outer margin
									(distance > 0 && distance <= outerMargin) ||
									// If the distance is negative, check against the inner margin
									(distance <= 0 && distance > -innerMargin)
								: // If hitInside is false, then sadly _we do not know_ whether the
									// point is inside or outside of the shape, so we check against
									// the max of the two margins
									Math.abs(distance) <= Math.max(innerMargin, outerMargin)
						) {
							if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
								inMarginClosestToEdgeDistance = Math.abs(distance)
								inMarginClosestToEdgeHit = shape
							}
						} else if (!inMarginClosestToEdgeHit) {
							// If the shape is bigger than the viewport, then skip it. (Only here: its
							// edges should still be hittable within the margin.)
							if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue

							// If we're not within margin distance to any edge, and if the
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
				// Use the editor's configurable hit test margin.
				if (distance < this.getHitTestMargin()) {
					// An edge we already hit (above this shape) that is at least as close still wins,
					// matching the closest-edge rule used for hollow shapes
					if (inMarginClosestToEdgeHit && inMarginClosestToEdgeDistance <= distance) {
						return inMarginClosestToEdgeHit
					}
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
	 * editor.getShapesAtPoint({ x: 100, y: 100 }, { hitInside: true, margin: 8 })
	 * ```
	 *
	 * @param point - The page point to test.
	 * @param opts - The options for the hit point testing.
	 *
	 * @returns An array of shapes at the given point, sorted in reverse order of their absolute z-index (top-most shape first).
	 *
	 * @public
	 */
	getShapesAtPoint(
		point: VecLike,
		opts = {} as { margin?: number; hitInside?: boolean }
	): TLShape[] {
		const margin = opts.margin ?? 0
		const candidateIds = this._spatialIndex.getShapeIdsAtPoint(point, margin)

		// Get all page shapes in z-index order and filter to candidates that pass isPointInShape.
		// Frame-like shapes are always checked because their labels can be outside their bounds.
		// Iterate backwards so the result is pre-sorted in reverse z-index order (top-most first).
		const sorted = this.getCurrentPageShapesSorted()
		const result: TLShape[] = []
		for (let i = sorted.length - 1; i >= 0; i--) {
			const shape = sorted[i]
			if (this.isShapeHidden(shape)) continue
			if (!candidateIds.has(shape.id) && !this.isShapeFrameLike(shape)) continue
			if (this.isPointInShape(shape, point, opts)) result.push(shape)
		}
		return result
	}

	/**
	 * Get shape IDs within the given bounds.
	 *
	 * Note: Uses shape page bounds only. Frames with labels outside their bounds
	 * may not be included even if the label is within the search bounds.
	 *
	 * Note: Results are unordered. If you need z-order, combine with sorted shapes:
	 * ```ts
	 * const candidates = editor.getShapeIdsInsideBounds(bounds)
	 * const sorted = editor.getCurrentPageShapesSorted().filter(s => candidates.has(s.id))
	 * ```
	 *
	 * @param bounds - The bounds to search within.
	 * @returns Unordered set of shape IDs within the given bounds.
	 *
	 * @public
	 */
	getShapeIdsInsideBounds(bounds: Box): Set<TLShapeId> {
		return this._spatialIndex.getShapeIdsInsideBounds(bounds)
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
	 * @param opts - The options for the hit point testing.
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
		// mask, then it's definitely a miss—we don't need to test further.
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
	getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
		const id = typeof shape === 'string' ? shape : shape.id
		return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
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
	getPointInParentSpace(shape: TLShapeId | TLShape, point: VecLike): Vec {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.getShape(id)
		if (!freshShape) return new Vec(0, 0)
		if (isPageId(freshShape.parentId)) return Vec.From(point)

		return this.getShapePageTransform(freshShape.parentId).clone().invert().applyToPoint(point)
	}

	/**
	 * An array containing all of the shapes in the current page.
	 *
	 * @public
	 */
	@computed getCurrentPageShapes(): TLShape[] {
		return Array.from(this.getCurrentPageShapeIds(), (id) => this.store.get(id)! as TLShape)
	}

	/**
	 * An array containing all of the shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @public
	 */
	@computed getCurrentPageShapesSorted(): TLShape[] {
		const result: TLShape[] = []
		const topLevelShapes = this.getSortedChildIdsForParent(this.getCurrentPageId())

		for (let i = 0, n = topLevelShapes.length; i < n; i++) {
			pushShapeWithDescendants(this, topLevelShapes[i], result)
		}

		return result
	}

	/**
	 * An array containing all of the rendering shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @public
	 */
	@computed getCurrentPageRenderingShapesSorted(): TLShape[] {
		const culledShapes = this.getCulledShapes()
		return this.getCurrentPageShapesSorted().filter(
			({ id }) => !culledShapes.has(id) && !this.isShapeHidden(id)
		)
	}

	/**
	 * Get whether a shape matches the type of a TLShapeUtil.
	 *
	 * @example
	 * ```ts
	 * const isArrowShape = isShapeOfType(someShape, 'arrow')
	 * ```
	 *
	 * @param util - the TLShapeUtil constructor to test against
	 * @param shape - the shape to test
	 *
	 * @public
	 */
	isShapeOfType<K extends TLShape['type']>(
		shape: TLShape,
		type: K
	): shape is Extract<TLShape, { type: K }>
	isShapeOfType<T extends TLShape>(
		shape: TLShape,
		type: T['type']
	): shape is Extract<TLShape, { type: T['type'] }>
	isShapeOfType<T extends TLShape = TLShape>(shapeId: TLShapeId, type: T['type']): boolean
	isShapeOfType(arg: TLShape | TLShapeId, type: TLShape['type']) {
		const shape = typeof arg === 'string' ? this.getShape(arg) : arg
		if (!shape) return false
		return shape.type === type
	}

	/**
	 * Get whether a shape behaves like a frame — a container that has child
	 * shapes, requires full-brush selection, blocks erasure from inside, etc.
	 *
	 * @example
	 * ```ts
	 * const isFrameLike = editor.isShapeFrameLike(someShape)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to test.
	 *
	 * @public
	 */
	isShapeFrameLike(shape: TLShape | TLShapeId): boolean {
		const _shape = typeof shape === 'string' ? this.getShape(shape) : shape
		if (!_shape) return false
		return this.getShapeUtil(_shape).isFrameLike(_shape)
	}

	/**
	 * Get a shape by its id.
	 *
	 * @example
	 * ```ts
	 * editor.getShape('box1')
	 * ```
	 *
	 * @param shape - The shape (or the id of the shape) to get.
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
		return this.getShape(freshShape.parentId)
	}

	/**
	 * If siblingShape and targetShape are siblings, this returns targetShape. If targetShape has an
	 * ancestor who is a sibling of siblingShape, this returns that ancestor. Otherwise, this returns
	 * undefined.
	 *
	 * @internal
	 */
	getShapeNearestSibling(
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
	isShapeInPage(shape: TLShape | TLShapeId, pageId = this.getCurrentPageId()): boolean {
		return this.getAncestorPageId(shape) === pageId
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
	 * @param insertIndex - The index to insert the children.
	 *
	 * @public
	 */
	reparentShapes(shapes: TLShapeId[] | TLShape[], parentId: TLParentId, insertIndex?: IndexKey) {
		const ids = toShapeIds(shapes)
		if (ids.length === 0) return this

		const changes: TLShapePartial[] = []

		const parentTransform = isPageId(parentId)
			? Mat.Identity()
			: this.getShapePageTransform(parentId)!

		const parentPageRotation = parentTransform.rotation()

		let indices: IndexKey[] = []

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

		const shapesToReparent = compact(ids.map((id) => this.getShape(id))).sort(sortByIndex)

		// Ignore locked shapes so that we can reparent locked shapes, for example
		// when a locked shape's parent is deleted.
		this.run(
			() => {
				for (let i = 0; i < shapesToReparent.length; i++) {
					const shape = shapesToReparent[i]

					const pageTransform = this.getShapePageTransform(shape)
					const newPoint = invertedParentTransform.applyToPoint(pageTransform.point())
					const newRotation = pageTransform.rotation() - parentPageRotation

					if (shape.id === parentId) {
						throw Error('Attempted to reparent a shape to itself!')
					}

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
			},
			{ ignoreShapeLock: true }
		)

		return this
	}

	/**
	 * Get the index above the highest child of a given parent.
	 *
	 * @param parent - The parent (or the id) of the parent.
	 *
	 * @returns The index.
	 *
	 * @public
	 */
	getHighestIndexForParent(parent: TLParentId | TLPage | TLShape): IndexKey {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const children = this._parentIdsToChildIds.get()[parentId]

		if (!children || children.length === 0) {
			return getIndexAbove(ZERO_INDEX_KEY)
		}
		const shape = this.getShape(children[children.length - 1])!
		return getIndexAbove(shape.index)
	}

	/**
	 * Get an array of all the children of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getSortedChildIdsForParent('frame1')
	 * ```
	 *
	 * @param parent - The parent (or the id) of the parent shape.
	 *
	 * @public
	 */
	getSortedChildIdsForParent(parent: TLParentId | TLPage | TLShape): TLShapeId[] {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const ids = this._parentIdsToChildIds.get()[parentId]
		if (!ids) return EMPTY_ARRAY
		return ids
	}

	/**
	 * Run a visitor function for all descendants of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.visitDescendants('frame1', myCallback)
	 * ```
	 *
	 * @param parent - The parent (or the id) of the parent shape.
	 * @param visitor - The visitor function.
	 *
	 * @public
	 */
	visitDescendants(
		parent: TLParentId | TLPage | TLShape,
		visitor: (id: TLShapeId) => void | false
	): this {
		const children = this.getSortedChildIdsForParent(parent)
		for (const id of children) {
			if (visitor(id) === false) continue
			this.visitDescendants(id, visitor)
		}
		return this
	}

	/**
	 * Get the shape ids of all descendants of the given shapes (including the shapes themselves). IDs are returned in z-index order.
	 *
	 * @param ids - The ids of the shapes to get descendants of.
	 *
	 * @returns The descendant ids.
	 *
	 * @public
	 */
	getShapeAndDescendantIds(ids: TLShapeId[]): Set<TLShapeId> {
		const shapeIds = new Set<TLShapeId>()
		for (const shape of compact(ids.map((id) => this.getShape(id))).sort(sortByIndex)) {
			shapeIds.add(shape.id)
			this.visitDescendants(shape, (descendantId) => {
				shapeIds.add(descendantId)
			})
		}
		return shapeIds
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
	getDraggingOverShape(point: Vec, droppingShapes: TLShape[]): TLShape | undefined {
		// get fresh moving shapes
		const draggingShapes = compact(droppingShapes.map((s) => this.getShape(s))).filter(
			(s) => !s.isLocked && !this.isShapeHidden(s)
		)
		// Descendants of the dragged shapes can't be the target, otherwise dragging a frame out of
		// its parent reports a nested child as the target and the parent never sees the drag leave
		const excludedIds = this.getShapeAndDescendantIds(draggingShapes.map((s) => s.id))

		const maybeDraggingOverShapes = this.getShapesAtPoint(point, {
			hitInside: true,
			margin: 0,
		}).filter(
			(s) =>
				!droppingShapes.includes(s) &&
				!s.isLocked &&
				!this.isShapeHidden(s) &&
				!excludedIds.has(s.id)
		)

		for (const maybeDraggingOverShape of maybeDraggingOverShapes) {
			const shapeUtil = this.getShapeUtil(maybeDraggingOverShape)
			// Any shape that can handle any dragging interactions is a valid target
			if (
				shapeUtil.onDragShapesOver ||
				shapeUtil.onDragShapesIn ||
				shapeUtil.onDragShapesOut ||
				shapeUtil.onDropShapesOver
			) {
				return maybeDraggingOverShape
			}
		}
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

		const focusedGroup = this.getFocusedGroup()

		while (node) {
			if (
				this.isShapeOfType(node, 'group') &&
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

	/* -------------------- Bindings -------------------- */

	@computed
	private _getBindingsIndexCache() {
		const index = bindingsIndex(this)
		return this.store.createComputedCache<TLBinding[], TLShape>(
			'bindingsIndex',
			(shape) => {
				return index.get().get(shape.id)
			},
			// we can ignore the shape equality check here because the index is
			// computed incrementally based on what bindings are in the store
			{ areRecordsEqual: () => true }
		)
	}

	/**
	 * Get a binding from the store by its ID if it exists.
	 */
	getBinding(id: TLBindingId): TLBinding | undefined {
		return this.store.get(id) as TLBinding | undefined
	}

	/**
	 * Get all bindings of a certain type _from_ a particular shape. These are the bindings whose
	 * `fromId` matched the shape's ID.
	 */
	getBindingsFromShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsFromShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[]
	getBindingsFromShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		return this.getBindingsInvolvingShape(id).filter(
			(b) => b.fromId === id && b.type === type
		) as Binding[]
	}

	/**
	 * Get all bindings of a certain type _to_ a particular shape. These are the bindings whose
	 * `toId` matches the shape's ID.
	 */
	getBindingsToShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsToShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[]
	getBindingsToShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		return this.getBindingsInvolvingShape(id).filter(
			(b) => b.toId === id && b.type === type
		) as Binding[]
	}

	/**
	 * Get all bindings involving a particular shape. This includes bindings where the shape is the
	 * `fromId` or `toId`. If a type is provided, only bindings of that type are returned.
	 */
	getBindingsInvolvingShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsInvolvingShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type?: Binding['type']
	): Binding[]
	getBindingsInvolvingShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type?: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		const result = this._getBindingsIndexCache().get(id) ?? EMPTY_ARRAY
		if (!type) return result as Binding[]
		return result.filter((b) => b.type === type) as Binding[]
	}

	/**
	 * Create bindings from a list of partial bindings. You can omit the ID and most props of a
	 * binding, but the `type`, `toId`, and `fromId` must all be provided.
	 */
	createBindings<B extends TLBinding = TLBinding>(partials: TLBindingCreate<B>[]) {
		if (this.getIsReadonly()) return this

		const bindings: TLBinding[] = []
		for (const partial of partials) {
			const fromShape = this.getShape(partial.fromId)
			const toShape = this.getShape(partial.toId)
			if (!fromShape || !toShape) continue
			if (!this.canBindShapes({ fromShape, toShape, binding: partial })) continue

			const util = this.getBindingUtil(partial.type)
			const defaultProps = util.getDefaultProps()
			const binding = this.store.schema.types.binding.create({
				...partial,
				id: partial.id ?? createBindingId(),
				props: {
					...defaultProps,
					...partial.props,
				},
			}) as TLBinding

			bindings.push(binding)
		}

		this.store.put(bindings)
		return this
	}

	/**
	 * Create a single binding from a partial. You can omit the ID and most props of a binding, but
	 * the `type`, `toId`, and `fromId` must all be provided.
	 */
	createBinding<B extends TLBinding = TLBinding>(partial: TLBindingCreate<B>) {
		return this.createBindings([partial])
	}

	/**
	 * Update bindings from a list of partial bindings. Each partial must include an ID, which will
	 * be used to match the binding to it's existing record. If there is no existing record, that
	 * binding is skipped. The changes from the partial are merged into the existing record.
	 */
	updateBindings(partials: (TLBindingUpdate | null | undefined)[]) {
		if (this.getIsReadonly()) return this

		const updated: TLBinding[] = []

		for (const partial of partials) {
			if (!partial) continue

			const current = this.getBinding(partial.id)
			if (!current) continue

			const updatedBinding = applyPartialToRecordWithProps(current, partial)
			if (updatedBinding === current) continue

			const fromShape = this.getShape(updatedBinding.fromId)
			const toShape = this.getShape(updatedBinding.toId)
			if (!fromShape || !toShape) continue
			if (!this.canBindShapes({ fromShape, toShape, binding: updatedBinding })) continue

			updated.push(updatedBinding)
		}

		this.store.put(updated)

		return this
	}

	/**
	 * Update a binding from a partial binding. Each partial must include an ID, which will be used
	 * to match the binding to it's existing record. If there is no existing record, that binding is
	 * skipped. The changes from the partial are merged into the existing record.
	 */
	updateBinding<B extends TLBinding = TLBinding>(partial: TLBindingUpdate<B>) {
		return this.updateBindings([partial])
	}

	/**
	 * Delete several bindings by their IDs. If a binding ID doesn't exist, it's ignored.
	 */
	deleteBindings(bindings: (TLBinding | TLBindingId)[], { isolateShapes = false } = {}) {
		if (this.getIsReadonly()) return this
		return this._deleteBindings(bindings, { isolateShapes })
	}

	/**
	 * Unguarded so that withIsolatedShapes can transiently isolate shapes for copy and export in
	 * readonly mode; the public deleteBindings is what readonly blocks.
	 *
	 * @internal
	 */
	_deleteBindings(bindings: (TLBinding | TLBindingId)[], { isolateShapes = false } = {}) {
		const ids = bindings.map((binding) => (typeof binding === 'string' ? binding : binding.id))
		if (isolateShapes) {
			this.store.atomic(() => {
				for (const id of ids) {
					const binding = this.getBinding(id)
					if (!binding) continue
					const util = this.getBindingUtil(binding)
					util.onBeforeIsolateFromShape?.({ binding, removedShape: this.getShape(binding.toId)! })
					util.onBeforeIsolateToShape?.({ binding, removedShape: this.getShape(binding.fromId)! })
					this.store.remove([id])
				}
			})
		} else {
			this.store.remove(ids)
		}
		return this
	}
	/**
	 * Delete a binding by its ID. If the binding doesn't exist, it's ignored.
	 */
	deleteBinding(binding: TLBinding | TLBindingId, opts?: Parameters<this['deleteBindings']>[1]) {
		return this.deleteBindings([binding], opts)
	}
	canBindShapes({
		fromShape,
		toShape,
		binding,
	}: {
		fromShape: TLShape | { type: TLShape['type'] } | TLShape['type']
		toShape: TLShape | { type: TLShape['type'] } | TLShape['type']
		binding: TLBinding | { type: TLBinding['type'] } | TLBinding['type']
	}): boolean {
		const fromShapeType = typeof fromShape === 'string' ? fromShape : fromShape.type
		const toShapeType = typeof toShape === 'string' ? toShape : toShape.type
		const bindingType = typeof binding === 'string' ? binding : binding.type

		const canBindOpts: TLShapeUtilCanBindOpts = {
			fromShape: typeof fromShape === 'string' ? { type: fromShape } : fromShape,
			toShape: typeof toShape === 'string' ? { type: toShape } : toShape,
			bindingType,
			fromShapeType,
			toShapeType,
		}

		if (fromShapeType === toShapeType) {
			return this.getShapeUtil(fromShapeType).canBind(canBindOpts)
		}

		return (
			this.getShapeUtil(fromShapeType).canBind(canBindOpts) &&
			this.getShapeUtil(toShapeType).canBind(canBindOpts)
		)
	}

	/* -------------------- Commands -------------------- */

	/**
	 * Rotate shapes by a delta in radians.
	 *
	 * @example
	 * ```ts
	 * editor.rotateShapesBy(editor.getSelectedShapeIds(), Math.PI)
	 * editor.rotateShapesBy(editor.getSelectedShapeIds(), Math.PI / 2)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) of the shapes to move.
	 * @param delta - The delta in radians to apply to the selection rotation.
	 * @param opts - The options for the rotation.
	 */
	rotateShapesBy(
		shapes: TLShapeId[] | TLShape[],
		delta: number,
		opts?: { center?: VecLike }
	): this {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return this

		const snapshot = getRotationSnapshot({ editor: this, ids })
		if (!snapshot) return this
		applyRotationToSnapshotShapes({
			delta,
			snapshot,
			editor: this,
			stage: 'one-off',
			centerOverride: opts?.center,
		})

		return this
	}

	// Gets a shape partial that includes life cycle changes: on translate start, on translate, on translate end
	private getChangesToTranslateShape(initialShape: TLShape, newShapeCoords: VecLike): TLShape {
		let workingShape = initialShape
		const util = this.getShapeUtil(initialShape)

		const afterTranslateStart = util.onTranslateStart?.(workingShape)
		if (afterTranslateStart) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateStart)
		}

		workingShape = applyPartialToRecordWithProps(workingShape, {
			id: initialShape.id,
			type: initialShape.type,
			x: newShapeCoords.x,
			y: newShapeCoords.y,
		})

		const afterTranslate = util.onTranslate?.(initialShape, workingShape)
		if (afterTranslate) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslate)
		}

		const afterTranslateEnd = util.onTranslateEnd?.(initialShape, workingShape)
		if (afterTranslateEnd) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateEnd)
		}

		return workingShape
	}

	// Counter-rotates the page-space delta into the parent's space; without that a child of a rotated
	// frame or group would move along its parent's axes instead of the page's.
	// todo: a shape laid out together with its own parent moves twice, once with the parent and once
	// on its own; the layout commands should skip shapes whose ancestors are also being laid out
	/** @internal */
	getChangesToTranslateShapeByPageDelta(shape: TLShape, pageDelta: VecLike): TLShape {
		const localDelta = Vec.From(pageDelta).rot(-this.getShapeParentTransform(shape).rotation())
		return this.getChangesToTranslateShape(shape, localDelta.add(shape))
	}

	/**
	 * Move shapes by a delta.
	 *
	 * @example
	 * ```ts
	 * editor.nudgeShapes(['box1', 'box2'], { x: 8, y: 8 })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 * @param offset - The offset to apply to the shapes.
	 */
	nudgeShapes(shapes: TLShapeId[] | TLShape[], offset: VecLike): this {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return this
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = this.getShape(id)!
			changes.push(this.getChangesToTranslateShapeByPageDelta(shape, offset))
		}

		this.updateShapes(changes)

		return this
	}

	/**
	 * Duplicate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.duplicateShapes(['box1', 'box2'], { x: 8, y: 8 })
	 * editor.duplicateShapes(editor.getSelectedShapes(), { x: 8, y: 8 })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to duplicate.
	 * @param offset - The offset (in pixels) to apply to the duplicated shapes.
	 *
	 * @public
	 */
	duplicateShapes(shapes: TLShapeId[] | TLShape[], offset?: VecLike): this {
		this.run(() => {
			const _ids = toShapeIds(shapes)

			const ids = this._shouldIgnoreShapeLock ? _ids : this._getUnlockedShapeIds(_ids)
			if (ids.length <= 0) return this

			const initialIds = new Set(ids)
			const shapeIdSet = this.getShapeAndDescendantIds(ids)

			const orderedShapeIds = [...shapeIdSet].reverse()
			const shapeIds = new Map<TLShapeId, TLShapeId>()
			for (const shapeId of shapeIdSet) {
				shapeIds.set(shapeId, createShapeId())
			}

			const { shapesToCreateWithOriginals, bindingsToCreate } = withIsolatedShapes(
				this,
				shapeIdSet,
				(bindingIdsToMaintain) => {
					const bindingsToCreate: TLBinding[] = []
					for (const originalId of bindingIdsToMaintain) {
						const originalBinding = this.getBinding(originalId)
						if (!originalBinding) continue

						const duplicatedId = createBindingId()
						bindingsToCreate.push({
							...originalBinding,
							id: duplicatedId,
							fromId: assertExists(shapeIds.get(originalBinding.fromId)),
							toId: assertExists(shapeIds.get(originalBinding.toId)),
						})
					}

					const shapesToCreateWithOriginals: { shape: TLShape; originalShape: TLShape }[] = []
					for (const originalId of orderedShapeIds) {
						const duplicatedId = assertExists(shapeIds.get(originalId))
						const originalShape = this.getShape(originalId)
						if (!originalShape) continue

						let ox = 0
						let oy = 0

						// Only offset the roots of the duplicated tree: a descendant that was also passed in
						// follows its duplicated parent, so offsetting it too would move it twice
						if (
							offset &&
							initialIds.has(originalId) &&
							!shapeIdSet.has(originalShape.parentId as TLShapeId)
						) {
							const parentTransform = this.getShapeParentTransform(originalShape)
							const vec = new Vec(offset.x, offset.y).rot(-parentTransform!.rotation())
							ox = vec.x
							oy = vec.y
						}

						shapesToCreateWithOriginals.push({
							shape: {
								...originalShape,
								id: duplicatedId,
								x: originalShape.x + ox,
								y: originalShape.y + oy,
								// Use a dummy index for now, it will get updated outside of the `withIsolatedShapes`
								index: 'a1' as IndexKey,
								parentId:
									shapeIds.get(originalShape.parentId as TLShapeId) ?? originalShape.parentId,
							},
							originalShape,
						})
					}

					return { shapesToCreateWithOriginals, bindingsToCreate }
				}
			)

			// We will update the indexes after the `withIsolatedShapes`, since we cannot rely on the indexes
			// to be correct inside of it.
			shapesToCreateWithOriginals.forEach(({ shape, originalShape }) => {
				const parentId = originalShape.parentId
				const siblings = this.getSortedChildIdsForParent(parentId)
				const currentIndex = siblings.indexOf(originalShape.id)
				const siblingAboveId = siblings[currentIndex + 1]
				const siblingAbove = siblingAboveId ? this.getShape(siblingAboveId) : undefined

				const index = getIndexBetween(originalShape.index, siblingAbove?.index)

				shape.index = index
			})
			const shapesToCreate = shapesToCreateWithOriginals.map(({ shape, originalShape }) => {
				// Give the shape util a chance to modify the duplicate, e.g. to re-stamp note
				// attribution to the current user so we don't forge the original author's identity.
				return this.getShapeUtil(shape).onBeforeDuplicate?.(originalShape, shape) ?? shape
			})

			if (!this.canCreateShapes(shapesToCreate)) {
				alertMaxShapes(this)
				return
			}

			this.createShapes(shapesToCreate)
			this.createBindings(bindingsToCreate)

			this.setSelectedShapes(
				compact(
					ids.map((oldId) => {
						const newId = shapeIds.get(oldId)
						if (!newId) return null
						if (!this.getShape(newId)) return null
						return newId
					})
				)
			)

			if (offset !== undefined) {
				// If we've offset the duplicated shapes, check to see whether their new bounds is entirely
				// contained in the current viewport. If not, then animate the camera to be centered on the
				// new shapes.
				const selectionPageBounds = this.getSelectionPageBounds()
				const viewportPageBounds = this.getViewportPageBounds()
				if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
					this.centerOnPoint(selectionPageBounds.center, {
						animation: { duration: this.options.animationMediumMs },
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
		const ids = toShapeIds(shapes)

		if (ids.length === 0) return this
		if (this.getIsReadonly()) return this

		const currentPageId = this.getCurrentPageId()

		if (pageId === currentPageId) return this
		if (!this.store.has(pageId)) return this

		// Basically copy the shapes
		const content = this.getContentFromCurrentPage(ids)

		// Just to be sure
		if (!content) return this

		// If there is no space on pageId, or if the selected shapes
		// would take the new page above the limit, don't move the shapes
		if (this.getPageShapeIds(pageId).size + content.shapes.length > this.options.maxShapesPerPage) {
			alertMaxShapes(this, pageId)
			return this
		}

		const fromPageZ = this.getCamera().z

		this.run(() => {
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
			this.setCamera({ ...this.getCamera(), z: fromPageZ })
			this.centerOnPoint(this.getSelectionRotatedPageBounds()!.center)
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
		const ids = toShapeIds(shapes)

		if (this.getIsReadonly() || ids.length === 0) return this

		let allLocked = true
		const shapesToToggle: TLShape[] = []
		for (const id of ids) {
			const shape = this.getShape(id)
			if (shape) {
				shapesToToggle.push(shape)
				if (!shape.isLocked) allLocked = false
			}
		}
		this.run(() => {
			if (allLocked) {
				this.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: false }))
				)
			} else {
				this.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true }))
				)
				this.setSelectedShapes([])
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
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this, 'toBack', ids, {
			considerAllShapes: true,
		})
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
	 * By default, the operation will only consider overlapping shapes.
	 * To consider all shapes, pass `{ considerAllShapes: true }` in the options.
	 *
	 * @example
	 * ```ts
	 * editor.sendBackward(['id1', 'id2'], { considerAllShapes: true })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 * @param opts - The options for the backward operation.
	 *
	 * @public
	 */
	sendBackward(shapes: TLShapeId[] | TLShape[], opts: { considerAllShapes?: boolean } = {}): this {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this, 'backward', ids, opts)
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
	 * By default, the operation will only consider overlapping shapes.
	 * To consider all shapes, pass `{ considerAllShapes: true }` in the options.
	 *
	 * @example
	 * ```ts
	 * editor.bringForward(['id1', 'id2'], { considerAllShapes: true })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to move.
	 * @param opts - The options for the forward operation.
	 *
	 * @public
	 */
	bringForward(shapes: TLShapeId[] | TLShape[], opts: { considerAllShapes?: boolean } = {}): this {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this, 'forward', ids, opts)
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
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this, 'toFront', ids)
		if (changes) this.updateShapes(changes)
		return this
	}

	/**
	 * Flip shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.flipShapes([box1, box2], 'horizontal', 32)
	 * editor.flipShapes(editor.getSelectedShapeIds(), 'horizontal', 32)
	 * ```
	 *
	 * @param shapes - The ids of the shapes to flip.
	 * @param operation - Whether to flip horizontally or vertically.
	 *
	 * @public
	 */
	flipShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		this._arranger.flipShapes(shapes, operation)
		return this
	}

	/**
	 * Stack shape.
	 *
	 * @example
	 * ```ts
	 * editor.stackShapes([box1, box2], 'horizontal')
	 * editor.stackShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stack.
	 * @param operation - Whether to stack horizontally or vertically.
	 * @param gap - The gap to leave between shapes. By default, uses the editor's `adjacentShapeMargin` option.
	 *
	 * @public
	 */
	stackShapes(
		shapes: TLShapeId[] | TLShape[],
		operation: 'horizontal' | 'vertical',
		gap?: number
	): this {
		this._arranger.stackShapes(shapes, operation, gap)
		return this
	}

	/**
	 * Pack shapes into a grid centered on their current position. Based on potpack (https://github.com/mapbox/potpack).
	 *
	 * @example
	 * ```ts
	 * editor.packShapes([box1, box2])
	 * editor.packShapes(editor.getSelectedShapeIds(), 32)
	 * ```
	 *
	 *
	 * @param shapes - The shapes (or shape ids) to pack.
	 * @param gap - The padding to apply to the packed shapes. Defaults to the editor's `adjacentShapeMargin` option.
	 */
	packShapes(shapes: TLShapeId[] | TLShape[], _gap?: number): this {
		this._arranger.packShapes(shapes, _gap)
		return this
	}

	/**
	 * Align shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.alignShapes([box1, box2], 'left')
	 * editor.alignShapes(editor.getSelectedShapeIds(), 'left')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to align.
	 * @param operation - The align operation to apply.
	 *
	 * @public
	 */
	alignShapes(
		shapes: TLShapeId[] | TLShape[],
		operation:
			| 'left'
			| 'center-horizontal'
			| 'right'
			| 'top'
			| 'center-vertical'
			| 'bottom'
			| 'center'
	): this {
		this._arranger.alignShapes(shapes, operation)
		return this
	}

	/**
	 * Distribute shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.distributeShapes([box1, box2], 'horizontal')
	 * editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to distribute.
	 * @param operation - Whether to distribute shapes horizontally or vertically.
	 *
	 * @public
	 */
	distributeShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		this._arranger.distributeShapes(shapes, operation)
		return this
	}

	/**
	 * Stretch shape sizes and positions to fill their common bounding box.
	 *
	 * @example
	 * ```ts
	 * editor.stretchShapes([box1, box2], 'horizontal')
	 * editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stretch.
	 * @param operation - Whether to stretch shapes horizontally or vertically.
	 *
	 * @public
	 */
	stretchShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): this {
		this._arranger.stretchShapes(shapes, operation)
		return this
	}

	/**
	 * Resize and reposition a set of shapes so that their combined page bounds matches the given
	 * target bounds.
	 *
	 * @example
	 * ```ts
	 * editor.resizeToBounds([box1, box2], { x: 0, y: 0, w: 500, h: 500 })
	 * editor.resizeToBounds(editor.getSelectedShapeIds(), new Box(0, 0, 500, 500))
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to resize.
	 * @param bounds - The target bounding box.
	 *
	 * @public
	 */
	resizeToBounds(shapes: TLShapeId[] | TLShape[], bounds: BoxLike): this {
		this._arranger.resizeToBounds(shapes, bounds)
		return this
	}

	/**
	 * Resize a shape.
	 *
	 * @param shape - The shape (or the shape id of the shape) to resize.
	 * @param scale - The scale factor to apply to the shape.
	 * @param opts - Additional options.
	 *
	 * @public
	 */
	resizeShape(shape: TLShapeId | TLShape, scale: VecLike, opts: TLResizeShapeOptions = {}): this {
		const partial = this.getResizeShapePartial(shape, scale, opts)
		if (partial) this.updateShapes([partial])
		return this
	}

	/**
	 * Get the update for a resized shape without committing it to the store. Interactions that
	 * resize many shapes at once use this to collect all of the updates and commit them in a
	 * single batch. Returns null when there is nothing to update.
	 *
	 * Shapes that are rotated out of alignment with the scale axis cannot be resized with a
	 * single update; those shapes are resized immediately (as `resizeShape` would do) and null
	 * is returned.
	 *
	 * @internal
	 */
	getResizeShapePartial(
		shape: TLShapeId | TLShape,
		scale: VecLike,
		opts: TLResizeShapeOptions = {}
	): TLShapePartial | null {
		const id = typeof shape === 'string' ? shape : shape.id
		if (this.getIsReadonly()) return null

		if (!Number.isFinite(scale.x)) scale = new Vec(1, scale.y)
		if (!Number.isFinite(scale.y)) scale = new Vec(scale.x, 1)

		const initialShape = opts.initialShape ?? this.getShape(id)
		if (!initialShape) return null

		const scaleOrigin = opts.scaleOrigin ?? this.getShapePageBounds(id)?.center
		if (!scaleOrigin) return null

		const pageTransform = opts.initialPageTransform
			? Mat.Cast(opts.initialPageTransform)
			: this.getShapePageTransform(id)

		const pageRotation = pageTransform.rotation()

		const scaleAxisRotation = opts.scaleAxisRotation ?? pageRotation

		const initialBounds = opts.initialBounds ?? this.getShapeGeometry(id).bounds

		if (!initialBounds) return null

		const isAspectRatioLocked =
			opts.isAspectRatioLocked ?? this.getShapeUtil(initialShape).isAspectRatioLocked(initialShape)

		if (!areAnglesCompatible(pageRotation, scaleAxisRotation)) {
			// shape is awkwardly rotated, keep the aspect ratio locked and adopt the scale factor
			// from whichever axis is being scaled the least, to avoid the shape getting bigger
			// than the bounds of the selection
			// const minScale = Math.min(Math.abs(scale.x), Math.abs(scale.y))
			this._resizeUnalignedShape(id, scale, {
				...opts,
				initialBounds,
				scaleOrigin,
				scaleAxisRotation,
				initialPageTransform: pageTransform,
				isAspectRatioLocked,
				initialShape,
			})
			return null
		}

		const util = this.getShapeUtil(initialShape)

		if (isAspectRatioLocked) {
			if (Math.abs(scale.x) > Math.abs(scale.y)) {
				scale = new Vec(scale.x, Math.sign(scale.y) * Math.abs(scale.x))
			} else {
				scale = new Vec(Math.sign(scale.x) * Math.abs(scale.y), scale.y)
			}
		}

		let workingShape: TLShape | null = null

		const initialPagePoint = Mat.applyToPoint(pageTransform, new Vec())

		if (util.onResize && util.canResize(initialShape)) {
			// get the model changes from the shape util
			const newPagePoint = this._scalePagePoint(
				initialPagePoint,
				scaleOrigin,
				scale,
				scaleAxisRotation
			)

			const newLocalPoint = this.getPointInParentSpace(initialShape.id, newPagePoint)

			// resize the shape's local bounding box
			const myScale = new Vec(scale.x, scale.y)
			// the shape is aligned with the rest of the shapes in the selection, but may be
			// 90deg offset from the main rotation of the selection, in which case
			// we need to flip the width and height scale factors
			const areWidthAndHeightAlignedWithCorrectAxis = approximately(
				(pageRotation - scaleAxisRotation) % Math.PI,
				0
			)
			myScale.x = areWidthAndHeightAlignedWithCorrectAxis ? scale.x : scale.y
			myScale.y = areWidthAndHeightAlignedWithCorrectAxis ? scale.y : scale.x

			// need to adjust the shape's x and y points in case the parent has moved since start of
			// resizing, e.g. groups
			const { x, y } = this.getPointInParentSpace(initialShape.id, initialPagePoint)

			workingShape = initialShape
			if (!opts.skipStartAndEndCallbacks) {
				workingShape = applyPartialToRecordWithProps(
					initialShape,
					util.onResizeStart?.(initialShape) ?? undefined
				)
			}

			const resizedShape = util.onResize(
				{ ...initialShape, x, y },
				{
					newPoint: newLocalPoint,
					handle: opts.dragHandle ?? 'bottom_right',
					// don't set isSingle to true for children
					mode: opts.mode ?? 'scale_shape',
					scaleX: myScale.x,
					scaleY: myScale.y,
					initialBounds,
					initialShape,
				}
			)

			workingShape = applyPartialToRecordWithProps(workingShape, {
				id,
				type: initialShape.type as any,
				x: newLocalPoint.x,
				y: newLocalPoint.y,
				...resizedShape,
			})

			if (!opts.skipStartAndEndCallbacks) {
				workingShape = applyPartialToRecordWithProps(
					workingShape,
					util.onResizeEnd?.(initialShape, workingShape) ?? undefined
				)
			}

			if (resizedShape) {
				return workingShape
			}
		}

		// the shape was not resized by its util, so reposition it (rather than resizing it)
		// based on where its resized center would be

		const initialPageCenter = Mat.applyToPoint(pageTransform, initialBounds.center)
		// get the model changes from the shape util
		const newPageCenter = this._scalePagePoint(
			initialPageCenter,
			scaleOrigin,
			scale,
			scaleAxisRotation
		)

		// A parent-space delta added to the shape's initial x/y would double-count the parent's own
		// move during the same gesture — a repositioned group carries its children with it (#10617).
		const repositionedPagePoint = Vec.Add(
			newPageCenter,
			Vec.Sub(initialPagePoint, initialPageCenter)
		)
		const repositionedLocalPoint = this.getPointInParentSpace(
			initialShape.id,
			repositionedPagePoint
		)

		if (workingShape) {
			// the util's onResize ran but returned no change; keep the working update (which may
			// include changes from onResizeStart / onResizeEnd) and reposition the shape
			return {
				...workingShape,
				x: repositionedLocalPoint.x,
				y: repositionedLocalPoint.y,
			}
		}

		return {
			id,
			type: initialShape.type as any,
			x: repositionedLocalPoint.x,
			y: repositionedLocalPoint.y,
		}
	}

	/** @internal */
	private _scalePagePoint(
		point: VecLike,
		scaleOrigin: VecLike,
		scale: VecLike,
		scaleAxisRotation: number
	) {
		const relativePoint = Vec.RotWith(point, scaleOrigin, -scaleAxisRotation).sub(scaleOrigin)

		// calculate the new point position relative to the scale origin
		const newRelativePagePoint = Vec.MulV(relativePoint, scale)

		// and rotate it back to page coords to get the new page point of the resized shape
		const destination = Vec.Add(newRelativePagePoint, scaleOrigin).rotWith(
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
			initialBounds: Box
			scaleOrigin: VecLike
			scaleAxisRotation: number
			initialShape: TLShape
			isAspectRatioLocked: boolean
			initialPageTransform: MatLike
			dragHandle?: TLResizeHandle
			mode?: TLResizeMode
			skipStartAndEndCallbacks?: boolean
		}
	) {
		const { type } = options.initialShape
		// If a shape is not aligned with the scale axis we need to treat it differently to avoid skewing.
		// Instead of skewing we normalize the scale aspect ratio (i.e. keep the same scale magnitude in both axes)
		// and then after applying the scale to the shape we also rotate it if required and translate it so that it's center
		// point ends up in the right place.

		const shapeScale = new Vec(scale.x, scale.y)

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
			isAspectRatioLocked: options.isAspectRatioLocked,
			initialPageTransform: options.initialPageTransform,
			dragHandle: options.dragHandle,
			mode: options.mode,
			// this is one frame of the same resize, not a new one, so don't fire start/end again
			skipStartAndEndCallbacks: options.skipStartAndEndCallbacks,
		})

		// then if the shape is flipped in one axis only, we need to apply an extra rotation
		// to make sure the shape is mirrored correctly
		if (Math.sign(scale.x) * Math.sign(scale.y) < 0) {
			// Mirroring across an axis at angle `axisRot` maps a page rotation `pageRot` to
			// `2 * axisRot - pageRot`. For a shape with local rotation `localRot` whose parent had
			// page rotation `parentRot` when the resize began:
			// - pageRot = parentRot + localRot
			// - newPageRot = 2 * axisRot - pageRot
			// - newPageRot = (parentRot + parentDelta) + newLocalRot
			// - Therefore: newLocalRot = 2 * axisRot - localRot - 2 * parentRot - parentDelta
			// `parentDelta` is how far the parent has rotated since the resize began. Nested resizes
			// commit ancestors before descendants, so an unaligned parent may itself have been
			// flipped by the time its child gets here; reading the parent's current rotation as if
			// it were the initial one would then double-count that flip.
			const parentRotation = this.getShapeParentTransform(id).rotation()
			// take the shortest arc so the stored rotation doesn't drift by 2π when the parent
			// hasn't moved and the initial page rotation happens to be wrapped
			const parentDelta = shortAngleDist(
				Mat.Cast(options.initialPageTransform).rotation() - options.initialShape.rotation,
				parentRotation
			)
			const initialParentRotation = parentRotation - parentDelta
			const rotation =
				2 * options.scaleAxisRotation -
				options.initialShape.rotation -
				2 * initialParentRotation -
				parentDelta
			this.updateShapes([{ id, type, rotation }])
		}

		// Next we need to translate the shape so that it's center point ends up in the right place.
		// To do that we first need to calculate the center point of the shape in the current page space before the scale was applied.
		const preScaleShapePageCenter = Mat.applyToPoint(
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
		const pageTransform = this.getShapePageTransform(id)
		// We need to use the local bounds center transformed to page space, not the axis-aligned
		// page bounds center. This is because the page bounds are axis-aligned and their center
		// changes when the rotation changes, but we want to use the same reference point as
		// preScaleShapePageCenter (which used initialBounds.center transformed by the page transform).
		const currentLocalBounds = this.getShapeGeometry(id).bounds
		const currentPageCenter = Mat.applyToPoint(pageTransform, currentLocalBounds.center)
		const shapePageTransformOrigin = pageTransform.point()
		const pageDelta = Vec.Sub(postScaleShapePageCenter, currentPageCenter)

		// and finally figure out what the shape's new position should be
		const postScaleShapePagePoint = Vec.Add(shapePageTransformOrigin, pageDelta)
		const { x, y } = this.getPointInParentSpace(id, postScaleShapePagePoint)

		this.updateShapes([{ id, type, x, y }])

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
	 * Get whether the provided shape can be created.
	 *
	 * @param shape - The shape or shape IDs to check.
	 *
	 * @public
	 */
	canCreateShape(shape: OptionalKeys<TLShapePartial<TLShape>, 'id'> | TLShape['id']): boolean {
		return this.canCreateShapes([shape])
	}

	/**
	 * Get whether the provided shapes can be created.
	 *
	 * @param shapes - The shapes or shape IDs to create.
	 *
	 * @public
	 */
	canCreateShapes(
		shapes: (TLShape['id'] | OptionalKeys<TLShapePartial<TLShape>, 'id'>)[]
	): boolean {
		return shapes.length + this.getCurrentPageShapeIds().size <= this.options.maxShapesPerPage
	}

	/**
	 * Create a single shape.
	 *
	 * @example
	 * ```ts
	 * editor.createShape(myShape)
	 * editor.createShape({ id: 'box1', type: 'text', props: { richText: toRichText("ok") } })
	 * ```
	 *
	 * @param shape - The shape (or shape partial) to create.
	 *
	 * @public
	 */
	createShape<TShape extends TLShape>(shape: TLCreateShapePartial<TShape>): this {
		this.createShapes([shape])
		return this
	}

	/**
	 * Create shapes.
	 *
	 * @example
	 * ```ts
	 * editor.createShapes([myShape])
	 * editor.createShapes([{ id: 'box1', type: 'text', props: { richText: toRichText("ok") } }])
	 * ```
	 *
	 * @param shapes - The shapes (or shape partials) to create.
	 *
	 * @public
	 */
	createShapes<TShape extends TLShape = TLShape>(shapes: TLCreateShapePartial<TShape>[]): this {
		if (!Array.isArray(shapes)) {
			throw Error('Editor.createShapes: must provide an array of shapes or shape partials')
		}
		if (this.getIsReadonly()) return this
		if (shapes.length <= 0) return this

		const currentPageShapeIds = this.getCurrentPageShapeIds()

		const maxShapesReached =
			shapes.length + currentPageShapeIds.size > this.options.maxShapesPerPage

		if (maxShapesReached) {
			// can't create more shapes than fit on the page
			alertMaxShapes(this)
			// todo: throw an error here? Otherwise we'll need to check every time whether the shapes were actually created
			return this
		}

		const focusedGroupId = this.getFocusedGroupId()

		this.run(() => {
			// 1. Parents

			// Make sure that each partial will become the child of either the
			// page or another shape that exists (or that will exist) in this page.

			// find last parent id
			const currentPageShapesSorted = this.getCurrentPageShapesSorted()

			const partials = shapes.map((partial) => {
				if (!partial.id) {
					partial = { id: createShapeId(), ...partial }
				}

				// If the partial does not provide the parentId OR if the provided
				// parentId is NOT in the store AND NOT among the other shapes being
				// created, then we need to find a parent for the shape. This can be
				// another shape that exists under that point and which can receive
				// children of the creating shape's type, or else the page itself.
				if (
					!partial.parentId ||
					!(this.store.has(partial.parentId) || shapes.some((p) => p.id === partial.parentId))
				) {
					let parentId: TLParentId = this.getFocusedGroupId()

					const isPositioned = partial.x !== undefined && partial.y !== undefined

					// If the shape has been explicitly positioned, we'll try to find a parent at
					// that position. If not, we'll assume the user isn't deliberately placing the
					// shape and the positioning will be handled later by another system.
					if (isPositioned) {
						for (let i = currentPageShapesSorted.length - 1; i >= 0; i--) {
							const parent = currentPageShapesSorted[i]
							const util = this.getShapeUtil(parent)
							if (
								util.canReceiveNewChildrenOfType(parent, partial.type) &&
								!this.isShapeHidden(parent) &&
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
							) {
								parentId = parent.id
								break
							}
						}
					}

					const prevParentId = partial.parentId

					// a shape cannot be its own parent. This was a rare issue with frames/groups in the syncFuzz tests.
					if (parentId === partial.id) {
						parentId = focusedGroupId
					}

					// If the parentid has changed...
					if (parentId !== prevParentId) {
						partial = { ...partial }

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
					}
				}

				return partial
			})

			// 2. Indices

			// Get the highest index among the parents of each of the
			// the shapes being created; we'll increment from there.

			const parentIndices = new Map<TLParentId, IndexKey>()

			const shapeRecordsToCreate: TLShape[] = []

			const { opacityForNextShape } = this.getInstanceState()

			for (const partial of partials) {
				const util = this.getShapeUtil(partial as TLShapePartial)

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
					opacity: partial.opacity ?? opacityForNextShape,
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

			this.emit('created-shapes', shapeRecordsToCreate)
			this.emit('edit')
			this.store.put(shapeRecordsToCreate)
		})

		return this
	}

	/**
	 * Animate a shape.
	 *
	 * @example
	 * ```ts
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 })
	 * editor.animateShape({ id: 'box1', type: 'box', x: 100, y: 100 }, { animation: { duration: 100, ease: t => t*t } })
	 * ```
	 *
	 * @param partial - The shape partial to update.
	 * @param opts - The animation's options.
	 *
	 * @public
	 */
	animateShape(
		partial: TLShapePartial | null | undefined,
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): this {
		this._shapeAnimator.animateShape(partial, opts)
		return this
	}

	/**
	 * Animate shapes.
	 *
	 * @example
	 * ```ts
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }])
	 * editor.animateShapes([{ id: 'box1', type: 'box', x: 100, y: 100 }], { animation: { duration: 100, ease: t => t*t } })
	 * ```
	 *
	 * @param partials - The shape partials to update.
	 * @param opts - The animation's options.
	 *
	 * @public
	 */
	animateShapes(
		partials: (TLShapePartial | null | undefined)[],
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): this {
		this._shapeAnimator.animateShapes(partials, opts)
		return this
	}

	/**
	 * Create a group containing the provided shapes.
	 *
	 * @example
	 * ```ts
	 * editor.groupShapes([myShape, myOtherShape])
	 * editor.groupShapes([myShape, myOtherShape], { groupId: myGroupId, select: false })
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to group. Defaults to the selected shapes.
	 * @param opts - An options object.
	 *
	 * @public
	 */
	groupShapes(shapes: TLShape[], opts?: Partial<{ groupId: TLShapeId; select: boolean }>): this
	groupShapes(ids: TLShapeId[], opts?: Partial<{ groupId: TLShapeId; select: boolean }>): this
	groupShapes(
		shapes: TLShapeId[] | TLShape[],
		opts = {} as Partial<{ groupId: TLShapeId; select: boolean }>
	): this {
		const { groupId = createShapeId(), select = true } = opts

		if (!Array.isArray(shapes)) {
			throw Error('Editor.groupShapes: must provide an array of shapes or shape ids')
		}
		if (this.getIsReadonly()) return this

		const ids = toShapeIds(shapes)

		const shapesToGroup = compact(
			(this._shouldIgnoreShapeLock ? ids : this._getUnlockedShapeIds(ids)).map((id) =>
				this.getShape(id)
			)
		)
		// Re-check after the lock filter: Box.Common of nothing is not a valid box and would throw
		if (shapesToGroup.length <= 1) return this

		const sortedShapeIds = shapesToGroup.sort(sortByIndex).map((s) => s.id)
		const childBounds = compact(shapesToGroup.map((shape) => this.getShapePageBounds(shape)))
		const pageBounds = Box.Common(childBounds)

		if (!pageBounds.isValid()) {
			throw Error(`Editor.groupShapes: group bounds are invalid (NaN).`)
		}

		const { x, y } = pageBounds.point

		const parentId = this.findCommonAncestor(shapesToGroup) ?? this.getCurrentPageId()

		// createShapes bails out when the page is full, so check first; otherwise the shapes get
		// reparented into a group that was never created and vanish from the page
		if (!this.canCreateShapes([groupId])) {
			alertMaxShapes(this)
			return this
		}

		// If the select tool is mid-interaction, cancel it (get back to idle) before grouping
		if (this.isIn('select') && !this.isIn('select.idle')) {
			this.cancel()
		}

		// Find all the shapes that have the same parentId, and use the highest index.
		const shapesWithRootParent = shapesToGroup
			.filter((shape) => shape.parentId === parentId)
			.sort(sortByIndex)

		const highestIndex = shapesWithRootParent[shapesWithRootParent.length - 1]?.index

		this.run(() => {
			this.createShapes([
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
			if (select) {
				// the select option determines whether the grouped shapes' children are selected
				this.select(groupId)
			}
		})

		return this
	}

	/**
	 * Ungroup some shapes.
	 *
	 * @example
	 * ```ts
	 * editor.ungroupShapes([myGroup, myOtherGroup])
	 * editor.ungroupShapes([myGroup], { select: false })
	 * ```
	 *
	 * @param shapes - The group shapes (or shape ids) to ungroup.
	 * @param opts - An options object.
	 *
	 * @public
	 */
	ungroupShapes(ids: TLShapeId[], opts?: Partial<{ select: boolean }>): this
	ungroupShapes(shapes: TLShape[], opts?: Partial<{ select: boolean }>): this
	ungroupShapes(shapes: TLShapeId[] | TLShape[], opts = {} as Partial<{ select: boolean }>) {
		if (this.getIsReadonly()) return this

		const { select = true } = opts
		const ids = toShapeIds(shapes)

		const shapesToUngroup = compact(
			(this._shouldIgnoreShapeLock ? ids : this._getUnlockedShapeIds(ids)).map((id) =>
				this.getShape(id)
			)
		)

		if (shapesToUngroup.length === 0) return this

		// If the select tool is mid-interaction, cancel it (get back to idle) before ungrouping
		if (this.isIn('select') && !this.isIn('select.idle')) {
			this.cancel()
		}

		// The ids of the selected shapes after ungrouping;
		// these include all of the grouped shapes children,
		// plus any shapes that were selected apart from the groups.
		const idsToSelect = new Set<TLShapeId>()

		// Get all groups in the selection
		const groups: TLGroupShape[] = []

		shapesToUngroup.forEach((shape) => {
			if (this.isShapeOfType(shape, 'group')) {
				groups.push(shape)
			} else {
				idsToSelect.add(shape.id)
			}
		})

		if (groups.length === 0) return this

		this.run(() => {
			for (let i = 0, n = groups.length; i < n; i++) {
				// Re-read the group: ungrouping an outer group earlier in this loop reparents the
				// inner ones, and the stale parentId would send their children into a group that's
				// about to be deleted
				const group = this.getShape<TLGroupShape>(groups[i].id)
				if (!group) continue
				const childIds = this.getSortedChildIdsForParent(group.id)

				for (let j = 0, n = childIds.length; j < n; j++) {
					idsToSelect.add(childIds[j])
				}

				this.reparentShapes(childIds, group.parentId, group.index)
			}

			this.deleteShapes(groups.map((group) => group.id))

			if (select) {
				// the select option determines whether the ungrouped shapes' children are selected
				this.select(...idsToSelect)
			}
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
	 *
	 * @public
	 */
	updateShape<T extends TLShape = TLShape>(partial: TLShapePartial<T> | null | undefined) {
		this.updateShapes([partial])
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
	 *
	 * @public
	 */
	updateShapes<T extends TLShape>(partials: (TLShapePartial<T> | null | undefined)[]) {
		const compactedPartials: TLShapePartial<T>[] = []
		const animatingShapes = this.plugins.getOptional(shapeAnimationCapability)?.animatingShapes

		for (let i = 0, n = partials.length; i < n; i++) {
			const partial = partials[i]
			if (!partial) continue
			// Get the current shape referenced by the partial
			const shape = this.getShape(partial.id)
			if (!shape) continue

			// If we're "forcing" the update, then we'll update the shape
			// regardless of whether it / its ancestor is locked
			if (!this._shouldIgnoreShapeLock) {
				if (shape.isLocked) {
					// If the shape itself is locked (even if one of its ancestors is
					// also locked) then only allow an update that unlocks the shape.
					if (!(Object.hasOwn(partial, 'isLocked') && !partial.isLocked)) {
						continue
					}
				} else if (this.isShapeOrAncestorLocked(shape)) {
					// If the shape itself is unlocked, and any of the shape's
					// ancestors are locked then we'll skip the update
					continue
				}
			}

			// Remove any animating shapes from the list of partials
			animatingShapes?.delete(partial.id)

			compactedPartials.push(partial)
		}

		this._updateShapes(compactedPartials)
		return this
	}

	/** @internal */
	_updateShapes(_partials: (TLShapePartial | null | undefined)[]) {
		if (this.getIsReadonly()) return

		this.run(() => {
			const updates = []

			let shape: TLShape | undefined
			let updated: TLShape

			for (let i = 0, n = _partials.length; i < n; i++) {
				const partial = _partials[i]
				// Skip nullish partials (sometimes created by map fns returning undefined)
				if (!partial) continue

				// Get the current shape referenced by the partial
				// If there is no current shape, we'll skip this update
				shape = this.getShape(partial.id)
				if (!shape) continue

				// Get the updated version of the shape
				// If the update had no effect, we'll skip this update
				updated = applyPartialToRecordWithProps(shape, partial)
				if (updated === shape) continue

				//if any shape has an onBeforeUpdate handler, call it and, if the handler returns a
				// new shape, replace the old shape with the new one. This is used for example when
				// repositioning a text shape based on its new text content.
				updated = this.getShapeUtil(shape).onBeforeUpdate?.(shape, updated) ?? updated

				updates.push(updated)
			}

			this.emit('edited-shapes', updates)
			this.emit('edit')
			this.store.put(updates)
		})
	}

	/** @internal */
	private _getUnlockedShapeIds(ids: TLShapeId[]): TLShapeId[] {
		// Match updateShapes, which also refuses shapes under a locked ancestor; otherwise a child
		// of a locked frame can't be moved but can still be deleted or duplicated
		return ids.filter((id) => !this.isShapeOrAncestorLocked(id))
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
	deleteShapes(_ids: TLShapeId[] | TLShape[]): this {
		if (this.getIsReadonly()) return this

		if (!Array.isArray(_ids)) {
			throw Error('Editor.deleteShapes: must provide an array of shapes or shapeIds')
		}

		const shapeIds = toShapeIds(_ids)

		// Normally we don't want to delete locked shapes, but if the force option is set, we'll delete them anyway
		const shapeIdsToDelete = this._shouldIgnoreShapeLock
			? shapeIds
			: this._getUnlockedShapeIds(shapeIds)

		if (shapeIdsToDelete.length === 0) return this

		// We also need to delete these shapes' descendants
		const allShapeIdsToDelete = new Set<TLShapeId>(shapeIdsToDelete)

		for (const id of shapeIdsToDelete) {
			this.visitDescendants(id, (childId) => {
				allShapeIdsToDelete.add(childId)
			})
		}

		this.emit('deleted-shapes', [...allShapeIdsToDelete])
		this.emit('edit')
		return this.run(() => this.store.remove([...allShapeIdsToDelete]))
	}

	/**
	 * Delete a shape.
	 *
	 * @example
	 * ```ts
	 * editor.deleteShape(shape.id)
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

	/* --------------------- Styles --------------------- */

	/**
	 * Get the style for the next shape.
	 *
	 * @example
	 * ```ts
	 * const color = editor.getStyleForNextShape(DefaultColorStyle)
	 * ```
	 *
	 * @param style - The style to get.
	 *
	 * @public */
	getStyleForNextShape<T>(style: StyleProp<T>): T {
		const value = this.getInstanceState().stylesForNextShape[style.id]
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
	 * const color = editor.getSharedStyles().get(DefaultColorStyle)
	 * if (color && color.type === 'shared') {
	 *   print('All selected shapes have the same color:', color.value)
	 * }
	 * ```
	 *
	 * @public
	 */
	getSharedStyles(): ReadonlySharedStyleMap {
		return this._styles.getSharedStyles()
	}

	/**
	 * Get the currently selected shared opacity.
	 * If any shapes are selected, this returns the shared opacity of the selected shapes.
	 * Otherwise, this returns the chosen opacity for the next shape.
	 *
	 * @public
	 */
	getSharedOpacity(): SharedStyle<number> {
		return this._styles.getSharedOpacity()
	}

	/**
	 * Set the opacity for the next shapes. This will effect subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForNextShapes(0.5)
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 * @param historyOptions - The history options for the change.
	 */
	setOpacityForNextShapes(opacity: number, historyOptions?: TLHistoryBatchOptions): this {
		this._styles.setOpacityForNextShapes(opacity, historyOptions)
		return this
	}

	/**
	 * Set the current opacity. This will effect any selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setOpacityForSelectedShapes(0.5)
	 * ```
	 *
	 * @param opacity - The opacity to set. Must be a number between 0 and 1 inclusive.
	 */
	setOpacityForSelectedShapes(opacity: number): this {
		this._styles.setOpacityForSelectedShapes(opacity)
		return this
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp} for the next shapes. This change will be applied to subsequently created shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForNextShapes(DefaultColorStyle, 'red')
	 * editor.setStyleForNextShapes(DefaultColorStyle, 'red', { ephemeral: true })
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 * @param historyOptions - The history options for the change.
	 *
	 * @public
	 */
	setStyleForNextShapes<T>(
		style: StyleProp<T>,
		value: T,
		historyOptions?: TLHistoryBatchOptions
	): this {
		this._styles.setStyleForNextShapes(style, value, historyOptions)
		return this
	}

	/**
	 * Set the value of a {@link @tldraw/tlschema#StyleProp}. This change will be applied to the currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
	 * ```
	 *
	 * @param style - The style to set.
	 * @param value - The value to set.
	 *
	 * @public
	 */
	setStyleForSelectedShapes<S extends StyleProp<any>>(style: S, value: StylePropValue<S>): this {
		this._styles.setStyleForSelectedShapes(style, value)
		return this
	}

	/* --------------------- Content -------------------- */

	/** @internal */
	readonly externalAssetContentHandlers!: TLExternalAssetHandlers

	/** @internal */
	private readonly temporaryAssetPreview = new Map<TLAssetId, string>()

	/**
	 * Register an external asset handler. This handler will be called when the editor needs to
	 * create an asset for some external content, like an image/video file or a bookmark URL. For
	 * example, the 'file' type handler will be called when a user drops an image onto the canvas.
	 *
	 * The handler should extract any relevant metadata for the asset, upload it to blob storage
	 * using {@link Editor.uploadAsset} if needed, and return the asset with the metadata & uploaded
	 * URL.
	 *
	 * @example
	 * ```ts
	 * editor.registerExternalAssetHandler('file', myHandler)
	 * ```
	 *
	 * @param type - The type of external content.
	 * @param handler - The handler to use for this content type.
	 *
	 * @public
	 */
	registerExternalAssetHandler<T extends TLExternalAsset['type']>(
		type: T,
		handler: null | ((info: TLExternalAsset & { type: T }) => Promise<TLAsset>)
	): this {
		this.externalAssetContentHandlers[type] = handler as any
		return this
	}

	/**
	 * Register a temporary preview of an asset. This is useful for showing a ghost image of
	 * something that is being uploaded. Retrieve the placeholder with
	 * {@link Editor.getTemporaryAssetPreview}. Placeholders last for 3 minutes by default, but this
	 * can be configured using
	 *
	 * @example
	 * ```ts
	 * editor.createTemporaryAssetPreview(assetId, file)
	 * ```
	 *
	 * @param assetId - The asset's id.
	 * @param file - The raw file.
	 *
	 * @public
	 */
	createTemporaryAssetPreview(assetId: TLAssetId, file: File) {
		if (this.temporaryAssetPreview.has(assetId)) {
			return this.temporaryAssetPreview.get(assetId)
		}

		const objectUrl = URL.createObjectURL(file)
		this.temporaryAssetPreview.set(assetId, objectUrl)

		// eslint-disable-next-line no-restricted-globals -- we always want to revoke the asset and object URL
		setTimeout(() => {
			this.temporaryAssetPreview.delete(assetId)
			URL.revokeObjectURL(objectUrl)
		}, this.options.temporaryAssetPreviewLifetimeMs)

		return objectUrl
	}

	/**
	 * Get temporary preview of an asset. This is useful for showing a ghost
	 * image of something that is being uploaded.
	 *
	 * @example
	 * ```ts
	 * editor.getTemporaryAssetPreview('someId')
	 * ```
	 *
	 * @param assetId - The asset's id.
	 *
	 * @public
	 */
	getTemporaryAssetPreview(assetId: TLAssetId) {
		return this.temporaryAssetPreview.get(assetId)
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
	async getAssetForExternalContent(info: TLExternalAsset): Promise<TLAsset | undefined> {
		return await this.plugins.get(externalContentCapability).getAsset(info)
	}

	hasExternalAssetHandler(type: TLExternalAsset['type']): boolean {
		return !!this.plugins.getOptional(externalContentCapability)?.assetHandlers[type]
	}

	/** @internal */
	readonly externalContentHandlers!: TLExternalContentHandlers

	/**
	 * Register an external content handler. This handler will be called when the editor receives
	 * external content of the provided type. For example, the 'image' type handler will be called
	 * when a user drops an image onto the canvas.
	 *
	 * @example
	 * ```ts
	 * editor.registerExternalContentHandler('text', myHandler)
	 * ```
	 * @example
	 * ```ts
	 * editor.registerExternalContentHandler<'embed', MyEmbedType>('embed', myHandler)
	 * ```
	 *
	 * @param type - The type of external content.
	 * @param handler - The handler to use for this content type.
	 *
	 * @public
	 */
	registerExternalContentHandler<T extends TLExternalContent<E>['type'], E>(
		type: T,
		handler:
			| null
			| ((
					info: T extends TLExternalContent<E>['type']
						? Extract<TLExternalContent<E>, { type: T }>
						: TLExternalContent<E>
			  ) => void)
	): this {
		this.externalContentHandlers[type] = handler as any
		return this
	}

	/**
	 * Handle external content, such as files, urls, embeds, or plain text which has been put into the app, for example by pasting external text or dropping external images onto canvas.
	 *
	 * @param info - Info about the external content.
	 * @param opts - Options for handling external content, including force flag to bypass readonly checks.
	 */
	async putExternalContent<E>(
		info: TLExternalContent<E>,
		opts = {} as { force?: boolean }
	): Promise<void> {
		if (!opts.force && this.getIsReadonly()) return
		return this.plugins.get(externalContentCapability).putContent(info)
	}

	/**
	 * Handle replacing external content.
	 *
	 * @param info - Info about the external content.
	 * @param opts - Options for handling external content, including force flag to bypass readonly checks.
	 */
	async replaceExternalContent<E>(
		info: TLExternalContent<E>,
		opts = {} as { force?: boolean }
	): Promise<void> {
		if (!opts.force && this.getIsReadonly()) return
		return this.plugins.get(externalContentCapability).putContent(info)
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
		return this._contentTransfer.getContentFromCurrentPage(shapes)
	}

	async resolveAssetsInContent(content: TLContent | undefined): Promise<TLContent | undefined> {
		return this._contentTransfer.resolveAssetsInContent(content)
	}

	/**
	 * Place content into the editor.
	 *
	 * @param content - The content.
	 * @param opts - Options for placing the content.
	 *
	 * @public
	 */
	putContentOntoCurrentPage(
		content: TLContent,
		opts: {
			point?: VecLike
			select?: boolean
			preservePosition?: boolean
			preserveIds?: boolean
		} = {}
	): this {
		this._contentTransfer.putContentOntoCurrentPage(content, opts)
		return this
	}

	/**
	 * Get an exported SVG element of the given shapes.
	 *
	 * @param shapes - The shapes (or shape ids) to export.
	 * @param opts - Options for the export.
	 *
	 * @returns The SVG element.
	 *
	 * @public
	 */
	async getSvgElement(shapes: TLShapeId[] | TLShape[], opts: TLSvgExportOptions = {}) {
		const ids = shapes.length === 0 ? this.getCurrentPageShapeIdsSorted() : toShapeIds(shapes)

		if (ids.length === 0) return undefined

		// Text geometry is measured from the loaded font, so the export's bounds - and the
		// layout of any text within it - depend on the right fonts having loaded. Wait for them
		// before we measure; otherwise an export taken before fonts finish loading (e.g. right
		// after the editor mounts) is sized and laid out with fallback-font metrics.
		await this.plugins
			.getOptional(fontsCapability)
			?.loadRequiredFontsForCurrentPage(this.options.maxFontsToLoadBeforeRender)

		return this.plugins.get(svgExportCapability).exportToSvg(ids, opts)
	}

	/**
	 * Get an exported SVG string of the given shapes.
	 *
	 * @param shapes - The shapes (or shape ids) to export.
	 * @param opts - Options for the export.
	 *
	 * @returns The SVG element.
	 *
	 * @public
	 */
	async getSvgString(shapes: TLShapeId[] | TLShape[], opts: TLSvgExportOptions = {}) {
		return this.plugins.get(imageExportCapability).getSvgString(shapes, opts)
	}

	/**
	 * Get an exported image of the given shapes.
	 *
	 * @param shapes - The shapes (or shape ids) to export.
	 * @param opts - Options for the export.
	 *
	 * @returns A blob of the image.
	 * @public
	 */
	async toImage(shapes: TLShapeId[] | TLShape[], opts: TLImageExportOptions = {}) {
		return this.plugins.get(imageExportCapability).toImage(shapes, opts)
	}

	/**
	 * Get an exported image of the given shapes as a data URL.
	 *
	 * @param shapes - The shapes (or shape ids) to export.
	 * @param opts - Options for the export.
	 *
	 * @returns A data URL of the image.
	 * @public
	 */
	async toImageDataUrl(shapes: TLShapeId[] | TLShape[], opts: TLImageExportOptions = {}) {
		return this.plugins.get(imageExportCapability).toImageDataUrl(shapes, opts)
	}

	/* --------------------- Events --------------------- */

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
		this._dispatchStateEvent({ type: 'misc', name: 'cancel' })
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
		this._dispatchStateEvent({ type: 'misc', name: 'interrupt' })
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
		this._dispatchStateEvent({ type: 'misc', name: 'complete' })
		return this
	}

	/**
	 * Cancel, interrupt and complete are state commands, not input. Without an event dispatch
	 * plugin they go straight to the root state, so headless edits and undo still work.
	 */
	private _dispatchStateEvent(
		info: TLCancelEventInfo | TLInterruptEventInfo | TLCompleteEventInfo
	) {
		if (this.plugins.getOptional(eventDispatchCapability)) {
			this.dispatch(info)
			return
		}
		this.emit('before-event', info)
		this.root.handleEvent(info)
		this.emit('event', info)
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
	updatePointer(options?: TLUpdatePointerOptions): this {
		const event: TLPointerEventInfo = {
			type: 'pointer',
			target: 'canvas',
			name: 'pointer_move',
			point:
				options?.point ??
				// weird but true: what `inputs` calls screen-space is actually viewport space. so
				// we need to convert back into true screen space first. we should fix this...
				Vec.Add(
					this.inputs.getCurrentScreenPoint(),
					this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!.screenBounds
				),
			pointerId: options?.pointerId ?? 0,
			button: options?.button ?? 0,
			isPen: options?.isPen ?? this.inputs.getIsPen(),
			shiftKey: options?.shiftKey ?? this.inputs.getShiftKey(),
			altKey: options?.altKey ?? this.inputs.getAltKey(),
			ctrlKey: options?.ctrlKey ?? this.inputs.getCtrlKey(),
			metaKey: options?.metaKey ?? this.inputs.getMetaKey(),
			accelKey: false,
		}

		// needs to be calculated second
		event.accelKey = options?.accelKey ?? this.inputs.getAccelKey()

		if (options?.immediate) {
			this._flushEventForTick(event)
		} else {
			this.dispatch(event)
		}

		return this
	}

	/**
	 * Puts the editor into focused mode.
	 *
	 * This makes the editor eligible to receive keyboard events and some pointer events (move, wheel).
	 *
	 * @example
	 * ```ts
	 * editor.focus()
	 * ```
	 *
	 * By default this also dispatches a 'focus' event to the container element. To prevent this, pass `focusContainer: false`.
	 *
	 * @example
	 * ```ts
	 * editor.focus({ focusContainer: false })
	 * ```
	 *
	 * @public
	 */
	focus({ focusContainer = true } = {}): this {
		if (this.getIsFocused()) return this
		if (focusContainer) this.plugins.getOptional(containerFocusCapability)?.focus()
		this.updateInstanceState({ isFocused: true })
		return this
	}

	/**
	 * Switches off the editor's focused mode.
	 *
	 * This makes the editor ignore keyboard events and some pointer events (move, wheel).
	 *
	 * @example
	 * ```ts
	 * editor.blur()
	 * ```
	 * By default this also dispatches a 'blur' event to the container element. To prevent this, pass `blurContainer: false`.
	 *
	 * @example
	 * ```ts
	 * editor.blur({ blurContainer: false })
	 * ```
	 *
	 * @public
	 */
	blur({ blurContainer = true } = {}): this {
		if (!this.getIsFocused()) return this
		this.complete() // stop any interaction
		if (blurContainer) this.plugins.getOptional(containerFocusCapability)?.blur()
		this.updateInstanceState({ isFocused: false })
		return this
	}

	/**
	 * @public
	 * @returns true if the editor is focused
	 */
	@computed getIsFocused() {
		return this.getInstanceState().isFocused
	}

	/**
	 * @public
	 * @returns true if the editor is in readonly mode
	 */
	@computed getIsReadonly() {
		return this.getInstanceState().isReadonly
	}

	/**
	 * @public
	 * @returns a snapshot of the store's UI and document state
	 */
	getSnapshot() {
		return getSnapshot(this.store)
	}

	/**
	 * Loads a snapshot into the editor.
	 * @param snapshot - The snapshot to load.
	 * @param opts - The options for loading the snapshot.
	 * @returns
	 */
	loadSnapshot(
		snapshot: Partial<TLEditorSnapshot> | TLStoreSnapshot,
		opts?: TLLoadSnapshotOptions
	) {
		loadSnapshot(this.store, snapshot, opts)
		return this
	}

	private _zoomToFitPageContentAt100Percent() {
		const bounds = this.getCurrentPageBounds()
		if (bounds) {
			this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
		}
	}
	private _navigateToDeepLink(deepLink: TLDeepLink) {
		this.run(() => {
			switch (deepLink.type) {
				case 'page': {
					const page = this.getPage(deepLink.pageId)
					if (page) {
						this.setCurrentPage(page)
					}
					this._zoomToFitPageContentAt100Percent()
					return
				}
				case 'shapes': {
					const allShapes = compact(deepLink.shapeIds.map((id) => this.getShape(id)))
					const byPage: { [pageId: string]: TLShape[] } = {}
					for (const shape of allShapes) {
						const pageId = this.getAncestorPageId(shape)
						if (!pageId) continue
						byPage[pageId] ??= []
						byPage[pageId].push(shape)
					}
					const [pageId, shapes] = Object.entries(byPage).sort(
						([_, a], [__, b]) => b.length - a.length
					)[0] ?? ['', []]

					if (!pageId || !shapes.length) {
						this._zoomToFitPageContentAt100Percent()
					} else {
						this.setCurrentPage(pageId as TLPageId)
						const bounds = Box.Common(shapes.map((s) => this.getShapePageBounds(s)!))
						this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
					}
					return
				}
				case 'viewport': {
					if (deepLink.pageId) {
						if (!this.getPage(deepLink.pageId)) {
							this._zoomToFitPageContentAt100Percent()
							return
						}
						this.setCurrentPage(deepLink.pageId)
					}
					this.zoomToBounds(deepLink.bounds, { immediate: true, inset: 0 })
					return
				}
				default:
					exhaustiveSwitchError(deepLink)
			}
		})
	}

	/**
	 * Handles navigating to the content specified by the query param in the given URL.
	 *
	 * Use {@link Editor.createDeepLink} to create a URL with a deep link query param.
	 *
	 * If no URL is provided, it will look for the param in the current `window.location.href`.
	 *
	 * @example
	 * ```ts
	 * editor.navigateToDeepLink()
	 * ```
	 *
	 * The default parameter name is 'd'. You can override this by providing the `param` option.
	 *
	 * @example
	 * ```ts
	 * // disable page parameter and change viewport parameter to 'c'
	 * editor.navigateToDeepLink({
	 *   param: 'x',
	 *   url: 'https://my-app.com/my-document?x=200.12.454.23.xyz123',
	 * })
	 * ```
	 *
	 * @param opts - Options for loading the state from the URL.
	 */
	navigateToDeepLink(opts?: TLDeepLink | { url?: string | URL; param?: string }): Editor {
		if (opts && 'type' in opts) {
			this._navigateToDeepLink(opts)
			return this
		}

		const url = new URL(opts?.url ?? window.location.href)
		const deepLinkString = url.searchParams.get(opts?.param ?? 'd')

		if (!deepLinkString) {
			this._zoomToFitPageContentAt100Percent()
			return this
		}

		try {
			this._navigateToDeepLink(parseDeepLinkString(deepLinkString))
		} catch (e) {
			console.warn(e)
			this._zoomToFitPageContentAt100Percent()
		}
		return this
	}

	/**
	 * Turns the given URL into a deep link by adding a query parameter.
	 *
	 * e.g. `https://my-app.com/my-document?d=100.100.200.200.xyz123`
	 *
	 * If no URL is provided, it will use the current `window.location.href`.
	 *
	 * @example
	 * ```ts
	 * // create a deep link to the current page + viewport
	 * navigator.clipboard.writeText(editor.createDeepLink())
	 * ```
	 *
	 * You can link to a particular set of shapes by providing a `to` parameter.
	 *
	 * @example
	 * ```ts
	 * // create a deep link to the set of currently selected shapes
	 * navigator.clipboard.writeText(editor.createDeepLink({
	 *   to: { type: 'selection', shapeIds: editor.getSelectedShapeIds() }
	 * }))
	 * ```
	 *
	 * The default query param is 'd'. You can override this by providing a `param` parameter.
	 *
	 * @example
	 * ```ts
	 * // Use `x` as the param name instead
	 * editor.createDeepLink({ param: 'x' })
	 * ```
	 *
	 * @param opts - Options for adding the state to the URL.
	 * @returns the updated URL
	 */
	createDeepLink(opts?: { url?: string | URL; param?: string; to?: TLDeepLink }): URL {
		const url = new URL(opts?.url ?? window.location.href)

		url.searchParams.set(
			opts?.param ?? 'd',
			createDeepLinkString(
				opts?.to ?? {
					type: 'viewport',
					pageId: this.options.maxPages === 1 ? undefined : this.getCurrentPageId(),
					bounds: this.getViewportPageBounds(),
				}
			)
		)

		return url
	}

	/**
	 * Register a listener for changes to a deep link for the current document.
	 *
	 * You'll typically want to use this indirectly via the {@link TldrawEditorBaseProps.deepLinks} prop on the `<Tldraw />` component.
	 *
	 * By default this will update `window.location` in place, but you can provide a custom callback
	 * to handle state changes on your own.
	 *
	 * @example
	 * ```ts
	 * editor.registerDeepLinkListener({
	 *   onChange(url) {
	 *     window.history.replaceState({}, document.title, url.toString())
	 *   }
	 * })
	 * ```
	 *
	 * You can also provide a custom URL to update, in which case you must also provide `onChange`.
	 *
	 * @example
	 * ```ts
	 * editor.registerDeepLinkListener({
	 *   getUrl: () => `https://my-app.com/my-document`,
	 *   onChange(url) {
	 *     setShareUrl(url.toString())
	 *   }
	 * })
	 * ```
	 *
	 * By default this will update with a debounce interval of 500ms, but you can provide a custom interval.
	 *
	 * @example
	 * ```ts
	 * editor.registerDeepLinkListener({ debounceMs: 1000 })
	 * ```
	 * The default parameter name is `d`. You can override this by providing a `param` option.
	 *
	 * @example
	 * ```ts
	 * editor.registerDeepLinkListener({ param: 'x' })
	 * ```
	 * @param opts - Options for setting up the listener.
	 * @returns a function that will stop the listener.
	 */
	registerDeepLinkListener(opts?: TLDeepLinkOptions): () => void {
		if (opts?.getUrl && !opts?.onChange) {
			throw Error(
				'[tldraw:urlStateSync] If you specify getUrl, you must also specify the onChange callback.'
			)
		}

		const url$ = computed('url with state', () => {
			const url = opts?.getUrl?.(this) ?? window.location.href
			const urlWithState = this.createDeepLink({
				param: opts?.param,
				url,
				to: opts?.getTarget?.(this),
			})
			return urlWithState.toString()
		})

		const announceChange =
			opts?.onChange ??
			(() => {
				const url = this.createDeepLink({
					param: opts?.param,
					to: opts?.getTarget?.(this),
				})

				window.history.replaceState({}, this.getContainerDocument().title, url.toString())
			})

		const scheduleEffect = debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)

		const unlisten = react(
			'update url on state change',
			() => announceChange(new URL(url$.get()), this),
			{ scheduleEffect }
		)

		return () => {
			unlisten()
			scheduleEffect.cancel()
		}
	}

	/**
	 * A manager for recording multiple click events.
	 *
	 * @internal
	 */
	protected _clickManager!: ClickManager

	/**
	 * Prevent a double click event from firing the next time the user clicks
	 *
	 * @public
	 */
	cancelDoubleClick() {
		this._clickManager.cancelDoubleClickTimeout()
	}

	/**
	 * Release the shift modifier: clear its debounce timer id, drop the atom, and
	 * dispatch a synthetic `key_up` so `inputs.keys` and tool `onKeyUp` handlers update.
	 * Runs both as the 150ms debounce timer callback and when a pointer down flushes it.
	 * @internal
	 */
	@bind
	_releaseShiftKey() {
		return this._eventDispatcher._releaseShiftKey()
	}

	/**
	 * Release the alt modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseAltKey() {
		return this._eventDispatcher._releaseAltKey()
	}

	/**
	 * Release the ctrl modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseCtrlKey() {
		return this._eventDispatcher._releaseCtrlKey()
	}

	/**
	 * Release the meta modifier. See {@link Editor._releaseShiftKey}.
	 * @internal
	 */
	@bind
	_releaseMetaKey() {
		return this._eventDispatcher._releaseMetaKey()
	}

	/** @internal */
	capturedPointerId: number | null = null

	/** @internal */
	private handledEvents = new WeakSet<Event>()

	/**
	 * In tldraw, events are sometimes handled by multiple components. For example, the shapes might
	 * have events, but the canvas handles events too. The way that the canvas handles events can
	 * interfere with the with the shapes event handlers - for example, it calls `.preventDefault()`
	 * on `pointerDown`, which also prevents `click` events from firing on the shapes.
	 *
	 * You can use `.stopPropagation()` to prevent the event from propagating to the rest of the
	 * DOM, but that can impact non-tldraw event handlers set up elsewhere. By using
	 * `markEventAsHandled`, you'll stop other parts of tldraw from handling the event without
	 * impacting other, non-tldraw event handlers. See also {@link Editor.wasEventAlreadyHandled}.
	 *
	 * @public
	 */
	markEventAsHandled(e: Event | { nativeEvent: Event }) {
		const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e
		this.handledEvents.add(nativeEvent)
	}

	/**
	 * Checks if an event has already been handled. See {@link Editor.markEventAsHandled}.
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
	dispatch(info: TLEventInfo): this {
		this._eventDispatcher.dispatch(info)
		return this
	}

	_flushEventForTick(info: TLEventInfo): this | undefined {
		return this._eventDispatcher._flushEventForTick(info) ? this : undefined
	}
}

function pushShapeWithDescendants(editor: Editor, id: TLShapeId, result: TLShape[]): void {
	const shape = editor.getShape(id)
	if (!shape) return
	result.push(shape)
	const childIds = editor.getSortedChildIdsForParent(id)
	for (let i = 0, n = childIds.length; i < n; i++) {
		pushShapeWithDescendants(editor, childIds[i], result)
	}
}
