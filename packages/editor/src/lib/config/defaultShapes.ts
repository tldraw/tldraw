import {
	arrowShapeMigrations,
	arrowShapeProps,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	drawShapeMigrations,
	drawShapeProps,
	embedShapeMigrations,
	embedShapeProps,
	frameShapeMigrations,
	frameShapeProps,
	geoShapeMigrations,
	geoShapeProps,
	groupShapeMigrations,
	groupShapeProps,
	highlightShapeMigrations,
	highlightShapeProps,
	imageShapeMigrations,
	imageShapeProps,
	lineShapeMigrations,
	lineShapeProps,
	noteShapeMigrations,
	noteShapeProps,
	textShapeMigrations,
	textShapeProps,
	videoShapeMigrations,
	videoShapeProps,
} from '@tldraw/tlschema'
import { ArrowShapeUtil } from '../editor/shapes/arrow/ArrowShapeUtil'
import { BookmarkShapeUtil } from '../editor/shapes/bookmark/BookmarkShapeUtil'
import { DrawShapeUtil } from '../editor/shapes/draw/DrawShapeUtil'
import { EmbedShapeUtil } from '../editor/shapes/embed/EmbedShapeUtil'
import { FrameShapeUtil } from '../editor/shapes/frame/FrameShapeUtil'
import { GeoShapeUtil } from '../editor/shapes/geo/GeoShapeUtil'
import { GroupShapeUtil } from '../editor/shapes/group/GroupShapeUtil'
import { HighlightShapeUtil } from '../editor/shapes/highlight/HighlightShapeUtil'
import { ImageShapeUtil } from '../editor/shapes/image/ImageShapeUtil'
import { LineShapeUtil } from '../editor/shapes/line/LineShapeUtil'
import { NoteShapeUtil } from '../editor/shapes/note/NoteShapeUtil'
import { TextShapeUtil } from '../editor/shapes/text/TextShapeUtil'
import { VideoShapeUtil } from '../editor/shapes/video/VideoShapeUtil'
import { AnyTLShapeInfo, TLShapeInfo, defineShape } from './defineShape'

/** @public */
export const coreShapes = [
	// created by grouping interactions, probably the corest core shape that we have
	defineShape('group', {
		util: GroupShapeUtil,
		props: groupShapeProps,
		migrations: groupShapeMigrations,
	}),
	// created by embed menu / url drop
	defineShape('embed', {
		util: EmbedShapeUtil,
		props: embedShapeProps,
		migrations: embedShapeMigrations,
	}),
	// created by copy and paste / url drop
	defineShape('bookmark', {
		util: BookmarkShapeUtil,
		props: bookmarkShapeProps,
		migrations: bookmarkShapeMigrations,
	}),
	// created by copy and paste / file drop
	defineShape('image', {
		util: ImageShapeUtil,
		props: imageShapeProps,
		migrations: imageShapeMigrations,
	}),
	// created by copy and paste
	defineShape('text', {
		util: TextShapeUtil,
		props: textShapeProps,
		migrations: textShapeMigrations,
	}),
] as const

/** @public */
export const defaultShapes = [
	defineShape('draw', {
		util: DrawShapeUtil,
		props: drawShapeProps,
		migrations: drawShapeMigrations,
	}),
	defineShape('geo', {
		util: GeoShapeUtil,
		props: geoShapeProps,
		migrations: geoShapeMigrations,
	}),
	defineShape('line', {
		util: LineShapeUtil,
		props: lineShapeProps,
		migrations: lineShapeMigrations,
	}),
	defineShape('note', {
		util: NoteShapeUtil,
		props: noteShapeProps,
		migrations: noteShapeMigrations,
	}),
	defineShape('frame', {
		util: FrameShapeUtil,
		props: frameShapeProps,
		migrations: frameShapeMigrations,
	}),
	defineShape('arrow', {
		util: ArrowShapeUtil,
		props: arrowShapeProps,
		migrations: arrowShapeMigrations,
	}),
	defineShape('highlight', {
		util: HighlightShapeUtil,
		props: highlightShapeProps,
		migrations: highlightShapeMigrations,
	}),
	defineShape('video', {
		util: VideoShapeUtil,
		props: videoShapeProps,
		migrations: videoShapeMigrations,
	}),
] as const

const coreShapeTypes = new Set<string>(coreShapes.map((s) => s.type))
export function checkShapesAndAddCore(customShapes: readonly TLShapeInfo[]) {
	const shapes: AnyTLShapeInfo[] = [...coreShapes]

	const addedCustomShapeTypes = new Set<string>()
	for (const customShape of customShapes) {
		if (coreShapeTypes.has(customShape.type)) {
			throw new Error(
				`Shape type "${customShape.type}" is a core shapes type and cannot be overridden`
			)
		}
		if (addedCustomShapeTypes.has(customShape.type)) {
			throw new Error(`Shape type "${customShape.type}" is defined more than once`)
		}
		shapes.push(customShape)
		addedCustomShapeTypes.add(customShape.type)
	}

	return shapes
}
