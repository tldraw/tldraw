import { T } from '@tldraw/validate'
import { assetIdValidator } from '../assets/TLBaseAsset'
import { vecModelValidator } from '../misc/geometry-types'
import { TLAssetId } from '../records/TLAsset'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import {
	DefaultColorStyle,
	DefaultLabelColorStyle,
	TLDefaultColorStyle,
} from '../styles/TLColorStyle'
import { DefaultFillStyle, TLDefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle, TLDefaultFontStyle } from '../styles/TLFontStyle'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	DefaultVerticalAlignStyle,
	TLDefaultVerticalAlignStyle,
} from '../styles/TLVerticalAlignStyle'
import { TLShapeCrop } from './ShapeWithCrop'
import { TLBaseShape } from './TLBaseShape'

/** @public */
export const ImageShapeCrop: T.ObjectValidator<TLShapeCrop> = T.object({
	topLeft: vecModelValidator,
	bottomRight: vecModelValidator,
	isCircle: T.boolean.optional(),
})

/** @public */
export interface TLImageShapeProps {
	w: number
	h: number
	playing: boolean
	url: string
	assetId: TLAssetId | null
	crop: TLShapeCrop | null
	flipX: boolean
	flipY: boolean
	zoom: number

	// Text properties
	labelColor: TLDefaultColorStyle
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	size: TLDefaultSizeStyle
	font: TLDefaultFontStyle
	align: TLDefaultHorizontalAlignStyle
	verticalAlign: TLDefaultVerticalAlignStyle
	text: string
	altText: string
}

/** @public */
export type TLImageShape = TLBaseShape<'image', TLImageShapeProps>

/** @public */
export const imageShapeProps: RecordProps<TLImageShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
	zoom: T.nonZeroNumber,

	// Text properties
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	text: T.string,
	altText: T.string,
}

const Versions = createShapePropsMigrationIds('image', {
	AddUrlProp: 1,
	AddCropProp: 2,
	MakeUrlsValid: 3,
	AddFlipProps: 4,
	AddTextProps: 5,
	AddZoomProp: 6,
	AddAltText: 7,
})

export { Versions as imageShapeVersions }

/** @public */
export const imageShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.AddUrlProp,
			up: (props) => {
				props.url = ''
			},
			down: 'retired',
		},
		{
			id: Versions.AddCropProp,
			up: (props) => {
				props.crop = null
			},
			down: (props) => {
				delete props.crop
			},
		},
		{
			id: Versions.MakeUrlsValid,
			up: (props) => {
				if (!T.linkUrl.isValid(props.url)) {
					props.url = ''
				}
			},
			down: (_props) => {
				// noop
			},
		},
		{
			id: Versions.AddFlipProps,
			up: (props) => {
				props.flipX = false
				props.flipY = false
			},
			down: (props) => {
				delete props.flipX
				delete props.flipY
			},
		},
		{
			id: Versions.AddTextProps,
			up: (props) => {
				props.color = 'black'
				props.labelColor = 'black'
				props.fill = 'none'
				props.size = 'm'
				props.font = 'draw'
				props.text = ''
				props.align = 'middle'
				props.verticalAlign = 'middle'
			},
			down: (props) => {
				delete props.labelColor
				delete props.color
				delete props.fill
				delete props.size
				delete props.font
				delete props.align
				delete props.verticalAlign
				delete props.text
			},
		},
		{
			id: Versions.AddZoomProp,
			up: (props) => {
				props.zoom = 1
			},
			down: (props) => {
				delete props.zoom
			},
		},
		{
			id: Versions.AddAltText,
			up: (props) => {
				props.altText = ''
			},
			down: (props) => {
				delete props.altText
			},
		},
	],
})
