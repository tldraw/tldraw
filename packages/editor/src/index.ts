// Important! don't move this tlschema re-export to lib/index.ts, doing so causes esbuild to produce
// incorrect output. https://github.com/evanw/esbuild/issues/1737

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/indices'
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
	getUserPreferences,
	setUserPreferences,
	type TLUserPreferences,
} from './lib/config/TLUserPreferences'
export { createTLStore } from './lib/config/createTLStore'
export { defaultShapes } from './lib/config/defaultShapes'
export { defaultTools } from './lib/config/defaultTools'
export {
	ANIMATION_MEDIUM_MS,
	ANIMATION_SHORT_MS,
	DEFAULT_ANIMATION_OPTIONS,
	DEFAULT_BOOKMARK_HEIGHT,
	DEFAULT_BOOKMARK_WIDTH,
	DOUBLE_CLICK_DURATION,
	DRAG_DISTANCE,
	FONT_ALIGNMENT,
	FONT_FAMILIES,
	FONT_SIZES,
	GRID_INCREMENT,
	GRID_STEPS,
	HAND_TOOL_FRICTION,
	HASH_PATERN_ZOOM_NAMES,
	ICON_SIZES,
	LABEL_FONT_SIZES,
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
	ROTATING_SHADOWS,
	STYLES,
	SVG_PADDING,
	TEXT_PROPS,
	ZOOMS,
} from './lib/constants'
export { Editor, type TLAnimationOptions, type TLEditorOptions } from './lib/editor/Editor'
export { ArrowShapeUtil } from './lib/editor/shapes/ArrowShape/ArrowShapeUtil/ArrowShapeUtil'
export { arrowShape } from './lib/editor/shapes/ArrowShape/arrowShape'
export {
	type TLArrowShape,
	type TLArrowShapeProps,
} from './lib/editor/shapes/ArrowShape/arrowShapeTypes'
export { BookmarkShapeUtil } from './lib/editor/shapes/BookmarkShape/BookmarkShapeUtil/BookmarkShapeUtil'
export { bookmarkShape } from './lib/editor/shapes/BookmarkShape/bookmarkShape'
export {
	type TLBookmarkShape,
	type TLBookmarkShapeProps,
} from './lib/editor/shapes/BookmarkShape/bookmarkShapeTypes'
export { DrawShapeUtil } from './lib/editor/shapes/DrawShape/DrawShapeUtil/DrawShapeUtil'
export { drawShape } from './lib/editor/shapes/DrawShape/drawShape'
export {
	type TLDrawShape,
	type TLDrawShapeProps,
} from './lib/editor/shapes/DrawShape/drawShapeTypes'
export { EmbedShapeUtil } from './lib/editor/shapes/EmbedShape/EmbedShapeUtil/EmbedShapeUtil'
export { embedShape } from './lib/editor/shapes/EmbedShape/embedShape'
export {
	EMBED_DEFINITIONS,
	type TLEmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapeProps,
} from './lib/editor/shapes/EmbedShape/embedShapeTypes'
export { FrameShapeUtil } from './lib/editor/shapes/FrameShape/FrameShapeUtil/FrameShapeUtil'
export { frameShape } from './lib/editor/shapes/FrameShape/frameShape'
export {
	type TLFrameShape,
	type TLFrameShapeProps,
} from './lib/editor/shapes/FrameShape/frameShapeTypes'
export { GeoShapeUtil } from './lib/editor/shapes/GeoShape/GeoShapeUtil/GeoShapeUtil'
export { geoShape } from './lib/editor/shapes/GeoShape/geoShape'
export { type TLGeoShape, type TLGeoShapeProps } from './lib/editor/shapes/GeoShape/geoShapeTypes'
export { HighlightShapeUtil } from './lib/editor/shapes/HighlightShape/HighlightShapeUtil/HighlightShapeUtil'
export { highlightShape } from './lib/editor/shapes/HighlightShape/highlightShape'
export {
	type TLHighlightShape,
	type TLHighlightShapeProps,
} from './lib/editor/shapes/HighlightShape/highlightShapeTypes'
export { LineShapeUtil } from './lib/editor/shapes/LineShape/LineShapeUtil/LineShapeUtil'
export { lineShape } from './lib/editor/shapes/LineShape/lineShape'
export {
	type TLLineShape,
	type TLLineShapeProps,
} from './lib/editor/shapes/LineShape/lineShapeTypes'
export { NoteShapeUtil } from './lib/editor/shapes/NoteShape/NoteShapeUtil/NoteShapeUtil'
export { noteShape } from './lib/editor/shapes/NoteShape/noteShape'
export {
	type TLNoteShape,
	type TLNoteShapeProps,
} from './lib/editor/shapes/NoteShape/noteShapeTypes'
export { TextShapeUtil } from './lib/editor/shapes/TextShape/TextShapeUtil/TextShapeUtil'
export { textShape } from './lib/editor/shapes/TextShape/textShape'
export {
	type TLTextShape,
	type TLTextShapeProps,
} from './lib/editor/shapes/TextShape/textShapeTypes'
export { BaseBoxShapeUtil, type TLBaseBoxShape } from './lib/editor/shapeutils/BaseBoxShapeUtil'
export { GroupShapeUtil } from './lib/editor/shapeutils/GroupShapeUtil/GroupShapeUtil'
export { ImageShapeUtil } from './lib/editor/shapeutils/ImageShapeUtil/ImageShapeUtil'
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
} from './lib/editor/shapeutils/ShapeUtil'
export { VideoShapeUtil } from './lib/editor/shapeutils/VideoShapeUtil/VideoShapeUtil'
export { INDENT } from './lib/editor/shapeutils/shared/TextHelpers'
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
export { useQuickReactor } from './lib/hooks/useQuickReactor'
export { useReactor } from './lib/hooks/useReactor'
export { useTLStore } from './lib/hooks/useTLStore'
export { WeakMapCache } from './lib/utils/WeakMapCache'
export {
	ACCEPTED_ASSET_TYPE,
	ACCEPTED_IMG_TYPE,
	ACCEPTED_VID_TYPE,
	containBoxSize,
	createAssetShapeAtPoint,
	createBookmarkShapeAtPoint,
	createEmbedShapeAtPoint,
	createShapesFromFiles,
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
	snapToGrid,
	uniqueId,
} from './lib/utils/data'
export { debugFlags, featureFlags, type DebugFlag } from './lib/utils/debug-flags'
export {
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	rotateBoxShadow,
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
	isGeoShape,
	isNoteShape,
	type TLCopyType,
	type TLExportType,
} from './lib/utils/export'
export { hardResetEditor } from './lib/utils/hard-reset'
export { isAnimated, isGIF } from './lib/utils/is-gif-animated'
export { setPropsForNextShape } from './lib/utils/props-for-next-shape'
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
