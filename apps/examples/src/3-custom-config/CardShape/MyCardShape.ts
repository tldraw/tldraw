import {
	DefaultColorStyle,
	ShapeProps,
	TLBaseShape,
	TLDefaultColorStyle,
	defineMigrations,
} from '@tldraw/tldraw'
import { T } from '@tldraw/validate'

// A type for our custom card shape
export type MyCardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
	}
>

// Validation for our custom card shape's props (optional but recommended)
export const cardShapeProps: ShapeProps<MyCardShape> = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
}

// Migrations for the custom card shape (optional but very helpful)
export const cardShapeMigrations = defineMigrations({
	currentVersion: 1,
	migrators: {
		1: {
			// for example, removing a property from the shape
			up(shape) {
				const migratedUpShape = { ...shape }
				delete migratedUpShape._somePropertyToRemove
				return migratedUpShape
			},
			down(shape) {
				const migratedDownShape = { ...shape }
				migratedDownShape._somePropertyToRemove = 'some value'
				return migratedDownShape
			},
		},
	},
})
