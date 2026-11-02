import { SvgExportContext } from '@tldraw/editor'
import { getFontFamily } from './default-shape-constants'

const PADDING = 16

/**
 * A plain card for previews of shapes that show live content, such as a page or an iframe, which a
 * stored preview can't hold.
 */
export function PreviewCard({
	w,
	h,
	label,
	ctx,
}: {
	w: number
	h: number
	label: string
	ctx: SvgExportContext
}) {
	const colors = ctx.theme.colors[ctx.colorMode]
	const fontSize = Math.max(12, Math.min(24, h / 4))
	// SVG text doesn't wrap or clip, so the label is cut to roughly what fits on one line.
	const maxChars = Math.max(1, Math.floor((w - PADDING * 2) / (fontSize * 0.55)))
	const text = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label
	return (
		<>
			<rect
				width={w}
				height={h}
				rx={8}
				fill={colors.background}
				stroke={colors.text}
				strokeOpacity={0.2}
			/>
			<text
				x={PADDING}
				y={h / 2}
				dominantBaseline="central"
				fill={colors.text}
				fontSize={fontSize}
				fontFamily={getFontFamily(ctx.theme, 'sans')}
			>
				{text}
			</text>
		</>
	)
}
