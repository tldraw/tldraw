import { defineMigrations } from '@tldraw/store'

const Versions = {
	AddUrlProp: 1,
} as const

/** @internal */
export const videoShapeMigrations = defineMigrations({
	currentVersion: Versions.AddUrlProp,
	migrators: {
		[Versions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
	},
})
