import { Box, TLRichText, resolveLineHeightPx, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { renderHtmlFromRichText } from '../../utils/text/richText'
import { isLegacyAlign } from './legacyProps'

/** @public */
export interface RichTextSVGProps {
	bounds: Box
	richText: TLRichText
	fontSize: number
	fontFamily: string
	lineHeight: number
	textAlign: 'start' | 'center' | 'end'
	verticalAlign: 'start' | 'middle' | 'end'
	wrap?: boolean
	labelColor: string
	padding: number
	showTextOutline?: boolean
}

/** @internal */
export function ForeignObjectRichTextSVG({
	bounds,
	richText,
	fontSize,
	fontFamily,
	lineHeight,
	textAlign,
	verticalAlign,
	wrap,
	labelColor,
	padding,
	showTextOutline = true,
}: RichTextSVGProps) {
	const editor = useEditor()
	const html = renderHtmlFromRichText(editor, richText)
	const legacyAlign = isLegacyAlign(textAlign)
	const justifyContent =
		textAlign === 'center' || legacyAlign
			? ('center' as const)
			: textAlign === 'start'
				? ('flex-start' as const)
				: ('flex-end' as const)
	const alignItems =
		verticalAlign === 'middle' ? 'center' : verticalAlign === 'start' ? 'flex-start' : 'flex-end'
	const wrapperStyle = {
		display: 'flex',
		fontFamily,
		height: `100%`,
		justifyContent,
		alignItems,
		padding: `${padding}px`,
	}
	const style = {
		fontSize: `${fontSize}px`,
		wrap: wrap ? 'wrap' : 'nowrap',
		color: labelColor,
		lineHeight: `${resolveLineHeightPx(fontSize, lineHeight)}px`,
		// Unitless multiplier consumed by the .tl-rich-text h1–h6 rule (see editor.css).
		'--tl-rich-text-heading-line-height': lineHeight,
		textAlign,
		width: '100%',
		wordWrap: 'break-word' as const,
		overflowWrap: 'break-word' as const,
		whiteSpace: 'pre-wrap',
		textShadow: showTextOutline ? 'var(--tl-text-outline)' : 'none',
		tabSize: 'var(--tl-tab-size, 2)',
	}

	return (
		<foreignObject
			x={bounds.minX}
			y={bounds.minY}
			width={bounds.w}
			height={bounds.h}
			className={classNames(
				'tl-export-embed-styles tl-rich-text tl-rich-text-svg',
				showTextOutline ? 'tl-text__outline' : 'tl-text__no-outline'
			)}
		>
			<div style={wrapperStyle}>
				<div dangerouslySetInnerHTML={{ __html: html }} style={style} />
			</div>
		</foreignObject>
	)
}
