import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export interface TLFrameShapeProps {
	w: number
	h: number
	name: string
	color: TLDefaultColorStyle
}

/** @public */
export type TLFrameShape = TLBaseShape<'frame', TLFrameShapeProps>

/** @public */
export const frameShapeProps: RecordProps<TLFrameShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	name: T.string,
	// because shape colors are an option, we don't want them to be picked up by the editor as a
	// style prop by default, so instead of a proper style we just supply an equivalent validator.
	// Check `FrameShapeUtil.configure` for how we replace this with the original
	// `DefaultColorStyle` style when the option is turned on.
	color: T.literalEnum(...DefaultColorStyle.values),
}

const Versions = createShapePropsMigrationIds('frame', {
	AddColorProp: 1,
})

export { Versions as frameShapeVersions }

/** @public */
export const frameShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddColorProp,
			up: (props) => {
				props.color = 'black'
			},
			down: (props) => {
				delete props.color
			},
		},
	],
})
