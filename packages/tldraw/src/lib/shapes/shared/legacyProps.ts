import { TLDefaultHorizontalAlignStyle } from '@tldraw/editor'

// sneaky TLDefaultHorizontalAlignStyle for legacies
export function isLegacyAlign(align: TLDefaultHorizontalAlignStyle | string): boolean {
	return align === 'start-legacy' || align === 'middle-legacy' || align === 'end-legacy'
}
