export { type TLRecord } from './TLRecord'
export {
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
export { createTLSchema } from './createTLSchema'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './fixup'
export { colorTypeValidator, type TLColor } from './misc/TLColor'
export { type TLCursor, type TLCursorType } from './misc/TLCursor'
export { type TLHandle, type TLHandlePartial, type TLHandleType } from './misc/TLHandle'
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
export { CameraRecordType, type TLCamera, type TLCameraId } from './records/TLCamera'
export { DocumentRecordType, TLDOCUMENT_ID, type TLDocument } from './records/TLDocument'
export {
	InstanceRecordType,
	instanceTypeValidator,
	type TLInstance,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './records/TLInstance'
export { PageRecordType, isPageId, type TLPage, type TLPageId } from './records/TLPage'
export { InstancePageStateRecordType, type TLInstancePageState } from './records/TLPageState'
export { PointerRecordType, TLPOINTER_ID } from './records/TLPointer'
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
export { UserDocumentRecordType, type TLUserDocument } from './records/TLUserDocument'
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
} from './shapes/TLBookmarkShape'
export {
	drawShapeTypeMigrations,
	drawShapeTypeValidator,
	type TLDrawShape,
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
} from './shapes/TLEmbedShape'
export {
	frameShapeTypeMigrations,
	frameShapeTypeValidator,
	type TLFrameShape,
} from './shapes/TLFrameShape'
export { geoShapeTypeMigrations, geoShapeTypeValidator, type TLGeoShape } from './shapes/TLGeoShape'
export {
	groupShapeTypeMigrations,
	groupShapeTypeValidator,
	type TLGroupShape,
} from './shapes/TLGroupShape'
export {
	highlightShapeTypeMigrations,
	highlightShapeTypeValidator,
	type TLHighlightShape,
} from './shapes/TLHighlightShape'
export {
	iconShapeTypeMigrations,
	iconShapeTypeValidator,
	type TLIconShape,
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
} from './shapes/TLLineShape'
export {
	noteShapeTypeMigrations,
	noteShapeTypeValidator,
	type TLNoteShape,
} from './shapes/TLNoteShape'
export {
	textShapeTypeMigrations,
	textShapeTypeValidator,
	type TLTextShape,
} from './shapes/TLTextShape'
export {
	videoShapeTypeMigrations,
	videoShapeTypeValidator,
	type TLVideoShape,
} from './shapes/TLVideoShape'
export { storeMigrations } from './store-migrations'
export { alignValidator, type TLAlignStyle, type TLAlignType } from './styles/TLAlignStyle'
export {
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
} from './styles/TLArrowheadStyle'
export { TL_STYLE_TYPES, type TLStyleType } from './styles/TLBaseStyle'
export { type TLColorStyle, type TLColorType } from './styles/TLColorStyle'
export { type TLDashStyle, type TLDashType } from './styles/TLDashStyle'
export { type TLFillStyle, type TLFillType } from './styles/TLFillStyle'
export { type TLFontStyle, type TLFontType } from './styles/TLFontStyle'
export { TL_GEO_TYPES, type TLGeoStyle, type TLGeoType } from './styles/TLGeoStyle'
export { type TLIconStyle, type TLIconType } from './styles/TLIconStyle'
export { type TLOpacityStyle, type TLOpacityType } from './styles/TLOpacityStyle'
export { type TLSizeStyle, type TLSizeType } from './styles/TLSizeStyle'
export { type TLSplineStyle, type TLSplineType } from './styles/TLSplineStyle'
export { type TLVerticalAlignType } from './styles/TLVerticalAlignStyle'
export { type TLStyleCollections, type TLStyleItem, type TLStyleProps } from './styles/style-types'
export {
	LANGUAGES,
	getDefaultTranslationLocale,
	type TLLanguage,
} from './translations/translations'
