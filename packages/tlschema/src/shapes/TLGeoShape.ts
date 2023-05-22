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
	TLVerticalAlignType,
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
	verticalAlignValidator,
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
	verticalAlign: TLVerticalAlignType
	url: string
	w: number
	h: number
	text: string
	growY: number
}

/** @public */
export type TLGeoShape = TLBaseShape<'geo', TLGeoShapeProps>

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
		verticalAlign: verticalAlignValidator,
		url: T.string,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		growY: T.positiveNumber,
		text: T.string,
	})
)

const Versions = {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
} as const

/** @public */
export const geoShapeTypeMigrations = defineMigrations({
	currentVersion: Versions.AddVerticalAlign,
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
		[Versions.AddVerticalAlign]: {
			up: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						verticalAlign: 'middle',
					},
				}
			},
			down: (shape) => {
				const { verticalAlign: _, ...props } = shape.props
				return {
					...shape,
					props,
				}
			},
		},
	},
})
