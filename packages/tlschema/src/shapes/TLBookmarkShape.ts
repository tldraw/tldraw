import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const bookmarkShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	assetId: assetIdValidator.nullable(),
	url: T.linkUrl,
}

/** @public */
export type TLBookmarkShapeProps = ShapePropsType<typeof bookmarkShapeProps>

/** @public */
export type TLBookmarkShape = TLBaseShape<'bookmark', TLBookmarkShapeProps>

const Versions = {
	NullAssetId: 1,
	MakeUrlsValid: 2,
} as const

/** @internal */
export const bookmarkShapeMigrations = defineMigrations({
	currentVersion: Versions.MakeUrlsValid,
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
		[Versions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})
