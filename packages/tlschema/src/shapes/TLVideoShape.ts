import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { TLAssetId } from '../records/TLAsset'
import { ShapeProps, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLVideoShapeProps = {
	w: number
	h: number
	time: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
}

/** @public */
export type TLVideoShape = TLBaseShape<'video', TLVideoShapeProps>

/** @internal */
export const videoShapeProps: ShapeProps<TLVideoShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	time: T.number,
	playing: T.boolean,
	url: T.string,
	assetId: assetIdValidator.nullable(),
}

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
