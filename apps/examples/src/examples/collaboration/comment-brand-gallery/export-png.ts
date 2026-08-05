import { toPng } from 'html-to-image'

/**
 * Rasterize a DOM node to a transparent-background PNG and download it. `html-to-image` clones
 * the node, inlines its computed styles, serializes it into an SVG `<foreignObject>`, and draws
 * that onto a canvas — so whatever the themes do with gradients, borders, shadows, and system
 * fonts comes through. Nothing sets a background, so pixels the comment UI doesn't paint stay
 * transparent.
 */
export async function exportNodeAsPng(node: HTMLElement, fileName: string) {
	// If an editable span still has focus, its dashed editing outline would export too.
	if (document.activeElement instanceof HTMLElement) document.activeElement.blur()

	const dataUrl = await toPng(node, {
		// 2x for crisp output when the PNG lands in a deck or a doc.
		pixelRatio: 2,
	})
	const link = document.createElement('a')
	link.download = `${fileName}.png`
	link.href = dataUrl
	link.click()
}
