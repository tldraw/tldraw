import { Box, BoxModel, TLDefaultHorizontalAlignStyle } from '@tldraw/editor'

export function getLegacyOffsetX(
	align: TLDefaultHorizontalAlignStyle | string,
	padding: number,
	spans: { text: string; box: BoxModel }[],
	totalWidth: number
): number | undefined {
	if ((align === 'start-legacy' || align === 'end-legacy') && spans.length !== 0) {
		const spansBounds = Box.From(spans[0].box)
		for (const { box } of spans) {
			spansBounds.union(box)
		}
		if (align === 'start-legacy') {
			return (totalWidth - 2 * padding - spansBounds.width) / 2
		} else if (align === 'end-legacy') {
			return -(totalWidth - 2 * padding - spansBounds.width) / 2
		}
	}
}

// sneaky TLDefaultHorizontalAlignStyle for legacies
export function isLegacyAlign(align: TLDefaultHorizontalAlignStyle | string): boolean {
	return align === 'start-legacy' || align === 'middle-legacy' || align === 'end-legacy'
}
