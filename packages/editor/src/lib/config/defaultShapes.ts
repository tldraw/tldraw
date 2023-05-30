import {
	arrowShapeTypeMigrations,
	arrowShapeTypeValidator,
	bookmarkShapeTypeMigrations,
	bookmarkShapeTypeValidator,
	drawShapeTypeMigrations,
	drawShapeTypeValidator,
	embedShapeTypeMigrations,
	embedShapeTypeValidator,
	frameShapeTypeMigrations,
	frameShapeTypeValidator,
	geoShapeTypeMigrations,
	geoShapeTypeValidator,
	groupShapeTypeMigrations,
	groupShapeTypeValidator,
	imageShapeTypeMigrations,
	imageShapeTypeValidator,
	lineShapeTypeMigrations,
	lineShapeTypeValidator,
	noteShapeTypeMigrations,
	noteShapeTypeValidator,
	textShapeTypeMigrations,
	textShapeTypeValidator,
	videoShapeTypeMigrations,
	videoShapeTypeValidator,
} from '@tldraw/tlschema'
import { TLArrowUtil } from '../app/shapeutils/TLArrowUtil/TLArrowUtil'
import { TLBookmarkUtil } from '../app/shapeutils/TLBookmarkUtil/TLBookmarkUtil'
import { TLDrawUtil } from '../app/shapeutils/TLDrawUtil/TLDrawUtil'
import { TLEmbedUtil } from '../app/shapeutils/TLEmbedUtil/TLEmbedUtil'
import { TLFrameUtil } from '../app/shapeutils/TLFrameUtil/TLFrameUtil'
import { TLGeoUtil } from '../app/shapeutils/TLGeoUtil/TLGeoUtil'
import { TLGroupUtil } from '../app/shapeutils/TLGroupUtil/TLGroupUtil'
import { TLImageUtil } from '../app/shapeutils/TLImageUtil/TLImageUtil'
import { TLLineUtil } from '../app/shapeutils/TLLineUtil/TLLineUtil'
import { TLNoteUtil } from '../app/shapeutils/TLNoteUtil/TLNoteUtil'
import { TLTextUtil } from '../app/shapeutils/TLTextUtil/TLTextUtil'
import { TLVideoUtil } from '../app/shapeutils/TLVideoUtil/TLVideoUtil'
import { ShapeInfo } from './createTldrawEditorStore'

/** @public */
export const defaultShapes: Record<string, ShapeInfo> = {
	arrow: {
		util: TLArrowUtil,
		validator: arrowShapeTypeValidator,
		migrations: arrowShapeTypeMigrations,
	},
	bookmark: {
		util: TLBookmarkUtil,
		validator: bookmarkShapeTypeValidator,
		migrations: bookmarkShapeTypeMigrations,
	},
	draw: {
		util: TLDrawUtil,
		validator: drawShapeTypeValidator,
		migrations: drawShapeTypeMigrations,
	},
	embed: {
		util: TLEmbedUtil,
		validator: embedShapeTypeValidator,
		migrations: embedShapeTypeMigrations,
	},
	frame: {
		util: TLFrameUtil,
		validator: frameShapeTypeValidator,
		migrations: frameShapeTypeMigrations,
	},
	geo: {
		util: TLGeoUtil,
		validator: geoShapeTypeValidator,
		migrations: geoShapeTypeMigrations,
	},
	group: {
		util: TLGroupUtil,
		validator: groupShapeTypeValidator,
		migrations: groupShapeTypeMigrations,
	},
	image: {
		util: TLImageUtil,
		validator: imageShapeTypeValidator,
		migrations: imageShapeTypeMigrations,
	},
	line: {
		util: TLLineUtil,
		validator: lineShapeTypeValidator,
		migrations: lineShapeTypeMigrations,
	},
	note: {
		util: TLNoteUtil,
		validator: noteShapeTypeValidator,
		migrations: noteShapeTypeMigrations,
	},
	text: {
		util: TLTextUtil,
		validator: textShapeTypeValidator,
		migrations: textShapeTypeMigrations,
	},
	video: {
		util: TLVideoUtil,
		validator: videoShapeTypeValidator,
		migrations: videoShapeTypeMigrations,
	},
}
