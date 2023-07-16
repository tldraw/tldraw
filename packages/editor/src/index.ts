// Important! don't move this tlschema re-export to lib/index.ts, doing so causes esbuild to produce
// incorrect output. https://github.com/evanw/esbuild/issues/1737

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/indices'
export {
	EMPTY_ARRAY,
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
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/store'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/tlschema'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/utils'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/validate'
export {
	ErrorScreen,
	LoadingScreen,
	TldrawEditor,
	type TLOnMountHandler,
	type TldrawEditorBaseProps,
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
export { coreShapes, type TLAnyShapeUtilConstructor } from './lib/config/defaultShapes'
export {
	ANIMATION_MEDIUM_MS,
	ANIMATION_SHORT_MS,
	CAMERA_SLIDE_FRICTION,
	DEFAULT_ANIMATION_OPTIONS,
	DOUBLE_CLICK_DURATION,
	DRAG_DISTANCE,
	GRID_INCREMENT,
	GRID_STEPS,
	HASH_PATTERN_ZOOM_NAMES,
	MAJOR_NUDGE_FACTOR,
	MAX_PAGES,
	MAX_SHAPES_PER_PAGE,
	MAX_ZOOM,
	MINOR_NUDGE_FACTOR,
	MIN_ZOOM,
	MULTI_CLICK_DURATION,
	SVG_PADDING,
	ZOOMS,
} from './lib/constants'
export { Editor, type TLAnimationOptions, type TLEditorOptions } from './lib/editor/Editor'
export {
	SnapManager,
	type GapsSnapLine,
	type PointsSnapLine,
	type SnapLine,
	type SnapPoint,
} from './lib/editor/managers/SnapManager'
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
	type TLShapeUtilCanvasSvgDef,
	type TLShapeUtilConstructor,
	type TLShapeUtilFlag,
} from './lib/editor/shapes/ShapeUtil'
export { GroupShapeUtil } from './lib/editor/shapes/group/GroupShapeUtil'
export { getArrowheadPathForType } from './lib/editor/shapes/shared/arrow/arrowheads'
export {
	getCurvedArrowHandlePath,
	getSolidCurvedArrowPath,
} from './lib/editor/shapes/shared/arrow/curved-arrow'
export { getArrowTerminalsInArrowSpace } from './lib/editor/shapes/shared/arrow/shared'
export {
	getSolidStraightArrowPath,
	getStraightArrowHandlePath,
} from './lib/editor/shapes/shared/arrow/straight-arrow'
export { resizeBox, type ResizeBoxOptions } from './lib/editor/shapes/shared/resizeBox'
export { BaseBoxShapeTool } from './lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'
export { StateNode, type TLStateNodeConstructor } from './lib/editor/tools/StateNode'
export { type SvgExportContext, type SvgExportDef } from './lib/editor/types/SvgExportContext'
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
	type TLExternalAssetContent,
	type TLExternalContent,
} from './lib/editor/types/external-content'
export {
	type TLCommand,
	type TLCommandHandler,
	type TLHistoryEntry,
	type TLHistoryMark,
} from './lib/editor/types/history-types'
export { type RequiredKeys } from './lib/editor/types/misc-types'
export { type TLResizeHandle, type TLSelectionHandle } from './lib/editor/types/selection-types'
export { useContainer } from './lib/hooks/useContainer'
export { useEditor } from './lib/hooks/useEditor'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useIsCropping } from './lib/hooks/useIsCropping'
export { useIsEditing } from './lib/hooks/useIsEditing'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useTLStore } from './lib/hooks/useTLStore'
export {
	Box2d,
	ROTATE_CORNER_TO_SELECTION_CORNER,
	rotateSelectionHandle,
	type RotateCorner,
	type SelectionCorner,
	type SelectionEdge,
	type SelectionHandle,
} from './lib/primitives/Box2d'
export { CubicSpline2d } from './lib/primitives/CubicSpline2d'
export { Matrix2d, type Matrix2dModel } from './lib/primitives/Matrix2d'
export { Polyline2d } from './lib/primitives/Polyline2d'
export { Vec2d, type VecLike } from './lib/primitives/Vec2d'
export { EASINGS } from './lib/primitives/easings'
export {
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	intersectPolygonPolygon,
	linesIntersect,
	polygonsIntersect,
} from './lib/primitives/intersect'
export {
	EPSILON,
	PI,
	PI2,
	SIN,
	TAU,
	angleDelta,
	approximately,
	areAnglesCompatible,
	average,
	canonicalizeRotation,
	clamp,
	clampRadians,
	degreesToRadians,
	getArcLength,
	getPointOnCircle,
	getPolygonVertices,
	getStarBounds,
	getSweep,
	isAngleBetween,
	isSafeFloat,
	lerpAngles,
	longAngleDist,
	perimeterOfEllipse,
	pointInBounds,
	pointInCircle,
	pointInEllipse,
	pointInPolygon,
	pointInPolyline,
	pointInRect,
	pointNearToLineSegment,
	pointNearToPolyline,
	precise,
	radiansToDegrees,
	rangeIntersection,
	shortAngleDist,
	snapAngle,
	toDomPrecision,
	toFixed,
	toPrecision,
} from './lib/primitives/utils'
export {
	ReadonlySharedStyleMap,
	SharedStyleMap,
	type SharedStyle,
} from './lib/utils/SharedStylesMap'
export { WeakMapCache } from './lib/utils/WeakMapCache'
export { dataUrlToFile } from './lib/utils/assets'
export { debugFlags, featureFlags, type DebugFlag } from './lib/utils/debug-flags'
export {
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
	usePrefersReducedMotion,
} from './lib/utils/dom'
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
export { getIncrementedName } from './lib/utils/getIncrementedName'
export { hardResetEditor } from './lib/utils/hard-reset'
export { normalizeWheel } from './lib/utils/normalizeWheel'
export { png } from './lib/utils/png'
export { refreshPage } from './lib/utils/refresh-page'
export {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	type TLRotationSnapshot,
} from './lib/utils/rotation'
export { runtime, setRuntimeOverrides } from './lib/utils/runtime'
export {
	blobAsString,
	correctSpacesToNbsp,
	dataTransferItemAsString,
	defaultEmptyAs,
} from './lib/utils/string'
export { getPointerInfo, getSvgPathFromStroke } from './lib/utils/svg'
export { type TLStoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { hardReset } from './lib/utils/sync/hardReset'
export { uniqueId } from './lib/utils/uniqueId'
export { openWindow } from './lib/utils/window-open'

/** @polyfills */
import 'core-js/stable/array/at'
import 'core-js/stable/array/flat'
import 'core-js/stable/array/flat-map'
import 'core-js/stable/string/at'
import 'core-js/stable/string/replace-all'
