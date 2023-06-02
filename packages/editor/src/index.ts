// Important! don't move this tlschema re-export to lib/index.ts, doing so causes esbuild to produce
// incorrect output. https://github.com/evanw/esbuild/issues/1737

export {
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBelow,
	getIndicesBetween,
	sortByIndex,
} from '@tldraw/indices'
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
	Editor as App,
	isShapeWithHandles,
	type AnimationOptions,
	type AppOptions,
	type TLChange,
} from './lib/app/Editor'
export { TLArrowUtil } from './lib/app/shapeutils/TLArrowUtil/TLArrowUtil'
export { TLBookmarkUtil } from './lib/app/shapeutils/TLBookmarkUtil/TLBookmarkUtil'
export { TLBoxUtil } from './lib/app/shapeutils/TLBoxUtil'
export { TLDrawUtil } from './lib/app/shapeutils/TLDrawUtil/TLDrawUtil'
export { TLEmbedUtil } from './lib/app/shapeutils/TLEmbedUtil/TLEmbedUtil'
export { TLFrameUtil } from './lib/app/shapeutils/TLFrameUtil/TLFrameUtil'
export { TLGeoUtil } from './lib/app/shapeutils/TLGeoUtil/TLGeoUtil'
export { TLGroupUtil } from './lib/app/shapeutils/TLGroupUtil/TLGroupUtil'
export { TLHighlightUtil } from './lib/app/shapeutils/TLHighlightUtil/TLHighlightUtil'
export { TLImageUtil } from './lib/app/shapeutils/TLImageUtil/TLImageUtil'
export { TLLineUtil, getSplineForLineShape } from './lib/app/shapeutils/TLLineUtil/TLLineUtil'
export { TLNoteUtil } from './lib/app/shapeutils/TLNoteUtil/TLNoteUtil'
export {
	TLShapeUtil,
	type OnBeforeCreateHandler,
	type OnBeforeUpdateHandler,
	type OnBindingChangeHandler,
	type OnChildrenChangeHandler,
	type OnClickHandler,
	type OnDoubleClickHandleHandler,
	type OnDoubleClickHandler,
	type OnDragHandler,
	type OnEditEndHandler,
	type OnHandleChangeHandler,
	type OnResizeEndHandler,
	type OnResizeHandler,
	type OnResizeStartHandler,
	type OnRotateEndHandler,
	type OnRotateHandler,
	type OnRotateStartHandler,
	type OnTranslateEndHandler,
	type OnTranslateHandler,
	type OnTranslateStartHandler,
	type TLResizeInfo,
	type TLResizeMode,
	type TLShapeUtilConstructor,
	type TLShapeUtilFlag,
} from './lib/app/shapeutils/TLShapeUtil'
export { INDENT, TLTextUtil } from './lib/app/shapeutils/TLTextUtil/TLTextUtil'
export { TLVideoUtil } from './lib/app/shapeutils/TLVideoUtil/TLVideoUtil'
export { StateNode, type StateNodeConstructor } from './lib/app/statechart/StateNode'
export { TLBoxTool, type TLBoxLike } from './lib/app/statechart/TLBoxTool/TLBoxTool'
export { type ClipboardPayload, type TLClipboardModel } from './lib/app/types/clipboard-types'
export { type TLEventMap, type TLEventMapHandler } from './lib/app/types/emit-types'
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
	type TLEventHandlers,
	type TLEventInfo,
	type TLEventName,
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
	type UiEnterHandler,
	type UiEvent,
	type UiEventType,
	type UiExitHandler,
} from './lib/app/types/event-types'
export {
	type TLCommand,
	type TLCommandHandler,
	type TLHistoryEntry,
	type TLMark,
} from './lib/app/types/history-types'
export { type RequiredKeys, type TLEasingType } from './lib/app/types/misc-types'
export { type TLResizeHandle, type TLSelectionHandle } from './lib/app/types/selection-types'
export {
	defaultEditorAssetUrls,
	setDefaultEditorAssetUrls,
	type EditorAssetUrls,
} from './lib/assetUrls'
export { Canvas } from './lib/components/Canvas'
export { DefaultErrorFallback } from './lib/components/DefaultErrorFallback'
export {
	ErrorBoundary,
	OptionalErrorBoundary,
	type ErrorBoundaryProps,
} from './lib/components/ErrorBoundary'
export { HTMLContainer, type HTMLContainerProps } from './lib/components/HTMLContainer'
export { SVGContainer, type SVGContainerProps } from './lib/components/SVGContainer'
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
	ARROW_LABEL_FONT_SIZES,
	BOUND_ARROW_OFFSET,
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
	MIN_ARROW_LENGTH,
	MIN_ZOOM,
	MULTI_CLICK_DURATION,
	REMOVE_SYMBOL,
	RICH_TYPES,
	ROTATING_SHADOWS,
	STYLES,
	SVG_PADDING,
	TEXT_PROPS,
	WAY_TOO_BIG_ARROW_BEND_FACTOR,
	ZOOMS,
} from './lib/constants'
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
	type EmbedResult,
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
export { hardResetApp } from './lib/utils/hard-reset'
export { isAnimated, isGIF } from './lib/utils/is-gif-animated'
export { setPropsForNextShape } from './lib/utils/props-for-next-shape'
export { refreshPage } from './lib/utils/refresh-page'
export {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	type RotationSnapshot,
} from './lib/utils/rotation'
export { runtime, setRuntimeOverrides } from './lib/utils/runtime'
export {
	blobAsString,
	correctSpacesToNbsp,
	dataTransferItemAsString,
	defaultEmptyAs,
} from './lib/utils/string'
export { getPointerInfo, getSvgPathFromStroke, getSvgPathFromStrokePoints } from './lib/utils/svg'
export { type StoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { hardReset } from './lib/utils/sync/hardReset'
export { TAB_ID } from './lib/utils/sync/persistence-constants'
export { openWindow } from './lib/utils/window-open'
