import { TLArrowShape, TLDefaultColorStyle, TLShapeId, VecLike } from '@tldraw/editor'
import * as React from 'react'
import { TextLabel } from '../../shared/TextLabel'
import { ARROW_LABEL_FONT_SIZES, TEXT_PROPS } from '../../shared/default-shape-constants'

export const ArrowTextLabel = React.memo(function ArrowTextLabel({
	id,
	text,
	size,
	font,
	position,
	width,
	labelColor,
	style,
}: {
	id: TLShapeId
	position: VecLike
	width?: number
	labelColor: TLDefaultColorStyle
	style: React.CSSProperties
} & Pick<TLArrowShape['props'], 'text' | 'size' | 'font'>) {
	return (
		<TextLabel
			id={id}
			classNamePrefix="tl-arrow"
			type="arrow"
			font={font}
			fontSize={ARROW_LABEL_FONT_SIZES[size]}
			lineHeight={TEXT_PROPS.lineHeight}
			align="middle"
			verticalAlign="middle"
			text={text}
			labelColor={labelColor}
			textWidth={width}
			style={{
				...style,
				transform: `translate(${position.x}px, ${position.y}px)`,
			}}
		/>
	)
})
