import { Migrator } from '@tldraw/tlstore'
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

const Versions = {
	NullAssetId: 1,
} as const

/** @public */
export const bookmarkShapeTypeMigrator = new Migrator({
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

/** @public */
export const bookmarkShapeTypeValidator = createShapeValidator<TLBookmarkShape>(
	'bookmark',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		assetId: assetIdValidator.nullable(),
		url: T.string,
	})
)
