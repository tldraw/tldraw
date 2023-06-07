import { defineMigrations } from '@tldraw/store'
import { TLBookmarkShape } from '@tldraw/tlschema'

const Versions = {
	NullAssetId: 1,
} as const

/** @internal */
export const bookmarkShapeMigrations = defineMigrations({
	currentVersion: Versions.NullAssetId,
	migrators: {
		[Versions.NullAssetId]: {
			up: (shape: TLBookmarkShape) => {
				if (shape.props.assetId === undefined) {
					return { ...shape, props: { ...shape.props, assetId: null } } as typeof shape
				}
				return shape
			},
			down: (shape: TLBookmarkShape) => {
				if (shape.props.assetId === null) {
					const { assetId: _, ...props } = shape.props
					return { ...shape, props } as typeof shape
				}
				return shape
			},
		},
	},
})
