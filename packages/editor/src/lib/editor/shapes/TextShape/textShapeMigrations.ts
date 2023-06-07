import { defineMigrations } from '@tldraw/store'

const Versions = {
	RemoveJustify: 1,
} as const

/** @internal */
export const textShapeMigrations = defineMigrations({
	currentVersion: Versions.RemoveJustify,
	migrators: {
		[Versions.RemoveJustify]: {
			up: (shape) => {
				let newAlign = shape.props.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				return { ...shape }
			},
		},
	},
})
