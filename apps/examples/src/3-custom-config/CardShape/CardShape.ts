import { defineShape } from '@tldraw/tldraw'
import { CardShapeUtil } from './CardShapeUtil'
import { cardShapeMigrations } from './card-shape-migrations'
import { cardShapeProps } from './card-shape-props'

// A custom shape is a bundle of a shape util, a tool, and props
export const CardShape = defineShape('card', {
	// A utility class
	util: CardShapeUtil,
	// A tool that is used to create and edit the shape (optional)
	// A validation schema for the shape's props (optional)
	props: cardShapeProps,
	// Migrations for upgrading shapes (optional)
	migrations: cardShapeMigrations,
})
