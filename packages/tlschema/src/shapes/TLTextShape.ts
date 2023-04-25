import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLAlignType, TLColorType, TLFontType, TLOpacityType, TLSizeType } from '../style-types'
import {
	alignValidator,
	colorValidator,
	fontValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLTextShapeProps = {
	color: TLColorType
	size: TLSizeType
	font: TLFontType
	align: TLAlignType
	opacity: TLOpacityType
	w: number
	text: string
	scale: number
	autoSize: boolean
}

/** @public */
export type TLTextShape = TLBaseShape<'text', TLTextShapeProps>

// --- VALIDATION ---
/** @public */
export const textShapeTypeValidator: T.Validator<TLTextShape> = createShapeValidator(
	'text',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		font: fontValidator,
		align: alignValidator,
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		text: T.string,
		scale: T.nonZeroNumber,
		autoSize: T.boolean,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	RemoveJustify: 1,
} as const

/** @public */
export const textShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	firstVersion: Versions.Initial,
	currentVersion: Versions.RemoveJustify,
	migrators: {
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
	},
})
