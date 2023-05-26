export { type TLRecord } from './TLRecord'
export {
	createIntegrityChecker,
	onValidationFailure,
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './TLStore'
export { bookmarkAssetTypeMigrator, type TLBookmarkAsset } from './assets/TLBookmarkAsset'
export { imageAssetTypeMigrator, type TLImageAsset } from './assets/TLImageAsset'
export { videoAssetTypeMigrator, type TLVideoAsset } from './assets/TLVideoAsset'
export { createAssetValidator, type TLBaseAsset } from './assets/asset-validation'
export { createPresenceStateDerivation } from './createPresenceStateDerivation'
export { createTLSchema } from './createTLSchema'
export { defaultMigrators } from './defaultMigrators'
export { defaultSnapshotMigrator } from './defaultSnapshotMigrator'
export { defaultValidator } from './defaultValidator'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './fixup'
export { type Box2dModel, type Vec2dModel } from './geometry-types'
export {
	AssetRecordType,
	rootAssetTypeMigrator,
	type TLAsset,
	type TLAssetId,
	type TLAssetPartial,
	type TLAssetShape,
} from './records/TLAsset'
export {
	CameraRecordType,
	cameraTypeMigrator,
	type TLCamera,
	type TLCameraId,
} from './records/TLCamera'
export {
	DocumentRecordType,
	TLDOCUMENT_ID,
	documentTypeMigrator,
	type TLDocument,
} from './records/TLDocument'
export {
	InstanceRecordType,
	instanceTypeMigrator,
	type TLInstance,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './records/TLInstance'
export {
	InstancePageStateRecordType,
	instancePageStateTypeMigrator,
	type TLInstancePageState,
	type TLInstancePageStateId,
} from './records/TLInstancePageState'
export {
	InstancePresenceRecordType,
	instancePresenceTypeMigrator,
	type TLInstancePresence,
} from './records/TLInstancePresence'
export { PageRecordType, type TLPage, type TLPageId } from './records/TLPage'
export { TLPOINTER_ID, TLPointer, type TLPointerId } from './records/TLPointer'
export {
	createCustomShapeId,
	createShapeId,
	isShape,
	isShapeId,
	rootShapeTypeMigrator,
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
	userdocumentTypeMigrator,
	type TLUserDocument,
	type TLUserDocumentId,
} from './records/TLUserDocument'
export {
	TL_ARROW_TERMINAL_TYPE,
	arrowShapeTypeMigrator,
	arrowTerminalTypeValidator,
	type TLArrowHeadModel,
	type TLArrowShape,
	type TLArrowShapeProps,
	type TLArrowTerminal,
	type TLArrowTerminalType,
} from './shapes/TLArrowShape'
export {
	bookmarkShapeTypeMigrator,
	type TLBookmarkShape,
	type TLBookmarkShapeProps,
} from './shapes/TLBookmarkShape'
export {
	TL_DRAW_SHAPE_SEGMENT_TYPE,
	drawShapeTypeMigrator,
	type TLDrawShape,
	type TLDrawShapeProps,
	type TLDrawShapeSegment,
} from './shapes/TLDrawShape'
export {
	EMBED_DEFINITIONS,
	embedShapeTypeMigrator,
	tlEmbedShapePermissionDefaults,
	type EmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapePermissionName,
	type TLEmbedShapePermissions,
	type TLEmbedShapeProps,
} from './shapes/TLEmbedShape'
export {
	frameShapeTypeMigrator,
	type TLFrameShape,
	type TLFrameShapeProps,
} from './shapes/TLFrameShape'
export { geoShapeTypeMigrator, type TLGeoShape, type TLGeoShapeProps } from './shapes/TLGeoShape'
export {
	groupShapeTypeMigrator,
	type TLGroupShape,
	type TLGroupShapeProps,
} from './shapes/TLGroupShape'
export {
	iconShapeTypeMigrator,
	type TLIconShape,
	type TLIconShapeProps,
} from './shapes/TLIconShape'
export {
	imageShapeTypeMigrator,
	type TLImageCrop,
	type TLImageShape,
	type TLImageShapeProps,
} from './shapes/TLImageShape'
export {
	lineShapeTypeMigrator,
	type TLLineShape,
	type TLLineShapeProps,
} from './shapes/TLLineShape'
export {
	noteShapeTypeMigrator,
	type TLNoteShape,
	type TLNoteShapeProps,
} from './shapes/TLNoteShape'
export {
	textShapeTypeMigrator,
	type TLTextShape,
	type TLTextShapeProps,
} from './shapes/TLTextShape'
export {
	videoShapeTypeMigrator,
	type TLVideoShape,
	type TLVideoShapeProps,
} from './shapes/TLVideoShape'
export { createShapeValidator, type TLBaseShape } from './shapes/shape-validation'
export {
	TL_ALIGN_TYPES,
	TL_ARROWHEAD_TYPES,
	TL_COLOR_TYPES,
	TL_DASH_TYPES,
	TL_FILL_TYPES,
	TL_FONT_TYPES,
	TL_GEO_TYPES,
	TL_ICON_TYPES,
	TL_OPACITY_TYPES,
	TL_SIZE_TYPES,
	TL_SPLINE_TYPES,
	TL_STYLE_TYPES,
	type TLAlignStyle,
	type TLAlignType,
	type TLArrowheadEndStyle,
	type TLArrowheadStartStyle,
	type TLArrowheadType,
	type TLBaseStyle,
	type TLColorStyle,
	type TLColorType,
	type TLDashStyle,
	type TLDashType,
	type TLFillStyle,
	type TLFillType,
	type TLFontStyle,
	type TLFontType,
	type TLGeoStyle,
	type TLGeoType,
	type TLIconStyle,
	type TLIconType,
	type TLOpacityStyle,
	type TLOpacityType,
	type TLSizeStyle,
	type TLSizeType,
	type TLSplineType,
	type TLSplineTypeStyle,
	type TLStyleCollections,
	type TLStyleItem,
	type TLStyleProps,
	type TLStyleType,
	type TLVerticalAlignType,
} from './style-types'
export { getDefaultTranslationLocale } from './translations'
export {
	TL_CURSOR_TYPES,
	TL_HANDLE_TYPES,
	TL_SCRIBBLE_STATES,
	TL_UI_COLOR_TYPES,
	cursorTypeValidator,
	cursorValidator,
	handleTypeValidator,
	uiColorTypeValidator,
	type TLCursor,
	type TLCursorType,
	type TLHandle,
	type TLHandlePartial,
	type TLHandleType,
	type TLScribble,
	type TLUiColorType,
} from './ui-types'
export { type SetValue, type SmooshedUnionObject } from './util-types'
export {
	alignValidator,
	arrowheadValidator,
	assetIdValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	iconValidator,
	idValidator,
	instanceIdValidator,
	opacityValidator,
	pageIdValidator,
	parentIdValidator,
	shapeIdValidator,
	sizeValidator,
	splineValidator,
} from './validation'
