import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType } from '../style-types'
import { assetIdValidator, opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLVideoShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	time: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
}

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

/** @public */
export const videoShapeTypeValidator: T.Validator<TLVideoShape> = createShapeValidator(
	'video',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		time: T.number,
		playing: T.boolean,
		url: T.string,
		assetId: assetIdValidator.nullable(),
	})
)

const Versions = {
	Initial: 0,
	AddUrlProp: 1,
} as const

/** @public */
export const videoShapeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
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
