import React from 'react'
import { TLComponents, TLTextLabel, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import Tiptap, { TipTapMeasure } from '../../shared/TipTap'

const CustomRichText: TLTextLabel = React.memo(function CustomRichText({
	shapeId,
	type,
	text,
	labelColor,
	font,
	fontSize,
	lineHeight,
	align,
	verticalAlign,
	wrap,
	bounds,
}) {
	return (
		<Tiptap
			id={shapeId}
			type={type}
			labelColor={labelColor}
			font={font}
			fontSize={fontSize}
			lineHeight={lineHeight}
			align={align}
			verticalAlign={verticalAlign}
			content={text}
			wrap={wrap}
			bounds={bounds}
		/>
	)
})
CustomRichText.measureMethod = (content) => {
	return <TipTapMeasure content={content} />
}

const components: TLComponents = {
	TextLabel: CustomRichText,
}

export default function CustomRichTextExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
