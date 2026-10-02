import { atom, computed, react, unsafe__withoutCapture } from '@tldraw/state'
import { StoreSideEffects } from '@tldraw/store'
import {
	PageRecordType,
	StyleProp,
	TLAsset,
	TLBinding,
	TLBindingId,
	TLCursor,
	TLDOCUMENT_ID,
	TLDocument,
	TLINSTANCE_ID,
	TLInstance,
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
	UserRecordType,
	createUserId,
	getShapePropKeysByStyle,
} from '@tldraw/tlschema'
import { annotateError, assert, getOwnProperty, hasOwnProperty, uniqueId } from '@tldraw/utils'
import { TLCurrentUser, createTLCurrentUser } from '../config/createTLCurrentUser'
import { TLAnyAssetUtilConstructor, checkAssets } from '../config/defaultAssets'
import { TLAnyBindingUtilConstructor, checkBindings } from '../config/defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from '../config/defaultShapes'
import {
	TLEditorSnapshot,
	TLLoadSnapshotOptions,
	getSnapshot,
	loadSnapshot,
} from '../config/TLEditorSnapshot'
import { DEFAULT_CAMERA_OPTIONS } from '../constants'
import { getOwnerWindow } from '../exports/domUtils'
import { registerMountedEditor, unregisterMountedEditor } from '../globals/editors'
import { tlmenus } from '../globals/menus'
import { tltime } from '../globals/time'
import { LicenseManager } from '../license/LicenseManager'
import { TldrawOptions, defaultTldrawOptions } from '../options'
import { Box } from '../primitives/Box'
import { MatLike } from '../primitives/Mat'
import { VecLike } from '../primitives/Vec'
import { TLTextOptions } from '../utils/richText'
import { AssetUtil } from './assets/AssetUtil'
import { BindingUtil } from './bindings/BindingUtil'
import { parentsToChildren } from './derivations/parentsToChildren'
import { deriveShapeIdsInCurrentPage } from './derivations/shapeIdsInCurrentPage'
import { EditorForwarders } from './EditorForwarders'
import { registerEditorSideEffects } from './editorSideEffects'
import { AssetsManager } from './managers/AssetsManager/AssetsManager'
import { BindingsManager } from './managers/BindingsManager/BindingsManager'
import { CameraManager } from './managers/CameraManager/CameraManager'
import { ClickManager } from './managers/ClickManager/ClickManager'
import { CollaboratorsManager } from './managers/CollaboratorsManager/CollaboratorsManager'
import { ContentManager } from './managers/ContentManager/ContentManager'
import { EdgeScrollManager } from './managers/EdgeScrollManager/EdgeScrollManager'
import { EventsManager } from './managers/EventsManager/EventsManager'
import { FocusManager } from './managers/FocusManager/FocusManager'
import { FontManager } from './managers/FontManager/FontManager'
import { HistoryManager } from './managers/HistoryManager/HistoryManager'
import { HitTestManager } from './managers/HitTestManager/HitTestManager'
import { InputsManager } from './managers/InputsManager/InputsManager'
import { LayoutManager } from './managers/LayoutManager/LayoutManager'
import { PagesManager } from './managers/PagesManager/PagesManager'
import { PerformanceManager } from './managers/PerformanceManager/PerformanceManager'
import { ResizeManager } from './managers/ResizeManager/ResizeManager'
import { ScribbleManager } from './managers/ScribbleManager/ScribbleManager'
import { SelectionManager } from './managers/SelectionManager/SelectionManager'
import { ShapeCommandsManager } from './managers/ShapeCommandsManager/ShapeCommandsManager'
import { ShapesManager } from './managers/ShapesManager/ShapesManager'
import { SnapManager } from './managers/SnapManager/SnapManager'
import { SpatialIndexManager } from './managers/SpatialIndexManager/SpatialIndexManager'
import { StylesManager } from './managers/StylesManager/StylesManager'
import { TextManager } from './managers/TextManager/TextManager'
import { ThemeManager, resolveThemes } from './managers/ThemeManager/ThemeManager'
import { TickManager } from './managers/TickManager/TickManager'
import { UserPreferencesManager } from './managers/UserPreferencesManager/UserPreferencesManager'
import { OverlayManager } from './overlays/OverlayManager'
import { TLAnyOverlayUtilConstructor } from './overlays/OverlayUtil'
import { ShapeUtil, TLResizeMode, TLShapeUtilCanBindOpts } from './shapes/ShapeUtil'
import { RootState } from './tools/RootState'
import { StateNode, TLStateNodeConstructor } from './tools/StateNode'
import { TLExternalAsset, TLExternalContent } from './types/external-content'
import { TLHistoryBatchOptions } from './types/history-types'
import { TLCameraOptions } from './types/misc-types'
import { TLResizeHandle } from './types/selection-types'

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

/** @public */
export class Editor extends EditorForwarders {
	readonly id = uniqueId()
	constructor({
		store,
		user,
		shapeUtils,
		bindingUtils,
		assetUtils: assetUtilConstructors,
		overlayUtils: overlayUtilConstructors,
		tools,
		getContainer,
		// needs to be here for backwards compatibility with TldrawEditor
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		cameraOptions,
		initialState,
		autoFocus,
		options: _options,
		// needs to be here for backwards compatibility with TldrawEditor
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		textOptions: _textOptions,
		getShapeVisibility,
		colorScheme,
		fontAssetUrls,
		themes,
		initialTheme,
	}: TLEditorOptions) {
		super()

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

		this.snaps = new SnapManager(this)

		this._spatialIndex = new SpatialIndexManager(this)
		this.disposables.add(() => this._spatialIndex.dispose())

		this.disposables.add(this.timers.dispose)

		// Merge camera options: options.cameraOptions takes precedence over deprecated cameraOptions prop
		this.camera._cameraOptions.set({
			...DEFAULT_CAMERA_OPTIONS,
			...cameraOptions,
			...options?.camera,
		})

		this.getContainer = getContainer

		this.selection._textOptions = atom('text options', options?.text ?? null)

		this.user = new UserPreferencesManager(user ?? createTLCurrentUser(), colorScheme ?? 'light')
		this.disposables.add(() => this.user.dispose())

		this.textMeasure = new TextManager(this)
		this.disposables.add(() => this.textMeasure.dispose())

		this._themeManager = new ThemeManager(this, {
			themes: resolveThemes(themes),
			initial: initialTheme ?? 'default',
		})
		this.disposables.add(() => this._themeManager.dispose())

		this._tickManager = new TickManager(this)
		this.disposables.add(() => this._tickManager.dispose())
		this.disposables.add(() => {
			this.camera._setCameraState('idle')
		})

		this.fonts = new FontManager(this, fontAssetUrls)
		this.disposables.add(() => this.fonts.dispose())

		this.inputs = new InputsManager(this)
		this.disposables.add(() => this.inputs.dispose())
		this.performance = new PerformanceManager(this)
		this.disposables.add(() => this.performance.dispose())
		this.collaborators = new CollaboratorsManager(this)

		class NewRoot extends RootState {
			static override initial = initialState ?? ''
		}

		this.root = new NewRoot(this)
		this.root.children = {}

		this.markEventAsHandled = this.markEventAsHandled.bind(this)

		const allShapeUtils = checkShapesAndAddCore(shapeUtils)

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

		const allBindingUtils = checkBindings(bindingUtils)
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
		for (const Tool of [...tools]) {
			if (hasOwnProperty(this.root.children!, Tool.id)) {
				throw Error(`Can't override tool with id "${Tool.id}"`)
			}
			this.root.children![Tool.id] = new Tool(this, this.root)
		}

		this.scribbles = new ScribbleManager(this)

		// Overlay utils
		this.overlays = new OverlayManager(this)
		this.disposables.add(() => this.overlays.dispose())
		if (overlayUtilConstructors) {
			for (const Util of overlayUtilConstructors) {
				const util = new Util(this)
				this.overlays.registerUtil(util)
			}
		}

		this.sideEffects = this.store.sideEffects
		registerEditorSideEffects(this)

		this.pages._currentPageShapeIds = deriveShapeIdsInCurrentPage(this.store, () =>
			this.getCurrentPageId()
		)
		this.shapes._parentIdsToChildIds = parentsToChildren(this.store)

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

		this.root.enter(undefined, 'initial')

		this.edgeScrollManager = new EdgeScrollManager(this)
		this.focusManager = new FocusManager(this, autoFocus)
		this.disposables.add(() => this.focusManager.dispose())

		if (this.getInstanceState().followingUserId) {
			this.stopFollowingUser()
		}

		this.on('tick', this.events._flushEventsForTick)

		this.on('mount', () => {
			this._isMounted.set(true)
			registerMountedEditor(this)
		})

		this.on('unmount', () => {
			this._isMounted.set(false)
			unregisterMountedEditor(this)
		})

		this.timers.requestAnimationFrame(() => {
			this._tickManager.start()
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
	 * A manager for the editor's tick events.
	 *
	 * @internal */
	private readonly _tickManager: TickManager

	/**
	 * A manager for the editor's input state.
	 *
	 * @public
	 */
	readonly inputs: InputsManager

	/**
	 * A manager for the editor's snapping feature.
	 *
	 * @public
	 */
	readonly snaps: SnapManager

	/**
	 * A manager for performance measurement hooks.
	 *
	 * @public
	 */
	readonly performance: PerformanceManager

	/**
	 * A manager for the spatial index, tracking where shapes exist on the canvas.
	 *
	 * @internal
	 */
	readonly _spatialIndex: SpatialIndexManager

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
	readonly collaborators: CollaboratorsManager

	/**
	 * A manager for the user and their preferences.
	 *
	 * @public
	 */
	readonly user: UserPreferencesManager

	/**
	 * A manager for the editor's themes.
	 *
	 * @internal
	 */
	private readonly _themeManager: ThemeManager

	/**
	 * A helper for measuring text.
	 *
	 * @public
	 */
	readonly textMeasure: TextManager

	/**
	 * A utility for managing the set of fonts that should be rendered in the document.
	 *
	 * @public
	 */
	readonly fonts: FontManager

	/**
	 * A manager for the editor's scribbles.
	 *
	 * @public
	 */
	readonly scribbles: ScribbleManager

	/**
	 * A manager for canvas overlay UI elements (selection handles, shape handles, etc.).
	 *
	 * @public
	 */
	readonly overlays: OverlayManager

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
	edgeScrollManager: EdgeScrollManager

	/**
	 * A manager for ensuring correct focus. See FocusManager for details.
	 *
	 * @internal
	 */
	private focusManager: FocusManager

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

		// Take the camera back before running disposables, so their cleanup listeners fire first
		this.camera._takeCameraControl()

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
		this.events._flushEventsForTick(0)
		this.complete()
		this.history.undo()
		this.performance._notifyUndoRedo('undo', this.history.getNumUndos(), this.history.getNumRedos())
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
		this.events._flushEventsForTick(0)
		this.complete()
		this.history.redo()
		this.performance._notifyUndoRedo('redo', this.history.getNumUndos(), this.history.getNumRedos())
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

	/** @public */
	readonly events = new EventsManager(this)

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
			clearTimeout(this._isChangingStyleTimeout)
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

	/** @public */
	readonly selection = new SelectionManager(this)

	/** @public */
	readonly camera = new CameraManager(this)
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

	/** @public */
	readonly shapes = new ShapesManager(this)

	/** @public */
	readonly pages = new PagesManager(this)

	/** @public */
	readonly assets = new AssetsManager(this)

	/** @public */
	readonly hitTest = new HitTestManager(this)

	/** @public */
	readonly bindings = new BindingsManager(this)

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

	/** @public */
	readonly commands = new ShapeCommandsManager(this)

	/** @public */
	readonly layout = new LayoutManager(this)

	/** @public */
	readonly resize = new ResizeManager(this)

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
		;(this.commands.groupShapes as any)(shapes, opts)
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
		;(this.commands.ungroupShapes as any)(shapes, opts)
		return this
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
		;(this.commands.deleteShapes as any)(_ids)
		return this
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
		;(this.commands.deleteShape as any)(_id)
		return this
	}

	/** @public */
	readonly styles = new StylesManager(this)

	/* --------------------- Content -------------------- */

	/** @internal */
	externalAssetContentHandlers: {
		[K in TLExternalAsset['type']]: {
			[Key in K]: null | ((info: TLExternalAsset & { type: Key }) => Promise<TLAsset | undefined>)
		}[K]
	} = {
		file: null,
		url: null,
	}

	/** @public */
	readonly content = new ContentManager(this)

	/** @internal */
	externalContentHandlers: {
		[K in TLExternalContent<any>['type']]: {
			[Key in K]: null | ((info: Extract<TLExternalContent<any>, { type: Key }>) => void)
		}[K]
	} = {
		text: null,
		files: null,
		'file-replace': null,
		embed: null,
		'svg-text': null,
		url: null,
		tldraw: null,
		excalidraw: null,
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
		if (focusContainer) this.focusManager.focus()
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
		this.focusManager.blur({ blurContainer })
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

	/**
	 * A manager for recording multiple click events.
	 *
	 * @internal
	 */
	_clickManager = new ClickManager(this)

	/** @internal */
	capturedPointerId: number | null = null
}
