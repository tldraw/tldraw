import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAssetId, assetIdValidator } from '../records/TLAsset'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

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
	AddUrlProp: 1,
} as const

/** @public */
export const videoShapeTypeMigrations = defineMigrations({
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
