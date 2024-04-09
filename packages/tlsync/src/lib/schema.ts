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
			migrations: groupShapeMigrations,
		},
		text: {
			props: textShapeProps,
			migrations: textShapeMigrations,
		},
		bookmark: {
			props: bookmarkShapeProps,
			migrations: bookmarkShapeMigrations,
		},
		draw: {
			props: drawShapeProps,
			migrations: drawShapeMigrations,
		},
		geo: {
			props: geoShapeProps,
			migrations: geoShapeMigrations,
		},
		note: {
			props: noteShapeProps,
			migrations: noteShapeMigrations,
		},
		line: {
			props: lineShapeProps,
			migrations: lineShapeMigrations,
		},
		frame: {
			props: frameShapeProps,
			migrations: frameShapeMigrations,
		},
		arrow: {
			props: arrowShapeProps,
			migrations: arrowShapeMigrations,
		},
		highlight: {
			props: highlightShapeProps,
			migrations: highlightShapeMigrations,
		},
		embed: {
			props: embedShapeProps,
			migrations: embedShapeMigrations,
		},
		image: {
			props: imageShapeProps,
			migrations: imageShapeMigrations,
		},
		video: {
			props: videoShapeProps,
			migrations: videoShapeMigrations,
		},
	},
})
