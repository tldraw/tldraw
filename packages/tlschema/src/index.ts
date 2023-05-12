export { type TLRecord } from './TLRecord'
export {
	USER_COLORS,
	createIntegrityChecker,
	onValidationFailure,
	type TLStore,
	type TLStoreProps,
	type TLStoreSchema,
	type TLStoreSnapshot,
} from './TLStore'
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
export { createAssetValidator, type TLBaseAsset } from './assets/asset-validation'
export { createTLSchema } from './createTLSchema'
export type { CustomShapeTypeInfo } from './createTLSchema'
export { defaultDerivePresenceState } from './defaultDerivePresenceState'
export { CLIENT_FIXUP_SCRIPT, fixupRecord } from './fixup'
export { type Box2dModel, type Vec2dModel } from './geometry-types'
export {
	TLAsset,
	assetTypeMigrations,
	assetTypeValidator,
	type TLAssetId,
	type TLAssetPartial,
	type TLAssetShape,
} from './records/TLAsset'
export {
	TLCamera,
	cameraTypeMigrations,
	cameraTypeValidator,
	type TLCameraId,
} from './records/TLCamera'
export {
	TLDOCUMENT_ID,
	TLDocument,
	documentTypeMigrations,
	documentTypeValidator,
} from './records/TLDocument'
export {
	TLInstance,
	instanceTypeMigrations,
	instanceTypeValidator,
	type TLInstanceId,
	type TLInstancePropsForNextShape,
} from './records/TLInstance'
export {
	TLInstancePageState,
	instancePageStateMigrations,
	instancePageStateTypeValidator,
	type TLInstancePageStateId,
} from './records/TLInstancePageState'
export { TLInstancePresence } from './records/TLInstancePresence'
export { TLPage, pageTypeMigrations, pageTypeValidator, type TLPageId } from './records/TLPage'
export {
	createCustomShapeId,
	createShapeId,
	isShape,
	isShapeId,
	rootShapeTypeMigrations,
	type TLNullableShapeProps,
	type TLParentId,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
	type TLShapeProp,
	type TLShapeProps,
	type TLShapeType,
	type TLUnknownShape,
} from './records/TLShape'
export { TLUser, userTypeMigrations, userTypeValidator, type TLUserId } from './records/TLUser'
export {
	TLUserDocument,
	userDocumentTypeMigrations,
	userDocumentTypeValidator,
	type TLUserDocumentId,
} from './records/TLUserDocument'
export {
	TLUserPresence,
	userPresenceTypeMigrations,
	userPresenceTypeValidator,
	type TLUserPresenceId,
} from './records/TLUserPresence'
export { storeMigrations } from './schema'
export {
	TL_ARROW_TERMINAL_TYPE,
	arrowShapeMigrations,
	arrowShapeTypeValidator,
	arrowTerminalTypeValidator,
	type TLArrowHeadModel,
	type TLArrowShape,
	type TLArrowShapeProps,
	type TLArrowTerminal,
	type TLArrowTerminalType,
} from './shapes/TLArrowShape'
export {
	bookmarkShapeMigrations,
	bookmarkShapeTypeValidator,
	type TLBookmarkShape,
	type TLBookmarkShapeProps,
} from './shapes/TLBookmarkShape'
export {
	TL_DRAW_SHAPE_SEGMENT_TYPE,
	drawShapeMigrations,
	drawShapeTypeValidator,
	type TLDrawShape,
	type TLDrawShapeProps,
	type TLDrawShapeSegment,
} from './shapes/TLDrawShape'
export {
	EMBED_DEFINITIONS,
	embedShapeMigrations,
	embedShapeTypeValidator,
	tlEmbedShapePermissionDefaults,
	type EmbedDefinition,
	type TLEmbedShape,
	type TLEmbedShapePermissionName,
	type TLEmbedShapePermissions,
	type TLEmbedShapeProps,
} from './shapes/TLEmbedShape'
export {
	frameShapeMigrations,
	frameShapeTypeValidator,
	type TLFrameShape,
	type TLFrameShapeProps,
} from './shapes/TLFrameShape'
export {
	geoShapeMigrations,
	geoShapeTypeValidator,
	type TLGeoShape,
	type TLGeoShapeProps,
} from './shapes/TLGeoShape'
export {
	groupShapeMigrations,
	groupShapeTypeValidator,
	type TLGroupShape,
	type TLGroupShapeProps,
} from './shapes/TLGroupShape'
export {
	iconShapeMigrations,
	iconShapeTypeValidator,
	type TLIconShape,
	type TLIconShapeProps,
} from './shapes/TLIconShape'
export {
	imageShapeMigrations,
	imageShapeTypeValidator,
	type TLImageCrop,
	type TLImageShape,
	type TLImageShapeProps,
} from './shapes/TLImageShape'
export {
	lineShapeMigrations,
	lineShapeTypeValidator,
	type TLLineShape,
	type TLLineShapeProps,
} from './shapes/TLLineShape'
export {
	noteShapeMigrations,
	noteShapeTypeValidator,
	type TLNoteShape,
	type TLNoteShapeProps,
} from './shapes/TLNoteShape'
export {
	textShapeMigrations,
	textShapeTypeValidator,
	type TLTextShape,
	type TLTextShapeProps,
} from './shapes/TLTextShape'
export {
	videoShapeMigrations,
	videoShapeTypeValidator,
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
} from './style-types'
export {
	TL_CURSOR_TYPES,
	TL_HANDLE_TYPES,
	TL_SCRIBBLE_STATES,
	TL_UI_COLOR_TYPES,
	cursorTypeValidator,
	cursorValidator,
	handleTypeValidator,
	scribbleTypeValidator,
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
	userIdValidator,
} from './validation'
