import { TLComponents, TLTextLabelProps, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import Tiptap from '../../shared/TipTap'

function CustomRichText({
	id,
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
}: TLTextLabelProps) {
	return (
		<Tiptap
			id={id}
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
