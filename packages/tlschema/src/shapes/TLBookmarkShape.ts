import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/tlvalidate'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType } from '../style-types'
import { assetIdValidator, opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLBookmarkShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	assetId: TLAssetId | null
	url: string
}

/** @public */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>

/** @public */
export const bookmarkShapeTypeValidator: T.Validator<TLBookmarkShape> = createShapeValidator(
	'bookmark',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		assetId: assetIdValidator.nullable(),
		url: T.string,
	})
)

const Versions = {
	NullAssetId: 1,
} as const

/** @public */
export const bookmarkShapeTypeMigrations = defineMigrations({
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
