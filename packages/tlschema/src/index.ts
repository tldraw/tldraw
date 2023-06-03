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
export { colorTypeValidator, type TLColor } from './misc/TLColor'
export {
	cursorTypeValidator,
	cursorValidator,
	type TLCursor,
	type TLCursorType,
} from './misc/TLCursor'
export {
	handleTypeValidator,
	type TLHandle,
	type TLHandlePartial,
	type TLHandleType,
} from './misc/TLHandle'
export { scribbleTypeValidator, type TLScribble } from './misc/TLScribble'
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
export { alignValidator, type TLAlignStyle, type TLAlignType } from './styles/TLAlignStyle'
export {
	arrowheadValidator,
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
} from './styles/TLArrowheadStyle'
export { TL_STYLE_TYPES, type TLStyleType } from './styles/TLBaseStyle'
export { colorValidator, type TLColorStyle, type TLColorType } from './styles/TLColorStyle'
export { dashValidator, type TLDashStyle, type TLDashType } from './styles/TLDashStyle'
export { fillValidator, type TLFillStyle, type TLFillType } from './styles/TLFillStyle'
export { fontValidator, type TLFontStyle, type TLFontType } from './styles/TLFontStyle'
export { geoValidator, type TLGeoStyle, type TLGeoType } from './styles/TLGeoStyle'
export { iconValidator, type TLIconStyle, type TLIconType } from './styles/TLIconStyle'
export { opacityValidator, type TLOpacityStyle, type TLOpacityType } from './styles/TLOpacityStyle'
export { sizeValidator, type TLSizeStyle, type TLSizeType } from './styles/TLSizeStyle'
export { splineValidator, type TLSplineStyle, type TLSplineType } from './styles/TLSplineStyle'
export { type TLVerticalAlignType } from './styles/TLVerticalAlignStyle'
export { type TLStyleCollections, type TLStyleItem, type TLStyleProps } from './styles/style-types'
export {
	LANGUAGES,
	getDefaultTranslationLocale,
	type TLLanguage,
} from './translations/translations'
