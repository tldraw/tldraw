export {
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './TLStore'
export { assetIdValidator, createAssetValidator, type TLBaseAsset } from './assets/TLBaseAsset'
export { type TLBookmarkAsset } from './assets/TLBookmarkAsset'
export { type TLImageAsset } from './assets/TLImageAsset'
export { type TLVideoAsset } from './assets/TLVideoAsset'
export { createPresenceStateDerivation } from './createPresenceStateDerivation'
export { createTLSchema } from './createTLSchema'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './fixup'
export { TL_COLOR_TYPES, colorTypeValidator, type TLColor } from './misc/TLColor'
export { type TLCursor, type TLCursorType } from './misc/TLCursor'
export { type TLHandle, type TLHandleType } from './misc/TLHandle'
export { scribbleValidator, type TLScribble } from './misc/TLScribble'
export { type Box2dModel, type Vec2dModel } from './misc/geometry-types'
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
export { CameraRecordType, type TLCamera, type TLCameraId } from './records/TLCamera'
export { DocumentRecordType, TLDOCUMENT_ID, type TLDocument } from './records/TLDocument'
export {
	InstanceRecordType,
	TLINSTANCE_ID,
	instanceTypeValidator,
	type TLInstance,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './records/TLInstance'
export {
	PageRecordType,
	isPageId,
	pageIdValidator,
	type TLPage,
	type TLPageId,
} from './records/TLPage'
export { InstancePageStateRecordType, type TLInstancePageState } from './records/TLPageState'
export { PointerRecordType, TLPOINTER_ID } from './records/TLPointer'
export { InstancePresenceRecordType, type TLInstancePresence } from './records/TLPresence'
export { type TLRecord } from './records/TLRecord'
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
} from './records/TLShape'
export {
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
export { type TLBookmarkShape } from './shapes/TLBookmarkShape'
export { type TLDrawShape, type TLDrawShapeSegment } from './shapes/TLDrawShape'
export {
	EMBED_DEFINITIONS,
	embedShapePermissionDefaults,
	type EmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapePermissions,
} from './shapes/TLEmbedShape'
export { type TLFrameShape } from './shapes/TLFrameShape'
export { type TLGeoShape } from './shapes/TLGeoShape'
export { type TLGroupShape } from './shapes/TLGroupShape'
export { type TLHighlightShape } from './shapes/TLHighlightShape'
export { type TLIconShape } from './shapes/TLIconShape'
export { type TLImageCrop, type TLImageShape, type TLImageShapeProps } from './shapes/TLImageShape'
export { type TLLineShape } from './shapes/TLLineShape'
export { type TLNoteShape } from './shapes/TLNoteShape'
export { type TLTextShape, type TLTextShapeProps } from './shapes/TLTextShape'
export { type TLVideoShape } from './shapes/TLVideoShape'
export {
	TL_ALIGN_TYPES,
	alignValidator,
	type TLAlignStyle,
	type TLAlignType,
} from './styles/TLAlignStyle'
export {
	TL_ARROWHEAD_TYPES,
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
} from './styles/TLArrowheadStyle'
export { TL_STYLE_TYPES, type TLStyleType } from './styles/TLBaseStyle'
export { colorValidator, type TLColorStyle, type TLColorType } from './styles/TLColorStyle'
export {
	TL_DASH_TYPES,
	dashValidator,
	type TLDashStyle,
	type TLDashType,
} from './styles/TLDashStyle'
export {
	TL_FILL_TYPES,
	fillValidator,
	type TLFillStyle,
	type TLFillType,
} from './styles/TLFillStyle'
export {
	TL_FONT_TYPES,
	fontValidator,
	type TLFontStyle,
	type TLFontType,
} from './styles/TLFontStyle'
export { TL_GEO_TYPES, geoValidator, type TLGeoStyle, type TLGeoType } from './styles/TLGeoStyle'
export { iconValidator, type TLIconStyle, type TLIconType } from './styles/TLIconStyle'
export { opacityValidator, type TLOpacityType } from './styles/TLOpacityStyle'
export {
	TL_SIZE_TYPES,
	sizeValidator,
	type TLSizeStyle,
	type TLSizeType,
} from './styles/TLSizeStyle'
export {
	TL_SPLINE_TYPES,
	splineValidator,
	type TLSplineStyle,
	type TLSplineType,
} from './styles/TLSplineStyle'
export { verticalAlignValidator, type TLVerticalAlignType } from './styles/TLVerticalAlignStyle'
export { type TLStyleCollections, type TLStyleItem, type TLStyleProps } from './styles/style-types'
export {
	LANGUAGES,
	getDefaultTranslationLocale,
	type TLLanguage,
} from './translations/translations'
