import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from 'tldraw'

const versions = createShapePropsMigrationIds(
	// this must match the shape type in the shape definition
	'card',
	{
		AddColor: 1,
	}
)

// Migrations for the custom card shape (optional but very helpful)
export const cardShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: versions.AddColor,
			up(props) {
				// it is safe to mutate the props object here
				props.color = 'black'
			},
			down(props) {
				delete props.color
			},
		},
	],
})
