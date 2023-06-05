import { defineMigrations } from '@tldraw/store'

import {
	TypeValidator,
	nonZeroNumberValidator,
	objectValidator,
	positiveNumberValidator,
	stringValidator,
} from '@tldraw/validate'
import { TLAlignType, alignValidator } from '../styles/TLAlignStyle'
import { TLColorType, colorValidator } from '../styles/TLColorStyle'
import { TLDashType, dashValidator } from '../styles/TLDashStyle'
import { TLFillType, fillValidator } from '../styles/TLFillStyle'
import { TLFontType, fontValidator } from '../styles/TLFontStyle'
import { TLGeoType, geoValidator } from '../styles/TLGeoStyle'
import { TLOpacityType, opacityValidator } from '../styles/TLOpacityStyle'
import { TLSizeType, sizeValidator } from '../styles/TLSizeStyle'
import { TLVerticalAlignType, verticalAlignValidator } from '../styles/TLVerticalAlignStyle'
import { TLBaseShape, createShapeValidator } from './TLBaseShape'

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

/** @internal */
export const geoShapeValidator: TypeValidator<TLGeoShape> = createShapeValidator(
	'geo',
	objectValidator({
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
		url: stringValidator,
		w: nonZeroNumberValidator,
		h: nonZeroNumberValidator,
		growY: positiveNumberValidator,
		text: stringValidator,
	})
)

const Versions = {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
	MigrateLegacyAlign: 6,
} as const

/** @internal */
export const geoShapeMigrations = defineMigrations({
	currentVersion: Versions.MigrateLegacyAlign,
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
		[Versions.MigrateLegacyAlign]: {
			up: (shape) => {
				let newAlign: TLAlignType
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy' as TLAlignType
						break
					case 'end':
						newAlign = 'end-legacy' as TLAlignType
						break
					default:
						newAlign = 'middle-legacy' as TLAlignType
						break
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
				let oldAlign: TLAlignType
				switch (shape.props.align) {
					case 'start-legacy':
						oldAlign = 'start'
						break
					case 'end-legacy':
						oldAlign = 'end'
						break
					case 'middle-legacy':
						oldAlign = 'middle'
						break
					default:
						oldAlign = shape.props.align
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: oldAlign,
					},
				}
			},
		},
	},
})
