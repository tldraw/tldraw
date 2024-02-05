import { Store } from '@tldraw/store'
import { createTLSchema } from '../../createTLSchema'
import {
	arrowShapeMigrations,
	bookmarkShapeMigrations,
	drawShapeMigrations,
	embedShapeMigrations,
	frameShapeMigrations,
	geoShapeMigrations,
	groupShapeMigrations,
	highlightShapeMigrations,
	imageShapeMigrations,
	lineShapeMigrations,
	noteShapeMigrations,
	textShapeMigrations,
	videoShapeMigrations,
} from '../../legacy-migrations/legacy-migrations'
import { arrowShapeProps } from '../../shapes/TLArrowShape'
import { bookmarkShapeProps } from '../../shapes/TLBookmarkShape'
import { drawShapeProps } from '../../shapes/TLDrawShape'
import { embedShapeProps } from '../../shapes/TLEmbedShape'
import { frameShapeProps } from '../../shapes/TLFrameShape'
import { geoShapeProps } from '../../shapes/TLGeoShape'
import { groupShapeProps } from '../../shapes/TLGroupShape'
import { highlightShapeProps } from '../../shapes/TLHighlightShape'
import { imageShapeProps } from '../../shapes/TLImageShape'
import { lineShapeProps } from '../../shapes/TLLineShape'
import { noteShapeProps } from '../../shapes/TLNoteShape'
import { textShapeProps } from '../../shapes/TLTextShape'
import { videoShapeProps } from '../../shapes/TLVideoShape'

export const testSchema = createTLSchema({
	shapes: {
		group: {
			props: groupShapeProps,
			__legacyMigrations_do_not_update: groupShapeMigrations,
		},
		text: {
			props: textShapeProps,
			__legacyMigrations_do_not_update: textShapeMigrations,
		},
		bookmark: {
			props: bookmarkShapeProps,
			__legacyMigrations_do_not_update: bookmarkShapeMigrations,
		},
		draw: {
			props: drawShapeProps,
			__legacyMigrations_do_not_update: drawShapeMigrations,
		},
		geo: {
			props: geoShapeProps,
			__legacyMigrations_do_not_update: geoShapeMigrations,
		},
		note: {
			props: noteShapeProps,
			__legacyMigrations_do_not_update: noteShapeMigrations,
		},
		line: {
			props: lineShapeProps,
			__legacyMigrations_do_not_update: lineShapeMigrations,
		},
		frame: {
			props: frameShapeProps,
			__legacyMigrations_do_not_update: frameShapeMigrations,
		},
		arrow: {
			props: arrowShapeProps,
			__legacyMigrations_do_not_update: arrowShapeMigrations,
		},
		highlight: {
			props: highlightShapeProps,
			__legacyMigrations_do_not_update: highlightShapeMigrations,
		},
		embed: {
			props: embedShapeProps,
			__legacyMigrations_do_not_update: embedShapeMigrations,
		},
		image: {
			props: imageShapeProps,
			__legacyMigrations_do_not_update: imageShapeMigrations,
		},
		video: {
			props: videoShapeProps,
			__legacyMigrations_do_not_update: videoShapeMigrations,
		},
	},
})

export function getTestStore() {
	const store = new Store({ schema: testSchema, props: { defaultName: '' } })

	store.ensureStoreIsUsable()
	return store
}
