import { ShapeProps, TLBaseShape, defineMigrations } from '@tldraw/tldraw'
import { T } from '@tldraw/validate'

// A type for our custom card shape
export type MyCardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
	}
>

// Validation for our custom card shape's props (optional but recommended)
export const cardShapeProps: ShapeProps<MyCardShape> = {
	w: T.number,
	h: T.number,
}

// Migrations for the custom card shape (optional)
export const cardShapeMigrations = defineMigrations({
	currentVersion: 1,
	migrators: {
		1: {
			up(shape) {
				const { _somePropertyToRemove, ...rest } = shape
				return rest
			},
			down(shape) {
				return {
					_somePropertyToRemove: 'some value',
					...shape,
				}
			},
		},
	},
})
