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
	highlightShapeTypeMigrations,
	highlightShapeTypeValidator,
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
import { TLHighlightUtil } from '../app/shapeutils/TLHighlightUtil/TLHighlightUtil'
import { TLImageUtil } from '../app/shapeutils/TLImageUtil/TLImageUtil'
import { TLLineUtil } from '../app/shapeutils/TLLineUtil/TLLineUtil'
import { TLNoteUtil } from '../app/shapeutils/TLNoteUtil/TLNoteUtil'
import { TLTextUtil } from '../app/shapeutils/TLTextUtil/TLTextUtil'
import { TLVideoUtil } from '../app/shapeutils/TLVideoUtil/TLVideoUtil'
import { ShapeInfo } from './createTLStore'

/** @public */
export const coreShapes: Record<string, ShapeInfo> = {
	// created by grouping interactions, probably the corest core shape that we have
	group: {
		util: TLGroupUtil,
		validator: groupShapeTypeValidator,
		migrations: groupShapeTypeMigrations,
	},
	// created by embed menu / url drop
	embed: {
		util: TLEmbedUtil,
		validator: embedShapeTypeValidator,
		migrations: embedShapeTypeMigrations,
	},
	// created by copy and paste / url drop
	bookmark: {
		util: TLBookmarkUtil,
		validator: bookmarkShapeTypeValidator,
		migrations: bookmarkShapeTypeMigrations,
	},
	// created by copy and paste / file drop
	image: {
		util: TLImageUtil,
		validator: imageShapeTypeValidator,
		migrations: imageShapeTypeMigrations,
	},
	// created by copy and paste / file drop
	video: {
		util: TLVideoUtil,
		validator: videoShapeTypeValidator,
		migrations: videoShapeTypeMigrations,
	},
	// created by copy and paste
	text: {
		util: TLTextUtil,
		validator: textShapeTypeValidator,
		migrations: textShapeTypeMigrations,
	},
}

/** @public */
export const defaultShapes: Record<string, ShapeInfo> = {
	draw: {
		util: TLDrawUtil,
		validator: drawShapeTypeValidator,
		migrations: drawShapeTypeMigrations,
	},
	geo: {
		util: TLGeoUtil,
		validator: geoShapeTypeValidator,
		migrations: geoShapeTypeMigrations,
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
	frame: {
		util: TLFrameUtil,
		validator: frameShapeTypeValidator,
		migrations: frameShapeTypeMigrations,
	},
	arrow: {
		util: TLArrowUtil,
		validator: arrowShapeTypeValidator,
		migrations: arrowShapeTypeMigrations,
	},
	highlight: {
		util: TLHighlightUtil,
		validator: highlightShapeTypeValidator,
		migrations: highlightShapeTypeMigrations,
	},
}
