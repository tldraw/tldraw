export { type TLRecord } from './TLRecord'
export {
	createIntegrityChecker,
	onValidationFailure,
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './TLStore'
export { createAssetValidator, type TLBaseAsset } from './assets/TLBaseAsset'
export {
	bookmarkAssetMigrations,
	bookmarkAssetTypeValidator,
	type TLBookmarkAsset,
} from './assets/TLBookmarkAsset'
export {
	imageAssetMigrations,
	imageAssetTypeValidator,
	type TLImageAsset,
} from './assets/TLImageAsset'
export {
	videoAssetMigrations,
	videoAssetTypeValidator,
	type TLVideoAsset,
} from './assets/TLVideoAsset'
export { createPresenceStateDerivation } from './createPresenceStateDerivation'
export { createTLSchema, type SchemaShapeInfo } from './createTLSchema'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './fixup'
export { TL_COLOR_TYPES, uiColorTypeValidator, type TLColor } from './misc/TLColor'
export {
	TL_CURSOR_TYPES,
	cursorTypeValidator,
	cursorValidator,
	type TLCursor,
	type TLCursorType,
} from './misc/TLCursor'
export {
	TL_HANDLE_TYPES,
	handleTypeValidator,
	type TLHandle,
	type TLHandlePartial,
	type TLHandleType,
} from './misc/TLHandle'
export { TL_SCRIBBLE_STATES, scribbleTypeValidator, type TLScribble } from './misc/TLScribble'
export { type Box2dModel, type Vec2dModel } from './misc/geometry-types'
export { idValidator } from './misc/id-validator'
export {
	AssetRecordType,
	assetIdValidator,
	assetTypeMigrations,
	assetTypeValidator,
	type TLAsset,
	type TLAssetId,
	type TLAssetPartial,
	type TLAssetShape,
} from './records/TLAsset'
export {
	CameraRecordType,
	cameraTypeValidator,
	type TLCamera,
	type TLCameraId,
} from './records/TLCamera'
export {
	DocumentRecordType,
	TLDOCUMENT_ID,
	documentTypeValidator,
	type TLDocument,
} from './records/TLDocument'
export {
	InstanceRecordType,
	instanceIdValidator,
	instanceTypeMigrations,
	instanceTypeValidator,
	type TLInstance,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './records/TLInstance'
export {
	PageRecordType,
	isPageId,
	pageIdValidator,
	pageTypeValidator,
	type TLPage,
	type TLPageId,
} from './records/TLPage'
export {
	InstancePageStateRecordType,
	instancePageStateMigrations,
	instancePageStateTypeValidator,
	type TLInstancePageState,
	type TLInstancePageStateId,
} from './records/TLPageState'
export {
	PointerRecordType,
	TLPOINTER_ID,
	pointerTypeValidator,
	type TLPointer,
	type TLPointerId,
} from './records/TLPointer'
export { InstancePresenceRecordType, type TLInstancePresence } from './records/TLPresence'
export {
	createShapeId,
	isShape,
	isShapeId,
	rootShapeTypeMigrations,
	type TLDefaultShape,
	type TLNullableShapeProps,
	type TLParentId,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
	type TLShapeProp,
	type TLShapeProps,
	type TLUnknownShape,
} from './records/TLShape'
export {
	UserDocumentRecordType,
	userDocumentTypeMigrations,
	userDocumentTypeValidator,
	type TLUserDocument,
	type TLUserDocumentId,
} from './records/TLUserDocument'
export {
	TL_ARROW_TERMINAL_TYPE,
	arrowShapeTypeMigrations,
	arrowShapeTypeValidator,
	arrowTerminalTypeValidator,
	type TLArrowHeadModel,
	type TLArrowShape,
	type TLArrowShapeProps,
	type TLArrowTerminal,
	type TLArrowTerminalType,
} from './shapes/TLArrowShape'
export {
	createShapeValidator,
	parentIdValidator,
	shapeIdValidator,
	type TLBaseShape,
} from './shapes/TLBaseShape'
export {
	bookmarkShapeTypeMigrations,
	bookmarkShapeTypeValidator,
	type TLBookmarkShape,
	type TLBookmarkShapeProps,
} from './shapes/TLBookmarkShape'
export {
	TL_DRAW_SHAPE_SEGMENT_TYPE,
	drawShapeTypeMigrations,
	drawShapeTypeValidator,
	type TLDrawShape,
	type TLDrawShapeProps,
	type TLDrawShapeSegment,
} from './shapes/TLDrawShape'
export {
	EMBED_DEFINITIONS,
	embedShapeTypeMigrations,
	embedShapeTypeValidator,
	tlEmbedShapePermissionDefaults,
	type EmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapePermissionName,
	type TLEmbedShapePermissions,
	type TLEmbedShapeProps,
} from './shapes/TLEmbedShape'
export {
	frameShapeTypeMigrations,
	frameShapeTypeValidator,
	type TLFrameShape,
	type TLFrameShapeProps,
} from './shapes/TLFrameShape'
export {
	geoShapeTypeMigrations,
	geoShapeTypeValidator,
	type TLGeoShape,
	type TLGeoShapeProps,
} from './shapes/TLGeoShape'
export {
	groupShapeTypeMigrations,
	groupShapeTypeValidator,
	type TLGroupShape,
	type TLGroupShapeProps,
} from './shapes/TLGroupShape'
export {
	highlightShapeTypeMigrations,
	highlightShapeTypeValidator,
	type TLHighlightShape,
	type TLHighlightShapeProps,
} from './shapes/TLHighlightShape'
export {
	iconShapeTypeMigrations,
	iconShapeTypeValidator,
	type TLIconShape,
	type TLIconShapeProps,
} from './shapes/TLIconShape'
export {
	imageShapeTypeMigrations,
	imageShapeTypeValidator,
	type TLImageCrop,
	type TLImageShape,
	type TLImageShapeProps,
} from './shapes/TLImageShape'
export {
	lineShapeTypeMigrations,
	lineShapeTypeValidator,
	type TLLineShape,
	type TLLineShapeProps,
} from './shapes/TLLineShape'
export {
	noteShapeTypeMigrations,
	noteShapeTypeValidator,
	type TLNoteShape,
	type TLNoteShapeProps,
} from './shapes/TLNoteShape'
export {
	textShapeTypeMigrations,
	textShapeTypeValidator,
	type TLTextShape,
	type TLTextShapeProps,
} from './shapes/TLTextShape'
export {
	videoShapeTypeMigrations,
	videoShapeTypeValidator,
	type TLVideoShape,
	type TLVideoShapeProps,
} from './shapes/TLVideoShape'
export { storeMigrations } from './store-migrations'
export { TL_ALIGN_TYPES, alignValidator, type TLAlignStyle, type TLAlignType } from './styles/align'
export {
	TL_ARROWHEAD_TYPES,
	arrowheadValidator,
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
} from './styles/arrowhead'
export { TL_STYLE_TYPES, type TLBaseStyle, type TLStyleType } from './styles/base-style'
export { colorValidator, type TLColorStyle, type TLColorType } from './styles/color'
export { TL_DASH_TYPES, dashValidator, type TLDashStyle, type TLDashType } from './styles/dash'
export { TL_FILL_TYPES, fillValidator, type TLFillStyle, type TLFillType } from './styles/fill'
export { TL_FONT_TYPES, fontValidator, type TLFontStyle, type TLFontType } from './styles/font'
export { TL_GEO_TYPES, geoValidator, type TLGeoStyle, type TLGeoType } from './styles/geo'
export { TL_ICON_TYPES, iconValidator, type TLIconStyle, type TLIconType } from './styles/icon'
export {
	TL_OPACITY_TYPES,
	opacityValidator,
	type TLOpacityStyle,
	type TLOpacityType,
} from './styles/opacity'
export { TL_SIZE_TYPES, sizeValidator, type TLSizeStyle, type TLSizeType } from './styles/size'
export {
	TL_SPLINE_TYPES,
	splineValidator,
	type TLSplineType,
	type TLSplineTypeStyle,
} from './styles/spline'
export { type TLStyleCollections, type TLStyleItem, type TLStyleProps } from './styles/style-types'
export { type TLVerticalAlignType } from './styles/vertical-align'
export { getDefaultTranslationLocale } from './translations/translations'
export { type SetValue, type SmooshedUnionObject } from './util-types'

// TL_ALIGN_TYPES
// TL_COLOR_TYPES
// TL_DASH_TYPES
// TL_FILL_TYPES
// TL_FONT_TYPES
// TL_OPACITY_TYPES
// TL_SIZE_TYPES
// TL_STYLE_TYPES
// alignValidator
// colorValidator
// dashValidator
// fillValidator
// fontValidator
// geoValidator
// opacityValidator
// sizeValidator
