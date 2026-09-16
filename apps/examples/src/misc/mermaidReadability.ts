import { createMermaidDiagram } from '@tldraw/mermaid'
import {
	Box,
	Editor,
	Group2d,
	TLShape,
	TLShapeId,
	VecLike,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
} from 'tldraw'

/**
 * Shapes are named by their text, or their kind when they have none, so findings are stable
 * across runs.
 */
export type MermaidReadabilityFinding =
	| { check: 'overlap'; label: string; over: string }
	| { check: 'mid-word break'; label: string; word: string }
	| { check: 'missing text'; text: string }
	| { check: 'label not rendered'; label: string }

let nextSvgId = 0

// A text run's client rect spans the font's full ascent and descent, which is well clear of the
// glyphs. Two labels stacked a line apart touch at those edges without any ink colliding, so
// overlaps are measured against this inner part of each line instead.
const GLYPH_INSET_Y = 0.2
const GLYPH_INSET_X = 0.05

const WORD = /[\p{L}\p{N}]+/gu

export async function checkMermaidReadability(
	editor: Editor,
	definition: string
): Promise<MermaidReadabilityFinding[]> {
	editor.deleteShapes([...editor.getCurrentPageShapeIds()])
	await createMermaidDiagram(editor, definition, {
		blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
	})
	// Only text and element counts are read from this, which mermaid's layout config doesn't change.
	const { default: mermaid } = await import('mermaid')
	const { svg } = await mermaid.render(`mermaid-readability-${nextSvgId++}`, definition)
	const mermaidSvg = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement

	editor.selectNone()
	editor.zoomToFit({ immediate: true })

	const shapes = editor.getCurrentPageShapesSorted().filter((shape) => shape.type !== 'group')
	const labelled = shapes.filter((shape) => getText(editor, shape))
	for (
		let frame = 0;
		frame < 60 && !labelled.every((shape) => getRenderedLabel(editor, shape));
		frame++
	) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}

	const findings: MermaidReadabilityFinding[] = []
	const lines = new Map<TLShapeId, Box[]>()
	for (const shape of labelled) {
		const label = getText(editor, shape)
		const element = getRenderedLabel(editor, shape)
		if (!element) {
			findings.push({ check: 'label not rendered', label })
			continue
		}
		lines.set(shape.id, measureTextLines(editor, element))
		for (const word of findMidWordBreaks(element)) {
			findings.push({ check: 'mid-word break', label, word })
		}
	}

	findings.push(...findOverlaps(editor, shapes, lines))
	findings.push(...findMissingText(editor, shapes, mermaidSvg))

	return [...new Map(findings.map((finding) => [JSON.stringify(finding), finding])).values()]
}

function getText(editor: Editor, shape: TLShape) {
	return (editor.getShapeUtil(shape).getText(shape) ?? '').trim()
}

function describe(editor: Editor, shape: TLShape) {
	const text = getText(editor, shape)
	if (text) return text
	if (shape.type === 'geo') return `${(shape.props as { geo: string }).geo} with no text`
	return shape.type
}

function getRenderedLabel(editor: Editor, shape: TLShape) {
	const element = editor.getContainer().querySelector(`[data-shape-id="${shape.id}"] .tl-rich-text`)
	return element?.getClientRects().length ? element : null
}

function* getTextNodes(root: Node) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	for (let node = walker.nextNode(); node; node = walker.nextNode()) yield node as Text
}

function toPageBox(editor: Editor, rect: DOMRect) {
	const topLeft = editor.screenToPage({ x: rect.left, y: rect.top })
	const bottomRight = editor.screenToPage({ x: rect.right, y: rect.bottom })
	return Box.FromPoints([topLeft, bottomRight])
}

function measureTextLines(editor: Editor, element: Element) {
	const boxes: Box[] = []
	const range = document.createRange()
	for (const node of getTextNodes(element)) {
		range.selectNodeContents(node)
		for (const rect of range.getClientRects()) {
			if (rect.width > 0 && rect.height > 0) boxes.push(toPageBox(editor, rect))
		}
	}
	return boxes
}

function getGlyphBox(box: Box) {
	const insetX = box.h * GLYPH_INSET_X
	const insetY = box.h * GLYPH_INSET_Y
	return new Box(box.x + insetX, box.y + insetY, box.w - insetX * 2, box.h - insetY * 2)
}

/**
 * Browsers only break between two letters or digits when a word is wider than its line, so a line
 * change between them always means the label is too narrow for one of its words.
 */
function findMidWordBreaks(element: Element) {
	const broken: string[] = []
	const range = document.createRange()
	for (const block of element.querySelectorAll('p')) {
		const rects: DOMRect[] = []
		for (const node of getTextNodes(block)) {
			for (let i = 0; i < node.length; i++) {
				range.setStart(node, i)
				range.setEnd(node, i + 1)
				rects.push(range.getBoundingClientRect())
			}
		}
		for (const match of (block.textContent ?? '').matchAll(WORD)) {
			const word = match[0]
			for (let i = 1; i < word.length; i++) {
				const prev = rects[match.index + i - 1]
				const next = rects[match.index + i]
				const lineChange = Math.abs(next.top - prev.top) >= Math.min(prev.height, next.height) / 2
				if (prev.height && next.height && lineChange) {
					broken.push(`${word.slice(0, i)}/${word.slice(i)}`)
				}
			}
		}
	}
	return broken
}

/**
 * Includes the label's own shape outline, which catches text spilling out of it. Lines only count
 * when the arrow is bound to them: lifelines cross message and frame labels in mermaid's own
 * rendering too.
 */
function findOverlaps(editor: Editor, shapes: TLShape[], lines: Map<TLShapeId, Box[]>) {
	const findings: MermaidReadabilityFinding[] = []
	const glyphs = new Map([...lines].map(([id, boxes]) => [id, boxes.map(getGlyphBox)]))
	const outlines = new Map(
		shapes
			.filter((shape) => shape.type === 'geo' || shape.type === 'line')
			.map((shape) => [shape.id, getPageOutline(editor, shape)])
	)

	for (const shape of shapes) {
		const labelGlyphs = glyphs.get(shape.id)
		if (!labelGlyphs) continue
		const boundIds =
			shape.type === 'arrow'
				? editor.getBindingsFromShape(shape, 'arrow').map((binding) => binding.toId)
				: []

		for (const other of shapes) {
			const outline =
				other.type === 'geo' || boundIds.includes(other.id) ? outlines.get(other.id) : undefined
			const otherGlyphs = other.id === shape.id ? undefined : glyphs.get(other.id)
			const overlaps = labelGlyphs.some(
				(box) =>
					(outline && outlineCrossesBox(outline, box)) ||
					otherGlyphs?.some((otherBox) => boxesOverlap(box, otherBox))
			)
			if (overlaps) {
				findings.push({
					check: 'overlap',
					label: getText(editor, shape),
					over: other.id === shape.id ? 'its own outline' : describe(editor, other),
				})
			}
		}
	}
	return findings
}

function getPageOutline(editor: Editor, shape: TLShape) {
	const geometry = editor.getShapeGeometry(shape)
	const body =
		geometry instanceof Group2d
			? (geometry.children.find((child) => !child.isLabel) ?? geometry)
			: geometry
	return {
		isClosed: body.isClosed,
		vertices: editor.getShapePageTransform(shape.id).applyToPoints(body.vertices),
	}
}

function outlineCrossesBox(outline: { isClosed: boolean; vertices: VecLike[] }, box: Box) {
	if (outline.vertices.some((point) => box.containsPoint(point))) return true
	const intersect = outline.isClosed ? intersectLineSegmentPolygon : intersectLineSegmentPolyline
	return box.sides.some(([a, b]) => intersect(a, b, outline.vertices))
}

function boxesOverlap(a: Box, b: Box) {
	return (
		Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) &&
		Math.min(a.maxY, b.maxY) > Math.max(a.minY, b.minY)
	)
}

function getWords(text: string) {
	return text.toLowerCase().match(WORD) ?? []
}

/**
 * Every piece of text mermaid draws should appear somewhere in the converted shapes. Words are
 * compared rather than whole strings because the conversion legitimately joins some runs, such as
 * a frame's keyword and its condition, or a message's sequence number and its text.
 */
function findMissingText(editor: Editor, shapes: TLShape[], mermaidSvg: Element) {
	const available = shapes.flatMap((shape) => getWords(getText(editor, shape)))
	const runs = [
		...mermaidSvg.querySelectorAll('foreignObject'),
		...[...mermaidSvg.querySelectorAll('text')].flatMap((text) => {
			const spans = [...text.querySelectorAll('tspan')]
			return spans.length ? spans : [text]
		}),
	].map((element) => element.textContent ?? '')

	const findings: MermaidReadabilityFinding[] = []
	for (const run of runs) {
		let missing = false
		for (const word of getWords(run)) {
			const index = available.indexOf(word)
			if (index < 0) missing = true
			else available.splice(index, 1)
		}
		if (missing) findings.push({ check: 'missing text', text: run.trim() })
	}
	return findings
}
