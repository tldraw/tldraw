import { defineMigrations } from '@tldraw/store'
import { TLAlignType } from '@tldraw/tlschema'

const Versions = {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
} as const

/** @internal */
export const noteShapeMigrations = defineMigrations({
	currentVersion: Versions.AddVerticalAlign,
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

		[Versions.MigrateLegacyAlign]: {
			up: (shape) => {
				let newAlign: TLAlignType
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy' as TLAlignType
						break
					case 'end':
						newAlign = 'end-legacy' as TLAlignType
						break
					default:
						newAlign = 'middle-legacy' as TLAlignType
						break
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
				let oldAlign: TLAlignType
				switch (shape.props.align) {
					case 'start-legacy':
						oldAlign = 'start'
						break
					case 'end-legacy':
						oldAlign = 'end'
						break
					case 'middle-legacy':
						oldAlign = 'middle'
						break
					default:
						oldAlign = shape.props.align
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: oldAlign,
					},
				}
			},
		},
		[Versions.AddVerticalAlign]: {
			up: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						verticalAlign: 'middle',
					},
				}
			},
			down: (shape) => {
				const { verticalAlign: _, ...props } = shape.props

				return {
					...shape,
					props,
				}
			},
		},
	},
})
