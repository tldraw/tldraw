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
		const offset = (totalWidth - 2 * padding - spansBounds.width) / 2
		return align === 'start-legacy' ? offset : -offset
	}
	return undefined
}

// sneaky TLDefaultHorizontalAlignStyle for legacies
export function isLegacyAlign(align: TLDefaultHorizontalAlignStyle | string): boolean {
	return align === 'start-legacy' || align === 'middle-legacy' || align === 'end-legacy'
}
