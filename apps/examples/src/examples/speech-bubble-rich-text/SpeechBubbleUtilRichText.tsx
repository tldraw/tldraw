import { LABEL_FONT_SIZES, TEXT_PROPS, TLDefaultSizeStyle, getDefaultColorTheme } from 'tldraw'
import Tiptap from '../../shared/TipTap'
import type {
	SpeechBubbleShape,
	SpeechBubbleShapeProps,
} from '../speech-bubble/SpeechBubble/SpeechBubbleUtil'
import { STROKE_SIZES, SpeechBubbleUtil } from '../speech-bubble/SpeechBubble/SpeechBubbleUtil'
import { getSpeechBubbleVertices } from '../speech-bubble/SpeechBubble/helpers'

export class SpeechBubbleUtilRichText extends SpeechBubbleUtil {
	override getDefaultProps(): SpeechBubbleShapeProps {
		return { ...super.getDefaultProps(), text: '<p>Hello <b>World</b>! Some <i>rich</i> text</p>' }
	}

	override component(shape: SpeechBubbleShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text },
		} = shape
		const theme = getDefaultColorTheme({
			isDarkMode: this.editor.user.getIsDarkMode(),
		})
		const vertices = getSpeechBubbleVertices(shape)
		const pathData = 'M' + vertices[0] + 'L' + vertices.slice(1) + 'Z'

		return (
			<>
				<svg className="tl-svg-container">
					<path
						d={pathData}
						strokeWidth={STROKE_SIZES[size]}
						stroke={theme[color].solid}
						fill={'none'}
					/>
				</svg>

				<div style={{ padding: '1rem' }}>
					<Tiptap
						id={id}
						type={type}
						labelColor={color}
						font={font}
						fontSize={LABEL_FONT_SIZES[size as TLDefaultSizeStyle]}
						lineHeight={TEXT_PROPS.lineHeight}
						align={align}
						verticalAlign="start"
						content={text}
					/>
				</div>
			</>
		)
	}
}

/*
For this particular guide check out the main `speech-bubble` example.
This is the same guide except this adds rich text to the shape using TipTap.
*/
