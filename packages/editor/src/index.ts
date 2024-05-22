// Important! don't move this tlschema re-export to lib/index.ts, doing so causes esbuild to produce
// incorrect output. https://github.com/evanw/esbuild/issues/1737

export {
	EMPTY_ARRAY,
	atom,
	computed,
	react,
	track,
	transact,
	transaction,
	useComputed,
	useQuickReactor,
	useReactor,
	useValue,
	whyAmIRunning,
	type Atom,
	type Signal,
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
	ErrorBoundary,
	OptionalErrorBoundary,
	type TLErrorBoundaryProps,
} from './lib/components/ErrorBoundary'
export { HTMLContainer, type HTMLContainerProps } from './lib/components/HTMLContainer'
export { SVGContainer, type SVGContainerProps } from './lib/components/SVGContainer'
export { DefaultBackground } from './lib/components/default-components/DefaultBackground'
export { DefaultBrush, type TLBrushProps } from './lib/components/default-components/DefaultBrush'
export { DefaultCanvas } from './lib/components/default-components/DefaultCanvas'
export {
	DefaultCollaboratorHint,
	type TLCollaboratorHintProps,
} from './lib/components/default-components/DefaultCollaboratorHint'
export {
	DefaultCursor,
	type TLCursorProps,
} from './lib/components/default-components/DefaultCursor'
export { DefaultErrorFallback } from './lib/components/default-components/DefaultErrorFallback'
export { DefaultGrid, type TLGridProps } from './lib/components/default-components/DefaultGrid'
export {
	DefaultHandle,
	type TLHandleProps,
} from './lib/components/default-components/DefaultHandle'
export {
	DefaultHandles,
	type TLHandlesProps,
} from './lib/components/default-components/DefaultHandles'
export {
	DefaultScribble,
	type TLScribbleProps,
} from './lib/components/default-components/DefaultScribble'
export {
	DefaultSelectionBackground,
	type TLSelectionBackgroundProps,
} from './lib/components/default-components/DefaultSelectionBackground'
export {
	DefaultSelectionForeground,
	type TLSelectionForegroundProps,
} from './lib/components/default-components/DefaultSelectionForeground'
export {
	DefaultShapeIndicator,
	type TLShapeIndicatorProps,
} from './lib/components/default-components/DefaultShapeIndicator'
export {
	DefaultSnapIndicator,
	type TLSnapIndicatorProps,
} from './lib/components/default-components/DefaultSnapIndictor'
export { DefaultSpinner } from './lib/components/default-components/DefaultSpinner'
export { DefaultSvgDefs } from './lib/components/default-components/DefaultSvgDefs'
export {
	TAB_ID,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
	type TLSessionStateSnapshot,
} from './lib/config/TLSessionStateSnapshot'
export {
	USER_COLORS,
	defaultUserPreferences,
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
export { type TLAnyBindingUtilConstructor } from './lib/config/defaultBindings'
export { coreShapes, type TLAnyShapeUtilConstructor } from './lib/config/defaultShapes'
export {
	ANIMATION_MEDIUM_MS,
	ANIMATION_SHORT_MS,
	CAMERA_SLIDE_FRICTION,
	DEFAULT_ANIMATION_OPTIONS,
	DEFAULT_CAMERA_OPTIONS,
	DOUBLE_CLICK_DURATION,
	DRAG_DISTANCE,
	GRID_STEPS,
	HIT_TEST_MARGIN,
	MAX_PAGES,
	MAX_SHAPES_PER_PAGE,
	MULTI_CLICK_DURATION,
	SIDES,
	SVG_PADDING,
} from './lib/constants'
export { Editor, type TLEditorOptions, type TLResizeShapeOptions } from './lib/editor/Editor'
export {
	BindingUtil,
	type BindingOnChangeOptions,
	type BindingOnCreateOptions,
	type BindingOnShapeChangeOptions,
	type BindingOnUnbindOptions,
	type TLBindingUtilConstructor,
} from './lib/editor/bindings/BindingUtil'
export { HistoryManager } from './lib/editor/managers/HistoryManager'
export {
	type BoundsSnapGeometry,
	type BoundsSnapPoint,
} from './lib/editor/managers/SnapManager/BoundsSnaps'
export { type HandleSnapGeometry } from './lib/editor/managers/SnapManager/HandleSnaps'
export {
	SnapManager,
	type GapsSnapIndicator,
	type PointsSnapIndicator,
	type SnapIndicator,
} from './lib/editor/managers/SnapManager/SnapManager'
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
	type TLOnHandleDragHandler,
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
export { resizeBox, type ResizeBoxOptions } from './lib/editor/shapes/shared/resizeBox'
export { BaseBoxShapeTool } from './lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'
export { StateNode, type TLStateNodeConstructor } from './lib/editor/tools/StateNode'
export {
	useSvgExportContext,
	type SvgExportContext,
	type SvgExportDef,
} from './lib/editor/types/SvgExportContext'
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
	type TLExternalContentSource,
} from './lib/editor/types/external-content'
export {
	type RequiredKeys,
	type TLCameraConstraints,
	type TLCameraMoveOptions,
	type TLCameraOptions,
	type TLSvgOptions,
} from './lib/editor/types/misc-types'
export { type TLResizeHandle, type TLSelectionHandle } from './lib/editor/types/selection-types'
export { ContainerProvider, useContainer } from './lib/hooks/useContainer'
export { getCursor } from './lib/hooks/useCursor'
export { EditorContext, useEditor } from './lib/hooks/useEditor'
export { useEditorComponents } from './lib/hooks/useEditorComponents'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useEvent } from './lib/hooks/useEvent'
export { useShallowArrayIdentity, useShallowObjectIdentity } from './lib/hooks/useIdentity'
export { useIsCropping } from './lib/hooks/useIsCropping'
export { useIsDarkMode } from './lib/hooks/useIsDarkMode'
export { useIsEditing } from './lib/hooks/useIsEditing'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useSafeId } from './lib/hooks/useSafeId'
export { useSelectionEvents } from './lib/hooks/useSelectionEvents'
export { useTLStore } from './lib/hooks/useTLStore'
export { useTransform } from './lib/hooks/useTransform'
export {
	Box,
	ROTATE_CORNER_TO_SELECTION_CORNER,
	rotateSelectionHandle,
	type BoxLike,
	type RotateCorner,
	type SelectionCorner,
	type SelectionEdge,
	type SelectionHandle,
} from './lib/primitives/Box'
export { Mat, type MatLike, type MatModel } from './lib/primitives/Mat'
export { Vec, type VecLike } from './lib/primitives/Vec'
export { EASINGS } from './lib/primitives/easings'
export { Arc2d } from './lib/primitives/geometry/Arc2d'
export { Circle2d } from './lib/primitives/geometry/Circle2d'
export { CubicBezier2d } from './lib/primitives/geometry/CubicBezier2d'
export { CubicSpline2d } from './lib/primitives/geometry/CubicSpline2d'
export { Edge2d } from './lib/primitives/geometry/Edge2d'
export { Ellipse2d } from './lib/primitives/geometry/Ellipse2d'
export { Geometry2d } from './lib/primitives/geometry/Geometry2d'
export { Group2d } from './lib/primitives/geometry/Group2d'
export { Point2d } from './lib/primitives/geometry/Point2d'
export { Polygon2d } from './lib/primitives/geometry/Polygon2d'
export { Polyline2d } from './lib/primitives/geometry/Polyline2d'
export { Rectangle2d } from './lib/primitives/geometry/Rectangle2d'
export { Stadium2d } from './lib/primitives/geometry/Stadium2d'
export {
	intersectCircleCircle,
	intersectCirclePolygon,
	intersectCirclePolyline,
	intersectLineSegmentCircle,
	intersectLineSegmentLineSegment,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	intersectPolygonBounds,
	intersectPolygonPolygon,
	linesIntersect,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from './lib/primitives/intersect'
export {
	HALF_PI,
	PI,
	PI2,
	SIN,
	angleDistance,
	approximately,
	areAnglesCompatible,
	average,
	canonicalizeRotation,
	clamp,
	clampRadians,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	degreesToRadians,
	getArcMeasure,
	getPointInArcT,
	getPointOnCircle,
	getPolygonVertices,
	isSafeFloat,
	perimeterOfEllipse,
	pointInPolygon,
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
export { dataUrlToFile } from './lib/utils/assets'
export { debugFlags, featureFlags, type DebugFlag } from './lib/utils/debug-flags'
export {
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from './lib/utils/dom'
export { moveCameraWhenCloseToEdge } from './lib/utils/edgeScrolling'
export { getIncrementedName } from './lib/utils/getIncrementedName'
export { getPointerInfo } from './lib/utils/getPointerInfo'
export { getSvgPathFromPoints } from './lib/utils/getSvgPathFromPoints'
export { hardResetEditor } from './lib/utils/hardResetEditor'
export { normalizeWheel } from './lib/utils/normalizeWheel'
export { refreshPage } from './lib/utils/refreshPage'
export {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	type TLRotationSnapshot,
} from './lib/utils/rotation'
export { runtime, setRuntimeOverrides } from './lib/utils/runtime'
export { type TLStoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { hardReset } from './lib/utils/sync/hardReset'
export { uniq } from './lib/utils/uniq'
export { uniqueId } from './lib/utils/uniqueId'
export { openWindow } from './lib/utils/window-open'

/** @polyfills */

import 'core-js/stable/array/at.js'
import 'core-js/stable/array/flat-map.js'
import 'core-js/stable/array/flat.js'
import 'core-js/stable/string/at.js'
import 'core-js/stable/string/replace-all.js'
