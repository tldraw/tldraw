import {
	arrowShapeMigrations,
	arrowShapeProps,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	createTLSchema,
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

export const schema = createTLSchema({
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
