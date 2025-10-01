import { registerTldrawLibraryVersion } from '@tldraw/utils'
import 'core-js/stable/array/at.js'
import 'core-js/stable/array/flat-map.js'
import 'core-js/stable/array/flat.js'
import 'core-js/stable/string/at.js'
import 'core-js/stable/string/replace-all.js'

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/state'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/state-react'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/store'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/tlschema'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/utils'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/validate'

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
export {
	DefaultShapeIndicators,
	type TLShapeIndicatorsProps,
} from './lib/components/default-components/DefaultShapeIndicators'
export {
	DefaultShapeWrapper,
	type TLShapeWrapperProps,
} from './lib/components/default-components/DefaultShapeWrapper'
export {
	DefaultSnapIndicator,
	type TLSnapIndicatorProps,
} from './lib/components/default-components/DefaultSnapIndictor'
export { DefaultSpinner } from './lib/components/default-components/DefaultSpinner'
export { DefaultSvgDefs } from './lib/components/default-components/DefaultSvgDefs'
export {
	ErrorBoundary,
	OptionalErrorBoundary,
	type TLErrorBoundaryProps,
} from './lib/components/ErrorBoundary'
export { HTMLContainer, type HTMLContainerProps } from './lib/components/HTMLContainer'
export { MenuClickCapture } from './lib/components/MenuClickCapture'
export { SVGContainer, type SVGContainerProps } from './lib/components/SVGContainer'
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
export {
	getSnapshot,
	loadSnapshot,
	type TLEditorSnapshot,
	type TLLoadSnapshotOptions,
} from './lib/config/TLEditorSnapshot'
export {
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
	TAB_ID,
	type TLLoadSessionStateSnapshotOptions,
	type TLSessionStateSnapshot,
} from './lib/config/TLSessionStateSnapshot'
export {
	defaultUserPreferences,
	getFreshUserPreferences,
	getUserPreferences,
	setUserPreferences,
	USER_COLORS,
	userTypeValidator,
	type TLUserPreferences,
} from './lib/config/TLUserPreferences'
export { DEFAULT_ANIMATION_OPTIONS, DEFAULT_CAMERA_OPTIONS, SIDES } from './lib/constants'
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
export {
	Editor,
	type TLEditorOptions,
	type TLEditorRunOptions,
	type TLRenderingShape,
	type TLResizeShapeOptions,
} from './lib/editor/Editor'
export { ClickManager, type TLClickState } from './lib/editor/managers/ClickManager/ClickManager'
export { EdgeScrollManager } from './lib/editor/managers/EdgeScrollManager/EdgeScrollManager'
export {
	FontManager,
	type TLFontFace,
	type TLFontFaceSource,
} from './lib/editor/managers/FontManager/FontManager'
export { HistoryManager } from './lib/editor/managers/HistoryManager/HistoryManager'
export {
	ScribbleManager,
	type ScribbleItem,
} from './lib/editor/managers/ScribbleManager/ScribbleManager'
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
export {
	TextManager,
	type TLMeasureTextOpts,
	type TLMeasureTextSpanOpts,
} from './lib/editor/managers/TextManager/TextManager'
export { UserPreferencesManager } from './lib/editor/managers/UserPreferencesManager/UserPreferencesManager'
export { BaseBoxShapeUtil, type TLBaseBoxShape } from './lib/editor/shapes/BaseBoxShapeUtil'
export { GroupShapeUtil } from './lib/editor/shapes/group/GroupShapeUtil'
export {
	ShapeUtil,
	type TLCropInfo,
	type TLDragShapesInInfo,
	type TLDragShapesOutInfo,
	type TLDragShapesOverInfo,
	type TLDropShapesOverInfo,
	type TLGeometryOpts,
	type TLHandleDragInfo,
	type TLResizeInfo,
	type TLResizeMode,
	type TLShapeUtilCanBeLaidOutOpts,
	type TLShapeUtilCanBindOpts,
	type TLShapeUtilCanvasSvgDef,
	type TLShapeUtilConstructor,
} from './lib/editor/shapes/ShapeUtil'
export {
	getPerfectDashProps,
	type PerfectDashTerminal,
} from './lib/editor/shapes/shared/getPerfectDashProps'
export { resizeBox, type ResizeBoxOptions } from './lib/editor/shapes/shared/resizeBox'
export { resizeScaled } from './lib/editor/shapes/shared/resizeScaled'
export { BaseBoxShapeTool } from './lib/editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'
export { maybeSnapToGrid } from './lib/editor/tools/BaseBoxShapeTool/children/Pointing'
export { StateNode, type TLStateNodeConstructor } from './lib/editor/tools/StateNode'
export { type TLContent } from './lib/editor/types/clipboard-types'
export { type TLEventMap, type TLEventMapHandler } from './lib/editor/types/emit-types'
export {
	EVENT_NAME_MAP,
	type TLBaseEventInfo,
	type TLCancelEvent,
	type TLCancelEventInfo,
	type TLClickEvent,
	type TLClickEventInfo,
	type TLCLickEventName,
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
	type TLBaseExternalContent,
	type TLEmbedExternalContent,
	type TLErrorExternalContentSource,
	type TLExcalidrawExternalContent,
	type TLExcalidrawExternalContentSource,
	type TLExternalAsset,
	type TLExternalContent,
	type TLExternalContentSource,
	type TLFileExternalAsset,
	type TLFileReplaceExternalContent,
	type TLFilesExternalContent,
	type TLSvgTextExternalContent,
	type TLTextExternalContent,
	type TLTextExternalContentSource,
	type TLTldrawExternalContent,
	type TLTldrawExternalContentSource,
	type TLUrlExternalAsset,
	type TLUrlExternalContent,
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
	type TLExportType,
	type TLGetShapeAtPointOptions,
	type TLImageExportOptions,
	type TLSvgExportOptions,
	type TLUpdatePointerOptions,
} from './lib/editor/types/misc-types'
export {
	type TLAdjacentDirection,
	type TLResizeHandle,
	type TLSelectionHandle,
} from './lib/editor/types/selection-types'
export {
	useDelaySvgExport,
	useSvgExportContext,
	type SvgExportContext,
	type SvgExportDef,
} from './lib/editor/types/SvgExportContext'
export { getSvgAsImage } from './lib/exports/getSvgAsImage'
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
export {
	EditorContext,
	EditorProvider,
	useEditor,
	useMaybeEditor,
	type EditorProviderProps,
} from './lib/hooks/useEditor'
export { useEditorComponents } from './lib/hooks/useEditorComponents'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useEvent, useReactiveEvent } from './lib/hooks/useEvent'
export { useGlobalMenuIsOpen } from './lib/hooks/useGlobalMenuIsOpen'
export { useShallowArrayIdentity, useShallowObjectIdentity } from './lib/hooks/useIdentity'
export { useIsCropping } from './lib/hooks/useIsCropping'
export { useIsDarkMode } from './lib/hooks/useIsDarkMode'
export { useIsEditing } from './lib/hooks/useIsEditing'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePassThroughMouseOverEvents } from './lib/hooks/usePassThroughMouseOverEvents'
export { usePassThroughWheelEvents } from './lib/hooks/usePassThroughWheelEvents'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useRefState } from './lib/hooks/useRefState'
export {
	sanitizeId,
	suffixSafeId,
	useSharedSafeId,
	useUniqueSafeId,
	type SafeId,
} from './lib/hooks/useSafeId'
export { useSelectionEvents } from './lib/hooks/useSelectionEvents'
export { useTLSchemaFromUtils, useTLStore } from './lib/hooks/useTLStore'
export { useTransform } from './lib/hooks/useTransform'
export { useViewportHeight } from './lib/hooks/useViewportHeight'
export {
	LicenseManager,
	type InvalidLicenseKeyResult,
	type InvalidLicenseReason,
	type LicenseFromKeyResult,
	type LicenseInfo,
	type LicenseState,
	type ValidLicenseKeyResult,
} from './lib/license/LicenseManager'
export { LICENSE_TIMEOUT } from './lib/license/LicenseProvider'
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
export { EASINGS } from './lib/primitives/easings'
export { Arc2d } from './lib/primitives/geometry/Arc2d'
export { Circle2d } from './lib/primitives/geometry/Circle2d'
export { CubicBezier2d } from './lib/primitives/geometry/CubicBezier2d'
export { CubicSpline2d } from './lib/primitives/geometry/CubicSpline2d'
export { Edge2d } from './lib/primitives/geometry/Edge2d'
export { Ellipse2d } from './lib/primitives/geometry/Ellipse2d'
export { getVerticesCountForArcLength } from './lib/primitives/geometry/geometry-constants'
export {
	Geometry2d,
	Geometry2dFilters,
	TransformedGeometry2d,
	type Geometry2dOptions,
	type TransformedGeometry2dOptions,
} from './lib/primitives/geometry/Geometry2d'
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
export { Mat, type MatLike, type MatModel } from './lib/primitives/Mat'
export {
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
	HALF_PI,
	isSafeFloat,
	perimeterOfEllipse,
	PI,
	PI2,
	pointInPolygon,
	precise,
	radiansToDegrees,
	rangeIntersection,
	shortAngleDist,
	SIN,
	snapAngle,
	toDomPrecision,
	toFixed,
	toPrecision,
} from './lib/primitives/utils'
export { Vec, type VecLike } from './lib/primitives/Vec'
export {
	ErrorScreen,
	LoadingScreen,
	TldrawEditor,
	useOnMount,
	type LoadingScreenProps,
	type TldrawEditorBaseProps,
	type TldrawEditorProps,
	type TldrawEditorStoreProps,
	type TldrawEditorWithoutStoreProps,
	type TldrawEditorWithStoreProps,
	type TLOnMountHandler,
} from './lib/TldrawEditor'
export { dataUrlToFile, getDefaultCdnBaseUrl } from './lib/utils/assets'
export { clampToBrowserMaxCanvasSize, type CanvasMaxSize } from './lib/utils/browserCanvasMaxSize'
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
	activeElementShouldCaptureKeys,
	loopToHtmlElement,
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from './lib/utils/dom'
export { EditorAtom } from './lib/utils/EditorAtom'
export { getIncrementedName } from './lib/utils/getIncrementedName'
export { getPointerInfo } from './lib/utils/getPointerInfo'
export { getSvgPathFromPoints } from './lib/utils/getSvgPathFromPoints'
export { hardResetEditor } from './lib/utils/hardResetEditor'
export { isAccelKey } from './lib/utils/keyboard'
export { normalizeWheel } from './lib/utils/normalizeWheel'
export { refreshPage } from './lib/utils/refreshPage'
export { getDroppedShapesToNewParents, kickoutOccludedShapes } from './lib/utils/reparenting'
export {
	getFontsFromRichText,
	type RichTextFontVisitor,
	type RichTextFontVisitorState,
	type TiptapEditor,
	type TiptapNode,
	type TLTextOptions,
} from './lib/utils/richText'
export {
	applyRotationToSnapshotShapes,
	getRotationSnapshot,
	type TLRotationSnapshot,
} from './lib/utils/rotation'
export { runtime, setRuntimeOverrides } from './lib/utils/runtime'
export {
	ReadonlySharedStyleMap,
	SharedStyleMap,
	type SharedStyle,
} from './lib/utils/SharedStylesMap'
export { hardReset } from './lib/utils/sync/hardReset'
export { LocalIndexedDb, Table, type StoreName } from './lib/utils/sync/LocalIndexedDb'
export { type TLStoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { uniq } from './lib/utils/uniq'
export { openWindow } from './lib/utils/window-open'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
