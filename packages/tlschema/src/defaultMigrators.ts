import { Migrator } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'
import { bookmarkAssetTypeMigrator } from './assets/TLBookmarkAsset'
import { imageAssetTypeMigrator } from './assets/TLImageAsset'
import { videoAssetTypeMigrator } from './assets/TLVideoAsset'
import { rootAssetTypeMigrator } from './records/TLAsset'
import { cameraTypeMigrator } from './records/TLCamera'
import { documentTypeMigrator } from './records/TLDocument'
import { instanceTypeMigrator } from './records/TLInstance'
import { instancePageStateTypeMigrator } from './records/TLInstancePageState'
import { instancePresenceTypeMigrator } from './records/TLInstancePresence'
import { pageTypeMigrator } from './records/TLPage'
import { pointerTypeMigrator } from './records/TLPointer'
import { rootShapeTypeMigrator } from './records/TLShape'
import { userdocumentTypeMigrator } from './records/TLUserDocument'
import { arrowShapeTypeMigrator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrator } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrator } from './shapes/TLDrawShape'
import { embedShapeTypeMigrator } from './shapes/TLEmbedShape'
import { frameShapeTypeMigrator } from './shapes/TLFrameShape'
import { geoShapeTypeMigrator } from './shapes/TLGeoShape'
import { groupShapeTypeMigrator } from './shapes/TLGroupShape'
import { imageShapeTypeMigrator } from './shapes/TLImageShape'
import { lineShapeTypeMigrator } from './shapes/TLLineShape'
import { noteShapeTypeMigrator } from './shapes/TLNoteShape'
import { textShapeTypeMigrator } from './shapes/TLTextShape'
import { videoShapeTypeMigrator } from './shapes/TLVideoShape'

/** @public */
export const defaultMigrators: { [K in TLRecord['typeName']]: Migrator } = {
	pointer: pointerTypeMigrator,
	document: documentTypeMigrator,
	page: pageTypeMigrator,
	camera: cameraTypeMigrator,
	instance: instanceTypeMigrator,
	instance_presence: instancePresenceTypeMigrator,
	instance_page_state: instancePageStateTypeMigrator,
	user_document: userdocumentTypeMigrator,
	asset: rootAssetTypeMigrator.withSubTypeMigrators('type', {
		image: imageAssetTypeMigrator,
		video: videoAssetTypeMigrator,
		bookmark: bookmarkAssetTypeMigrator,
	}),
	shape: rootShapeTypeMigrator.withSubTypeMigrators('type', {
		arrow: arrowShapeTypeMigrator,
		bookmark: bookmarkShapeTypeMigrator,
		draw: drawShapeTypeMigrator,
		embed: embedShapeTypeMigrator,
		frame: frameShapeTypeMigrator,
		geo: geoShapeTypeMigrator,
		group: groupShapeTypeMigrator,
		image: imageShapeTypeMigrator,
		line: lineShapeTypeMigrator,
		note: noteShapeTypeMigrator,
		text: textShapeTypeMigrator,
		video: videoShapeTypeMigrator,
	}),
}
