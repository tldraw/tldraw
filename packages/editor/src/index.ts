// eslint-disable-next-line local/no-export-star
export * from '@tldraw/indices'
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
export { Editor, type TLAnimationOptions, type TLEditorOptions } from './lib/editor/Editor'
export { ArrowShapeUtil } from './lib/editor/shapeutils/ArrowShapeUtil/ArrowShapeUtil'
export { BaseBoxShapeUtil, type TLBaseBoxShape } from './lib/editor/shapeutils/BaseBoxShapeUtil'
export { BookmarkShapeUtil } from './lib/editor/shapeutils/BookmarkShapeUtil/BookmarkShapeUtil'
export { DrawShapeUtil } from './lib/editor/shapeutils/DrawShapeUtil/DrawShapeUtil'
export { EmbedShapeUtil } from './lib/editor/shapeutils/EmbedShapeUtil/EmbedShapeUtil'
export { FrameShapeUtil } from './lib/editor/shapeutils/FrameShapeUtil/FrameShapeUtil'
export { GeoShapeUtil } from './lib/editor/shapeutils/GeoShapeUtil/GeoShapeUtil'
export { GroupShapeUtil } from './lib/editor/shapeutils/GroupShapeUtil/GroupShapeUtil'
export { HighlightShapeUtil } from './lib/editor/shapeutils/HighlightShapeUtil/HighlightShapeUtil'
export { ImageShapeUtil } from './lib/editor/shapeutils/ImageShapeUtil/ImageShapeUtil'
export {
	LineShapeUtil,
	getSplineForLineShape,
} from './lib/editor/shapeutils/LineShapeUtil/LineShapeUtil'
export { NoteShapeUtil } from './lib/editor/shapeutils/NoteShapeUtil/NoteShapeUtil'
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
export { INDENT, TextShapeUtil } from './lib/editor/shapeutils/TextShapeUtil/TextShapeUtil'
export { VideoShapeUtil } from './lib/editor/shapeutils/VideoShapeUtil/VideoShapeUtil'
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
export {
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './lib/schema/TLStore'
export {
	assetIdValidator,
	createAssetValidator,
	type TLBaseAsset,
} from './lib/schema/assets/TLBaseAsset'
export { type TLBookmarkAsset } from './lib/schema/assets/TLBookmarkAsset'
export { type TLImageAsset } from './lib/schema/assets/TLImageAsset'
export { type TLVideoAsset } from './lib/schema/assets/TLVideoAsset'
export { createPresenceStateDerivation } from './lib/schema/createPresenceStateDerivation'
export { createTLSchema } from './lib/schema/createTLSchema'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './lib/schema/fixup'
export { type TLCursor, type TLCursorType } from './lib/schema/misc/TLCursor'
export { type TLHandle, type TLHandleType } from './lib/schema/misc/TLHandle'
export { scribbleValidator, type TLScribble } from './lib/schema/misc/TLScribble'
export {
	TL_UI_COLOR_TYPES,
	uiColorTypeValidator,
	type TLUIColor,
} from './lib/schema/misc/TLUIColor'
export { idValidator } from './lib/schema/misc/id-validator'
export {
	AssetRecordType,
	assetMigrations,
	assetValidator,
	type TLAsset,
	type TLAssetId,
	type TLAssetPartial,
	type TLAssetShape,
} from './lib/schema/records/TLAsset'
export { CameraRecordType, type TLCamera, type TLCameraId } from './lib/schema/records/TLCamera'
export { DocumentRecordType, TLDOCUMENT_ID, type TLDocument } from './lib/schema/records/TLDocument'
export {
	InstanceRecordType,
	TLINSTANCE_ID,
	instanceTypeValidator,
	type TLInstance,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './lib/schema/records/TLInstance'
export {
	PageRecordType,
	isPageId,
	pageIdValidator,
	type TLPage,
	type TLPageId,
} from './lib/schema/records/TLPage'
export {
	InstancePageStateRecordType,
	type TLInstancePageState,
} from './lib/schema/records/TLPageState'
export { PointerRecordType, TLPOINTER_ID } from './lib/schema/records/TLPointer'
export {
	InstancePresenceRecordType,
	type TLInstancePresence,
} from './lib/schema/records/TLPresence'
export { type TLRecord } from './lib/schema/records/TLRecord'
export {
	createShapeId,
	isShape,
	isShapeId,
	rootShapeMigrations,
	type TLDefaultShape,
	type TLNullableShapeProps,
	type TLParentId,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
	type TLShapeProp,
	type TLShapeProps,
	type TLUnknownShape,
} from './lib/schema/records/TLShape'
export {
	type TLArrowShape,
	type TLArrowShapeProps,
	type TLArrowTerminal,
	type TLArrowTerminalType,
} from './lib/schema/shapes/TLArrowShape'
export {
	createShapeValidator,
	parentIdValidator,
	shapeIdValidator,
	type TLBaseShape,
} from './lib/schema/shapes/TLBaseShape'
export { type TLBookmarkShape } from './lib/schema/shapes/TLBookmarkShape'
export { type TLDrawShape, type TLDrawShapeSegment } from './lib/schema/shapes/TLDrawShape'
export {
	EMBED_DEFINITIONS,
	embedShapePermissionDefaults,
	type EmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapePermissions,
} from './lib/schema/shapes/TLEmbedShape'
export { type TLFrameShape } from './lib/schema/shapes/TLFrameShape'
export { type TLGeoShape } from './lib/schema/shapes/TLGeoShape'
export { type TLGroupShape } from './lib/schema/shapes/TLGroupShape'
export { type TLHighlightShape } from './lib/schema/shapes/TLHighlightShape'
export { type TLIconShape } from './lib/schema/shapes/TLIconShape'
export {
	type TLImageCrop,
	type TLImageShape,
	type TLImageShapeProps,
} from './lib/schema/shapes/TLImageShape'
export { type TLLineShape } from './lib/schema/shapes/TLLineShape'
export { type TLNoteShape } from './lib/schema/shapes/TLNoteShape'
export { type TLTextShape, type TLTextShapeProps } from './lib/schema/shapes/TLTextShape'
export { type TLVideoShape } from './lib/schema/shapes/TLVideoShape'
export {
	TL_ALIGN_TYPES,
	alignValidator,
	type TLAlignStyle,
	type TLAlignType,
} from './lib/schema/styles/TLAlignStyle'
export {
	TL_ARROWHEAD_TYPES,
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
} from './lib/schema/styles/TLArrowheadStyle'
export { TL_STYLE_TYPES, type TLStyleType } from './lib/schema/styles/TLBaseStyle'
export {
	TL_COLOR_TYPES,
	colorValidator,
	type TLColorStyle,
	type TLColorType,
} from './lib/schema/styles/TLColorStyle'
export {
	TL_DASH_TYPES,
	dashValidator,
	type TLDashStyle,
	type TLDashType,
} from './lib/schema/styles/TLDashStyle'
export {
	TL_FILL_TYPES,
	fillValidator,
	type TLFillStyle,
	type TLFillType,
} from './lib/schema/styles/TLFillStyle'
export {
	TL_FONT_TYPES,
	fontValidator,
	type TLFontStyle,
	type TLFontType,
} from './lib/schema/styles/TLFontStyle'
export {
	TL_GEO_TYPES,
	geoValidator,
	type TLGeoStyle,
	type TLGeoType,
} from './lib/schema/styles/TLGeoStyle'
export { iconValidator, type TLIconStyle, type TLIconType } from './lib/schema/styles/TLIconStyle'
export { opacityValidator, type TLOpacityType } from './lib/schema/styles/TLOpacityStyle'
export {
	TL_SIZE_TYPES,
	sizeValidator,
	type TLSizeStyle,
	type TLSizeType,
} from './lib/schema/styles/TLSizeStyle'
export {
	TL_SPLINE_TYPES,
	splineValidator,
	type TLSplineStyle,
	type TLSplineType,
} from './lib/schema/styles/TLSplineStyle'
export {
	verticalAlignValidator,
	type TLVerticalAlignType,
} from './lib/schema/styles/TLVerticalAlignStyle'
export {
	type TLStyleCollections,
	type TLStyleItem,
	type TLStyleProps,
} from './lib/schema/styles/style-types'
export {
	LANGUAGES,
	getDefaultTranslationLocale,
	type TLLanguage,
} from './lib/schema/translations/translations'
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
