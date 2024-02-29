import { defineMigrations } from '@tldraw/tldraw'

// Migrations for the custom myshape shape (optional but very helpful)
export const myshapeShapeMigrations = defineMigrations({
	currentVersion: 1, // increment the current version
	migrators: {
		1: {
			up(shape) {
				const migratedUpShape = { ...shape }
				migratedUpShape.color = 'lightblue'

				return migratedUpShape
			},
			down(shape) {
				const migratedDownShape = { ...shape }
				delete migratedDownShape.color

				return migratedDownShape
			},
		},
	},
})
