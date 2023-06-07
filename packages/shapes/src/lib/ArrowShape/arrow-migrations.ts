import { defineMigrations } from '@tldraw/store'

const Versions = {
	AddLabelColor: 1,
} as const

/** @internal */
export const arrowShapeMigrations = defineMigrations({
	currentVersion: Versions.AddLabelColor,
	migrators: {
		[Versions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
	},
})
