// Important! don't move this tlschema re-export to lib/index.ts, doing so causes esbuild to produce
// incorrect output. https://github.com/evanw/esbuild/issues/1737

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/indices'
export {
	atom,
	computed,
	react,
	track,
	useComputed,
	useQuickReactor,
	useReactor,
	useValue,
	whyAmIRunning,
} from '@tldraw/state'
export { defineMigrations } from '@tldraw/store'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/tlschema'
export { getHashForString } from '@tldraw/utils'
export {
	ErrorScreen,
	LoadingScreen,
	TldrawEditor,
	type TldrawEditorProps,
} from './lib/TldrawEditor'
export {
	defaultEditorAssetUrls,
	setDefaultEditorAssetUrls,
	type TLEditorAssetUrls,
} from './lib/assetUrls'
export { Canvas } from './lib/components/Canvas'
export { DefaultErrorFallback } from './lib/components/DefaultErrorFallback'
export {
	ErrorBoundary,
	OptionalErrorBoundary,
	type TLErrorBoundaryProps,
} from './lib/components/ErrorBoundary'
export { HTMLContainer, type HTMLContainerProps } from './lib/components/HTMLContainer'
export { SVGContainer, type SVGContainerProps } from './lib/components/SVGContainer'
export {
	TAB_ID,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
	type TLSessionStateSnapshot,
} from './lib/config/TLSessionStateSnapshot'
export {
	USER_COLORS,
	getFreshUserPreferences,
	getUserPreferences,
	setUserPreferences,
	type TLUserPreferences,
} from './lib/config/TLUserPreferences'
export {
	createTLStore,
	type TLStoreEventInfo,
	type TLStoreOptions,
} from './lib/config/createTLStore'
export { createTLUser } from './lib/config/createTLUser'
export { coreShapes, defaultShapes } from './lib/config/defaultShapes'
export { defaultTools } from './lib/config/defaultTools'
export { defineShape, type TLShapeInfo } from './lib/config/defineShape'
export {
	ANIMATION_MEDIUM_MS,
	ANIMATION_SHORT_MS,
	DEFAULT_ANIMATION_OPTIONS,
	DOUBLE_CLICK_DURATION,
	DRAG_DISTANCE,
	GRID_INCREMENT,
	GRID_STEPS,
	HAND_TOOL_FRICTION,
	HASH_PATTERN_ZOOM_NAMES,
	MAJOR_NUDGE_FACTOR,
	MAX_ASSET_HEIGHT,
	MAX_ASSET_WIDTH,
	MAX_PAGES,
	MAX_SHAPES_PER_PAGE,
	MAX_ZOOM,
	MINOR_NUDGE_FACTOR,
	MIN_ZOOM,
	MULTI_CLICK_DURATION,
	REMOVE_SYMBOL,
	RICH_TYPES,
	SVG_PADDING,
	ZOOMS,
} from './lib/constants'
export { Editor, type TLAnimationOptions, type TLEditorOptions } from './lib/editor/Editor'
export {
	ExternalContentManager as PlopManager,
	type TLExternalContent,
} from './lib/editor/managers/ExternalContentManager'
export { ScribbleManager } from './lib/editor/managers/ScribbleManager'
export { BaseBoxShapeUtil, type TLBaseBoxShape } from './lib/editor/shapes/BaseBoxShapeUtil'
export {
	ShapeUtil,
	type TLOnBeforeCreateHandler,
	type TLOnBeforeUpdateHandler,
	type TLOnBindingChangeHandler,
	type TLOnChildrenChangeHandler,
	type TLOnClickHandler,
	type TLOnDoubleClickHandleHandler,
	type TLOnDoubleClickHandler,
	type TLOnDragHandler,
	type TLOnEditEndHandler,
	type TLOnHandleChangeHandler,
	type TLOnResizeEndHandler,
	type TLOnResizeHandler,
	type TLOnResizeStartHandler,
	type TLOnRotateEndHandler,
	type TLOnRotateHandler,
	type TLOnRotateStartHandler,
	type TLOnTranslateEndHandler,
	type TLOnTranslateHandler,
	type TLOnTranslateStartHandler,
	type TLResizeInfo,
	type TLResizeMode,
	type TLShapeUtilConstructor,
	type TLShapeUtilFlag,
} from './lib/editor/shapes/ShapeUtil'
export { ArrowShape } from './lib/editor/shapes/arrow/ArrowShape'
export { ArrowShapeUtil } from './lib/editor/shapes/arrow/ArrowShapeUtil'
export { BookmarkShape } from './lib/editor/shapes/bookmark/BookmarkShape'
export { BookmarkShapeUtil } from './lib/editor/shapes/bookmark/BookmarkShapeUtil'
export { DrawShape } from './lib/editor/shapes/draw/DrawShape'
export { DrawShapeUtil } from './lib/editor/shapes/draw/DrawShapeUtil'
export { EmbedShape } from './lib/editor/shapes/embed/EmbedShape'
export { EmbedShapeUtil } from './lib/editor/shapes/embed/EmbedShapeUtil'
export { FrameShape } from './lib/editor/shapes/frame/FrameShape'
export { FrameShapeUtil } from './lib/editor/shapes/frame/FrameShapeUtil'
export { GeoShape } from './lib/editor/shapes/geo/GeoShape'
export { GeoShapeUtil } from './lib/editor/shapes/geo/GeoShapeUtil'
export { GroupShape } from './lib/editor/shapes/group/GroupShape'
export { GroupShapeUtil } from './lib/editor/shapes/group/GroupShapeUtil'
export { HighlightShape } from './lib/editor/shapes/highlight/HighlightShape'
export { HighlightShapeUtil } from './lib/editor/shapes/highlight/HighlightShapeUtil'
export { ImageShape } from './lib/editor/shapes/image/ImageShape'
export { ImageShapeUtil } from './lib/editor/shapes/image/ImageShapeUtil'
export { LineShape } from './lib/editor/shapes/line/LineShape'
export { LineShapeUtil, getSplineForLineShape } from './lib/editor/shapes/line/LineShapeUtil'
export { NoteShape } from './lib/editor/shapes/note/NoteShape'
export { NoteShapeUtil } from './lib/editor/shapes/note/NoteShapeUtil'
export { resizeBox, type ResizeBoxOptions } from './lib/editor/shapes/shared/resizeBox'
export { TextShape } from './lib/editor/shapes/text/TextShape'
export { INDENT, TextShapeUtil } from './lib/editor/shapes/text/TextShapeUtil'
export { VideoShape } from './lib/editor/shapes/video/VideoShape'
export { VideoShapeUtil } from './lib/editor/shapes/video/VideoShapeUtil'
export { BaseBoxShapeTool } from './lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'
export { StateNode, type TLStateNodeConstructor } from './lib/editor/tools/StateNode'
export { type TLContent } from './lib/editor/types/clipboard-types'
export { type TLEventMap, type TLEventMapHandler } from './lib/editor/types/emit-types'
export {
	EVENT_NAME_MAP,
	type TLBaseEventInfo,
	type TLCLickEventName,
	type TLCancelEvent,
	type TLCancelEventInfo,
	type TLClickEvent,
	type TLClickEventInfo,
	type TLCompleteEvent,
	type TLCompleteEventInfo,
	type TLEnterEventHandler,
	type TLEventHandlers,
	type TLEventInfo,
	type TLEventName,
	type TLExitEventHandler,
	type TLInterruptEvent,
	type TLInterruptEventInfo,
	type TLKeyboardEvent,
	type TLKeyboardEventInfo,
	type TLKeyboardEventName,
	type TLPinchEvent,
	type TLPinchEventInfo,
	type TLPinchEventName,
	type TLPointerEvent,
	type TLPointerEventInfo,
	type TLPointerEventName,
	type TLPointerEventTarget,
	type TLTickEvent,
	type TLWheelEvent,
	type TLWheelEventInfo,
	type UiEvent,
	type UiEventType,
} from './lib/editor/types/event-types'
export {
	type TLCommand,
	type TLCommandHandler,
	type TLHistoryEntry,
	type TLHistoryMark,
} from './lib/editor/types/history-types'
export { type RequiredKeys } from './lib/editor/types/misc-types'
export { type TLResizeHandle, type TLSelectionHandle } from './lib/editor/types/selection-types'
export { normalizeWheel } from './lib/hooks/shared'
export { useContainer } from './lib/hooks/useContainer'
export { useEditor } from './lib/hooks/useEditor'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useTLStore } from './lib/hooks/useTLStore'
export {
	ReadonlySharedStyleMap,
	SharedStyleMap,
	type SharedStyle,
} from './lib/utils/SharedStylesMap'
export { WeakMapCache } from './lib/utils/WeakMapCache'
export {
	ACCEPTED_ASSET_TYPE,
	ACCEPTED_IMG_TYPE,
	ACCEPTED_VID_TYPE,
	containBoxSize,
	dataUrlToFile,
	getFileMetaData,
	getImageSizeFromSrc,
	getMediaAssetFromFile,
	getResizedImageDataUrl,
	getValidHttpURLList,
	getVideoSizeFromSrc,
	isImage,
	isSvgText,
	isValidHttpURL,
} from './lib/utils/assets'
export {
	checkFlag,
	fileToBase64,
	getIncrementedName,
	isSerializable,
	isValidUrl,
	snapToGrid,
	uniqueId,
} from './lib/utils/data'
export { debugFlags, featureFlags, type DebugFlag } from './lib/utils/debug-flags'
export {
	getRotatedBoxShadow,
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	truncateStringWithEllipsis,
	usePrefersReducedMotion,
} from './lib/utils/dom'
export {
	getEmbedInfo,
	getEmbedInfoUnsafely,
	matchEmbedUrl,
	matchUrl,
	type TLEmbedResult,
} from './lib/utils/embeds'
export {
	downloadDataURLAsFile,
	getSvgAsDataUrl,
	getSvgAsDataUrlSync,
	getSvgAsImage,
	getSvgAsString,
	getTextBoundingBox,
	type TLCopyType,
	type TLExportType,
} from './lib/utils/export'
export { hardResetEditor } from './lib/utils/hard-reset'
export { isAnimated, isGIF } from './lib/utils/is-gif-animated'
export { refreshPage } from './lib/utils/refresh-page'
export { runtime, setRuntimeOverrides } from './lib/utils/runtime'
export {
	blobAsString,
	correctSpacesToNbsp,
	dataTransferItemAsString,
	defaultEmptyAs,
} from './lib/utils/string'
export { getPointerInfo, getSvgPathFromStroke, getSvgPathFromStrokePoints } from './lib/utils/svg'
export { type TLStoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { hardReset } from './lib/utils/sync/hardReset'
export { openWindow } from './lib/utils/window-open'
