import type { PortableTextBlock } from '@portabletext/react'

/** Strip leading blocks that duplicate the hero title/description */
export function stripLeadingHero(blocks: PortableTextBlock[], title: string): PortableTextBlock[] {
	let i = 0
	while (i < blocks.length) {
		const block = blocks[i]
		if (block._type !== 'block') break
		const text = (block.children as { text?: string }[])?.map((c) => c.text || '').join('') || ''
		const style = (block as { style?: string }).style || 'normal'
		if (style === 'h2' && text.trim().toLowerCase() === title.trim().toLowerCase()) {
			i++
			continue
		}
		if (i > 0 && style === 'normal' && i === 1) {
			i++
			continue
		}
		break
	}
	return blocks.slice(i)
}

/**
 * Split body blocks at the first h2 that isn't the opening h2.
 * Returns [before, after] — the cover image goes between them.
 */
export function splitAtFirstH2(
	blocks: PortableTextBlock[]
): [PortableTextBlock[], PortableTextBlock[]] {
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]
		if (block._type === 'block') {
			const style = (block as { style?: string }).style || 'normal'
			if (style === 'h2' && i > 0) {
				return [blocks.slice(0, i), blocks.slice(i)]
			}
		}
	}
	return [blocks, []]
}
