import { registerTldrawLibraryVersion } from '@tldraw/utils'
export {
	type TLAssetContext,
	type TLAssetStore,
	type TLSerializedStore,
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './TLStore'
export { assetIdValidator, createAssetValidator, type TLBaseAsset } from './assets/TLBaseAsset'
export { type TLBookmarkAsset } from './assets/TLBookmarkAsset'
export { type TLImageAsset } from './assets/TLImageAsset'
export { type TLVideoAsset } from './assets/TLVideoAsset'
export {
	arrowBindingMigrations,
	arrowBindingProps,
	type TLArrowBinding,
	type TLArrowBindingProps,
} from './bindings/TLArrowBinding'
export {
	bindingIdValidator,
	createBindingValidator,
	type TLBaseBinding,
} from './bindings/TLBaseBinding'
export {
	createPresenceStateDerivation,
	getDefaultUserPresence,
	type TLPresenceStateInfo,
	type TLPresenceUserInfo,
} from './createPresenceStateDerivation'
export {
	createTLSchema,
	defaultBindingSchemas,
	defaultShapeSchemas,
	type SchemaPropsInfo,
	type TLSchema,
} from './createTLSchema'
export {
	TL_CANVAS_UI_COLOR_TYPES,
	canvasUiColorTypeValidator,
	type TLCanvasUiColor,
} from './misc/TLColor'
export { TL_CURSOR_TYPES, type TLCursor, type TLCursorType } from './misc/TLCursor'
export { TL_HANDLE_TYPES, type TLHandle, type TLHandleType } from './misc/TLHandle'
export { opacityValidator, type TLOpacityType } from './misc/TLOpacity'
export { TL_SCRIBBLE_STATES, scribbleValidator, type TLScribble } from './misc/TLScribble'
export {
	boxModelValidator,
	vecModelValidator,
	type BoxModel,
	type VecModel,
} from './misc/geometry-types'
export { idValidator } from './misc/id-validator'
export {
	AssetRecordType,
	assetMigrations,
	assetValidator,
	type TLAsset,
	type TLAssetId,
	type TLAssetPartial,
	type TLAssetShape,
} from './records/TLAsset'
export {
	createBindingId,
	createBindingPropsMigrationIds,
	createBindingPropsMigrationSequence,
	isBinding,
	isBindingId,
	rootBindingMigrations,
	type TLBinding,
	type TLBindingCreate,
	type TLBindingId,
	type TLBindingUpdate,
	type TLDefaultBinding,
	type TLUnknownBinding,
} from './records/TLBinding'
export { CameraRecordType, type TLCamera, type TLCameraId } from './records/TLCamera'
export {
	DocumentRecordType,
	TLDOCUMENT_ID,
	isDocument,
	type TLDocument,
} from './records/TLDocument'
export {
	TLINSTANCE_ID,
	pluckPreservingValues,
	type TLInstance,
	type TLInstanceId,
} from './records/TLInstance'
export {
	PageRecordType,
	isPageId,
	pageIdValidator,
	type TLPage,
	type TLPageId,
} from './records/TLPage'
export {
	InstancePageStateRecordType,
	type TLInstancePageState,
	type TLInstancePageStateId,
} from './records/TLPageState'
export {
	PointerRecordType,
	TLPOINTER_ID,
	type TLPointer,
	type TLPointerId,
} from './records/TLPointer'
export {
	InstancePresenceRecordType,
	type TLInstancePresence,
	type TLInstancePresenceID,
} from './records/TLPresence'
export { type TLRecord } from './records/TLRecord'
export {
	createShapeId,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
	getShapePropKeysByStyle,
	isShape,
	isShapeId,
	rootShapeMigrations,
	type TLDefaultShape,
	type TLParentId,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
	type TLUnknownShape,
} from './records/TLShape'
export {
	type RecordProps,
	type RecordPropsType,
	type TLPropsMigration,
	type TLPropsMigrations,
} from './recordsWithProps'
export {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	arrowShapeMigrations,
	arrowShapeProps,
	type TLArrowShape,
	type TLArrowShapeArrowheadStyle,
	type TLArrowShapeProps,
} from './shapes/TLArrowShape'
export {
	createShapeValidator,
	parentIdValidator,
	shapeIdValidator,
	type TLBaseShape,
} from './shapes/TLBaseShape'
export {
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	type TLBookmarkShape,
	type TLBookmarkShapeProps,
} from './shapes/TLBookmarkShape'
export {
	drawShapeMigrations,
	drawShapeProps,
	type TLDrawShape,
	type TLDrawShapeProps,
	type TLDrawShapeSegment,
} from './shapes/TLDrawShape'
export {
	embedShapeMigrations,
	embedShapeProps,
	type TLEmbedShape,
	type TLEmbedShapeProps,
} from './shapes/TLEmbedShape'
export {
	frameShapeMigrations,
	frameShapeProps,
	type TLFrameShape,
	type TLFrameShapeProps,
} from './shapes/TLFrameShape'
export {
	GeoShapeGeoStyle,
	geoShapeMigrations,
	geoShapeProps,
	type TLGeoShape,
	type TLGeoShapeGeoStyle,
	type TLGeoShapeProps,
} from './shapes/TLGeoShape'
export {
	groupShapeMigrations,
	groupShapeProps,
	type TLGroupShape,
	type TLGroupShapeProps,
} from './shapes/TLGroupShape'
export {
	highlightShapeMigrations,
	highlightShapeProps,
	type TLHighlightShape,
	type TLHighlightShapeProps,
} from './shapes/TLHighlightShape'
export {
	ImageShapeCrop,
	imageShapeMigrations,
	imageShapeProps,
	type TLImageShape,
	type TLImageShapeCrop,
	type TLImageShapeProps,
} from './shapes/TLImageShape'
export {
	LineShapeSplineStyle,
	lineShapeMigrations,
	lineShapeProps,
	type TLLineShape,
	type TLLineShapePoint,
	type TLLineShapeProps,
	type TLLineShapeSplineStyle,
} from './shapes/TLLineShape'
export {
	noteShapeMigrations,
	noteShapeProps,
	type TLNoteShape,
	type TLNoteShapeProps,
} from './shapes/TLNoteShape'
export {
	textShapeMigrations,
	textShapeProps,
	type TLTextShape,
	type TLTextShapeProps,
} from './shapes/TLTextShape'
export {
	videoShapeMigrations,
	videoShapeProps,
	type TLVideoShape,
	type TLVideoShapeProps,
} from './shapes/TLVideoShape'
export { EnumStyleProp, StyleProp, type StylePropValue } from './styles/StyleProp'
export {
	DefaultColorStyle,
	DefaultColorThemePalette,
	defaultColorNames,
	getDefaultColorTheme,
	type TLDefaultColorStyle,
	type TLDefaultColorTheme,
	type TLDefaultColorThemeColor,
} from './styles/TLColorStyle'
export { DefaultDashStyle, type TLDefaultDashStyle } from './styles/TLDashStyle'
export { DefaultFillStyle, type TLDefaultFillStyle } from './styles/TLFillStyle'
export {
	DefaultFontFamilies,
	DefaultFontStyle,
	type TLDefaultFontStyle,
} from './styles/TLFontStyle'
export {
	DefaultHorizontalAlignStyle,
	type TLDefaultHorizontalAlignStyle,
} from './styles/TLHorizontalAlignStyle'
export { DefaultSizeStyle, type TLDefaultSizeStyle } from './styles/TLSizeStyle'
export { DefaultTextAlignStyle, type TLDefaultTextAlignStyle } from './styles/TLTextAlignStyle'
export {
	DefaultVerticalAlignStyle,
	type TLDefaultVerticalAlignStyle,
} from './styles/TLVerticalAlignStyle'
export {
	LANGUAGES,
	getDefaultTranslationLocale,
	type TLLanguage,
} from './translations/translations'
export { type SetValue } from './util-types'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
