import { Editor } from 'tldraw'
import { handoffZoom, type Layout, type PlacedNode, type Rect } from './layout'

/** Zoom so that `rect` fills the viewport, with a little air around it. */
export function frameRect(editor: Editor, rect: Rect, durationMs = 600) {
	editor.zoomToBounds(rect, {
		inset: 24,
		animation: durationMs ? { duration: durationMs } : undefined,
	})
}

/**
 * Put a node on screen at the zoom where its own level is the one being read,
 * rather than merely fitting its box — otherwise landing on a leaf shows the
 * level below it, which is not what the reader asked for.
 */
export function goToNode(editor: Editor, layout: Layout, node: PlacedNode, durationMs = 600) {
	const settled = handoffZoom(layout.nominals, node.depth) / 1.6
	editor.zoomToBounds(node.rect, {
		targetZoom: settled,
		animation: durationMs ? { duration: durationMs } : undefined,
	})
}

/** The chain of nodes containing a page point, outermost first. */
export function nodesContaining(layout: Layout, x: number, y: number): PlacedNode[] {
	return layout.nodes
		.filter(
			({ rect }) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
		)
		.sort((a, b) => a.depth - b.depth)
}

/** The smallest node containing a page point. */
export function nodeAt(layout: Layout, x: number, y: number): PlacedNode | undefined {
	const chain = nodesContaining(layout, x, y)
	return chain[chain.length - 1]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fly down through every level once, then stop and hand back control.
 *
 * Most people meeting this page will read one sentence, never think to try
 * ctrl-scroll, and leave. A single pass costs six seconds and shows the whole
 * idea, so it is worth more than any amount of instructional text.
 */
export async function runGuidedDive(
	editor: Editor,
	layout: Layout,
	path: string[],
	isCancelled: () => boolean
) {
	for (const id of path) {
		const node = layout.byId.get(id)
		if (!node || isCancelled()) return
		goToNode(editor, layout, node, 1500)
		await sleep(1900)
		if (isCancelled()) return
	}

	// Finish inside the deepest text, which has no cell of its own to frame.
	if (layout.hasDetail) {
		const leaf = layout.byId.get(path[path.length - 1])
		if (!leaf || isCancelled()) return
		for (let i = 1; i <= 2; i++) {
			const depth = leaf.depth + i
			editor.zoomToBounds(leaf.textRect, {
				targetZoom: handoffZoom(layout.nominals, depth) / 1.5,
				animation: { duration: 1500 },
			})
			await sleep(1900)
			if (isCancelled()) return
		}
	}
}

/**
 * A path from the root down to one leaf, taking the heaviest child at each step
 * so the tour lands somewhere substantial rather than on a two-line chapter.
 */
export function suggestDivePath(layout: Layout, leafId?: string): string[] {
	if (leafId) {
		const leaf = layout.byId.get(leafId)
		if (leaf) {
			return layout.nodes
				.filter(
					(n) =>
						n.depth <= leaf.depth &&
						leaf.rect.x >= n.rect.x &&
						leaf.rect.x + leaf.rect.w <= n.rect.x + n.rect.w + 0.01 &&
						leaf.rect.y >= n.rect.y &&
						leaf.rect.y + leaf.rect.h <= n.rect.y + n.rect.h + 0.01
				)
				.sort((a, b) => a.depth - b.depth)
				.map((n) => n.id)
		}
	}
	return [layout.nodes[0].id]
}
