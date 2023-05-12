import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import {
	TLAlignType,
	TLColorType,
	TLDashType,
	TLFillType,
	TLFontType,
	TLGeoType,
	TLOpacityType,
	TLSizeType,
} from '../style-types'
import {
	alignValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLGeoShapeProps = {
	geo: TLGeoType
	labelColor: TLColorType
	color: TLColorType
	fill: TLFillType
	dash: TLDashType
	size: TLSizeType
	opacity: TLOpacityType
	font: TLFontType
	align: TLAlignType
	url: string
	w: number
	h: number
	text: string
	growY: number
}

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>

// --- VALIDATION ---
/** @public */
export const geoShapeTypeValidator: T.Validator<TLGeoShape> = createShapeValidator(
	'geo',
	T.object({
		geo: geoValidator,
		labelColor: colorValidator,
		color: colorValidator,
		fill: fillValidator,
		dash: dashValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		font: fontValidator,
		align: alignValidator,
		url: T.string,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		growY: T.positiveNumber,
		text: T.string,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
} as const

/** @public */
export const geoShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	firstVersion: Versions.Initial,
	currentVersion: Versions.AddCheckBox,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
		[Versions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[Versions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
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
		[Versions.AddCheckBox]: {
			up: (shape) => {
				return { ...shape }
			},
			down: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						geo: shape.props.geo === 'check-box' ? 'rectangle' : shape.props.geo,
					},
				}
			},
		},
	},
})
