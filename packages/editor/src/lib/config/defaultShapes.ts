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
	},
	// created by embed menu / url drop
	embed: {
		util: TLEmbedUtil,
	},
	// created by copy and paste / url drop
	bookmark: {
		util: TLBookmarkUtil,
	},
	// created by copy and paste / file drop
	image: {
		util: TLImageUtil,
	},
	// created by copy and paste / file drop
	video: {
		util: TLVideoUtil,
	},
	// created by copy and paste
	text: {
		util: TLTextUtil,
	},
}

/** @public */
export const defaultShapes: Record<string, ShapeInfo> = {
	draw: {
		util: TLDrawUtil,
	},
	geo: {
		util: TLGeoUtil,
	},
	line: {
		util: TLLineUtil,
	},
	note: {
		util: TLNoteUtil,
	},
	frame: {
		util: TLFrameUtil,
	},
	arrow: {
		util: TLArrowUtil,
	},
	highlight: {
		util: TLHighlightUtil,
	},
}
