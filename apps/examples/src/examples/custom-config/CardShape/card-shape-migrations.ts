import { createShapePropsMigrations } from 'tldraw'

const versions = {
	AddSomeProperty: 1,
} as const

// Migrations for the custom card shape (optional but very helpful)
export const cardShapeMigrations = createShapePropsMigrations({
	sequence: [
		{
			version: versions.AddSomeProperty,
			up(props) {
				// it is safe to mutate the props object here
				props.someProperty = 'some value'
			},
			down(props) {
				delete props.someProperty
			},
		},
	],
})
