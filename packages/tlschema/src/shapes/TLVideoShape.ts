import { Migrator } from '@tldraw/tlstore'
import { TLAssetId } from '../records/TLAsset'
import { TLOpacityType } from '../style-types'
import { TLBaseShape } from './shape-validation'

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

const Versions = {
	AddUrlProp: 1,
} as const

/** @public */
export const videoShapeTypeMigrator = new Migrator({
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
