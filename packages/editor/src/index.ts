import { registerTldrawLibraryVersion } from '@tldraw/utils'
import 'core-js/stable/array/at.js'
import 'core-js/stable/array/flat-map.js'
import 'core-js/stable/array/flat.js'
import 'core-js/stable/string/at.js'
import 'core-js/stable/string/replace-all.js'
export {
	EMPTY_ARRAY,
	EffectScheduler,
	atom,
	computed,
	react,
	transact,
	transaction,
	whyAmIRunning,
	type Atom,
	type Signal,
} from '@tldraw/state'
export {
	track,
	useAtom,
	useComputed,
	useQuickReactor,
	useReactor,
	useStateTracking,
	useValue,
} from '@tldraw/state-react'
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
	useOnMount,
	type LoadingScreenProps,
	type TLOnMountHandler,
	type TldrawEditorBaseProps,
	type TldrawEditorProps,
	type TldrawEditorStoreProps,
	type TldrawEditorWithStoreProps,
	type TldrawEditorWithoutStoreProps,
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
export {
	DefaultCanvas,
	type TLCanvasComponentProps,
} from './lib/components/default-components/DefaultCanvas'
export {
	DefaultCollaboratorHint,
	type TLCollaboratorHintProps,
} from './lib/components/default-components/DefaultCollaboratorHint'
export {
	DefaultCursor,
	type TLCursorProps,
} from './lib/components/default-components/DefaultCursor'
export {
	DefaultErrorFallback,
	type TLErrorFallbackComponent,
} from './lib/components/default-components/DefaultErrorFallback'
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
export { type TLShapeErrorFallbackComponent } from './lib/components/default-components/DefaultShapeErrorFallback'
export {
	DefaultShapeIndicator,
	type TLShapeIndicatorProps,
} from './lib/components/default-components/DefaultShapeIndicator'
export { type TLShapeIndicatorErrorFallbackComponent } from './lib/components/default-components/DefaultShapeIndicatorErrorFallback'
export { DefaultShapeIndicators } from './lib/components/default-components/DefaultShapeIndicators'
export {
	DefaultSnapIndicator,
	type TLSnapIndicatorProps,
} from './lib/components/default-components/DefaultSnapIndictor'
export { DefaultSpinner } from './lib/components/default-components/DefaultSpinner'
export { DefaultSvgDefs } from './lib/components/default-components/DefaultSvgDefs'
export {
	getSnapshot,
	loadSnapshot,
	type TLEditorSnapshot,
	type TLLoadSnapshotOptions,
} from './lib/config/TLEditorSnapshot'
export {
	TAB_ID,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
	type TLLoadSessionStateSnapshotOptions,
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
	createTLSchemaFromUtils,
	createTLStore,
	inlineBase64AssetStore,
	type TLStoreBaseOptions,
	type TLStoreEventInfo,
	type TLStoreOptions,
	type TLStoreSchemaOptions,
} from './lib/config/createTLStore'
export { createTLUser, useTldrawUser, type TLUser } from './lib/config/createTLUser'
export { type TLAnyBindingUtilConstructor } from './lib/config/defaultBindings'
export { coreShapes, type TLAnyShapeUtilConstructor } from './lib/config/defaultShapes'
export { DEFAULT_ANIMATION_OPTIONS, DEFAULT_CAMERA_OPTIONS, SIDES } from './lib/constants'
export {
	Editor,
	type TLEditorOptions,
	type TLEditorRunOptions,
	type TLRenderingShape,
	type TLResizeShapeOptions,
} from './lib/editor/Editor'
export {
	BindingUtil,
	type BindingOnChangeOptions,
	type BindingOnCreateOptions,
	type BindingOnDeleteOptions,
	type BindingOnShapeChangeOptions,
	type BindingOnShapeDeleteOptions,
	type BindingOnShapeIsolateOptions,
	type TLBindingUtilConstructor,
} from './lib/editor/bindings/BindingUtil'
export { ClickManager, type TLClickState } from './lib/editor/managers/ClickManager'
export { EdgeScrollManager } from './lib/editor/managers/EdgeScrollManager'
export { HistoryManager } from './lib/editor/managers/HistoryManager'
export { ScribbleManager, type ScribbleItem } from './lib/editor/managers/ScribbleManager'
export {
	BoundsSnaps,
	type BoundsSnapGeometry,
	type BoundsSnapPoint,
} from './lib/editor/managers/SnapManager/BoundsSnaps'
export { HandleSnaps, type HandleSnapGeometry } from './lib/editor/managers/SnapManager/HandleSnaps'
export {
	SnapManager,
	type GapsSnapIndicator,
	type PointsSnapIndicator,
	type SnapData,
	type SnapIndicator,
} from './lib/editor/managers/SnapManager/SnapManager'
export { TextManager, type TLMeasureTextSpanOpts } from './lib/editor/managers/TextManager'
export { UserPreferencesManager } from './lib/editor/managers/UserPreferencesManager'
export { BaseBoxShapeUtil, type TLBaseBoxShape } from './lib/editor/shapes/BaseBoxShapeUtil'
export {
	ShapeUtil,
	type TLHandleDragInfo,
	type TLResizeInfo,
	type TLResizeMode,
	type TLShapeUtilCanBindOpts,
	type TLShapeUtilCanvasSvgDef,
	type TLShapeUtilConstructor,
} from './lib/editor/shapes/ShapeUtil'
export { GroupShapeUtil } from './lib/editor/shapes/group/GroupShapeUtil'
export { getPerfectDashProps } from './lib/editor/shapes/shared/getPerfectDashProps'
export { resizeBox, type ResizeBoxOptions } from './lib/editor/shapes/shared/resizeBox'
export { BaseBoxShapeTool } from './lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'
export { StateNode, type TLStateNodeConstructor } from './lib/editor/tools/StateNode'
export {
	useDelaySvgExport,
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
	type TLTickEventInfo,
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
	type TLHistoryBatchOptions,
	type TLHistoryDiff,
	type TLHistoryEntry,
	type TLHistoryMark,
} from './lib/editor/types/history-types'
export {
	type OptionalKeys,
	type RequiredKeys,
	type TLCameraConstraints,
	type TLCameraMoveOptions,
	type TLCameraOptions,
	type TLImageExportOptions,
	// eslint-disable-next-line deprecation/deprecation
	type TLSvgOptions,
} from './lib/editor/types/misc-types'
export { type TLResizeHandle, type TLSelectionHandle } from './lib/editor/types/selection-types'
export { tlenv } from './lib/globals/environment'
export { tlmenus } from './lib/globals/menus'
export { tltime } from './lib/globals/time'
export {
	ContainerProvider,
	useContainer,
	useContainerIfExists,
	type ContainerProviderProps,
} from './lib/hooks/useContainer'
export { getCursor } from './lib/hooks/useCursor'
export { useEditor, useMaybeEditor } from './lib/hooks/useEditor'
export { useEditorComponents } from './lib/hooks/useEditorComponents'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useEvent } from './lib/hooks/useEvent'
export { useGlobalMenuIsOpen } from './lib/hooks/useGlobalMenuIsOpen'
export { useShallowArrayIdentity, useShallowObjectIdentity } from './lib/hooks/useIdentity'
export { useIsCropping } from './lib/hooks/useIsCropping'
export { useIsDarkMode } from './lib/hooks/useIsDarkMode'
export { useIsEditing } from './lib/hooks/useIsEditing'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePassThroughWheelEvents } from './lib/hooks/usePassThroughWheelEvents'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useRefState } from './lib/hooks/useRefState'
export { sanitizeId, useSafeId } from './lib/hooks/useSafeId'
export { useSelectionEvents } from './lib/hooks/useSelectionEvents'
export { useTLSchemaFromUtils, useTLStore } from './lib/hooks/useTLStore'
export { useTransform } from './lib/hooks/useTransform'
export {
	LicenseManager,
	type InvalidLicenseKeyResult,
	type InvalidLicenseReason,
	type LicenseFromKeyResult,
	type LicenseInfo,
	type TestEnvironment,
	type ValidLicenseKeyResult,
} from './lib/license/LicenseManager'
export { defaultTldrawOptions, type TldrawOptions } from './lib/options'
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
export { Geometry2d, type Geometry2dOptions } from './lib/primitives/geometry/Geometry2d'
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
	centerOfCircleFromThreePoints,
	clamp,
	clampRadians,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	degreesToRadians,
	getArcMeasure,
	getPointInArcT,
	getPointOnCircle,
	getPointsOnArc,
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
export { dataUrlToFile, getDefaultCdnBaseUrl } from './lib/utils/assets'
export {
	debugFlags,
	featureFlags,
	type DebugFlag,
	type DebugFlagDef,
	type DebugFlagDefaults,
} from './lib/utils/debug-flags'
export {
	createDeepLinkString,
	parseDeepLinkString,
	type TLDeepLink,
	type TLDeepLinkOptions,
} from './lib/utils/deepLinks'
export {
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from './lib/utils/dom'
export { getIncrementedName } from './lib/utils/getIncrementedName'
export { getPointerInfo } from './lib/utils/getPointerInfo'
export { getSvgPathFromPoints } from './lib/utils/getSvgPathFromPoints'
export { hardResetEditor } from './lib/utils/hardResetEditor'
export { isAccelKey } from './lib/utils/keyboard'
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
export { openWindow } from './lib/utils/window-open'

/**
 * @deprecated Licensing is now enabled in the tldraw SDK.
 * @public */
export function debugEnableLicensing() {
	// noop
	return
}

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
