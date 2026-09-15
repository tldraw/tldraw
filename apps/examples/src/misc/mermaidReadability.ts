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
	| {
			check: 'missing shapes'
			shapes: 'connectors' | 'lifelines' | 'shapes with no text'
			mermaid: number
			converted: number
	  }
	| { check: 'label not rendered'; label: string }

let nextSvgId = 0

// A text run's client rect spans the font's full ascent and descent, which is well clear of the
// glyphs. Two labels stacked a line apart touch at those edges without any ink colliding, so
// overlaps are measured against this inner part of each line instead.
const GLYPH_INSET_Y = 0.2
const GLYPH_INSET_X = 0.05

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
	await waitForLabelsToRender(editor, labelled)

	const findings: MermaidReadabilityFinding[] = []
	const lines = new Map<TLShapeId, Box[]>()
	for (const shape of labelled) {
		const element = getRichTextElement(editor, shape.id)
		if (!element?.getClientRects().length) {
			findings.push({ check: 'label not rendered', label: getText(editor, shape) })
			continue
		}
		lines.set(shape.id, measureTextLines(editor, element))
		for (const word of findMidWordBreaks(element)) {
			findings.push({ check: 'mid-word break', label: getText(editor, shape), word })
		}
	}

	findings.push(...findOverlaps(editor, shapes, lines))
	findings.push(...findMissingText(editor, shapes, mermaidSvg))
	findings.push(...findMissingShapes(editor, shapes, mermaidSvg))

	const seen = new Set<string>()
	return findings.filter((finding) => {
		const key = JSON.stringify(finding)
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
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

function getRichTextElement(editor: Editor, id: TLShapeId) {
	return editor.getContainer().querySelector(`[data-shape-id="${id}"] .tl-rich-text`)
}

async function waitForLabelsToRender(editor: Editor, shapes: TLShape[]) {
	for (let frame = 0; frame < 60; frame++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
		if (shapes.every((shape) => getRichTextElement(editor, shape.id)?.getClientRects().length)) {
			return
		}
	}
}

function toPageBox(editor: Editor, rect: DOMRect) {
	const topLeft = editor.screenToPage({ x: rect.left, y: rect.top })
	const bottomRight = editor.screenToPage({ x: rect.right, y: rect.bottom })
	return Box.FromPoints([topLeft, bottomRight])
}

function measureTextLines(editor: Editor, element: Element) {
	const boxes: Box[] = []
	const range = document.createRange()
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
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

const WORD_CHARACTER = /[\p{L}\p{N}]/u

/**
 * Browsers only break between two letters or digits when a word is wider than its line, so a line
 * change between them always means the label is too narrow for one of its words.
 */
function findMidWordBreaks(element: Element) {
	const broken: string[] = []
	const range = document.createRange()
	for (const block of element.querySelectorAll('p')) {
		const characters: { char: string; top: number; height: number }[] = []
		const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = node.textContent ?? ''
			for (let i = 0; i < text.length; i++) {
				range.setStart(node, i)
				range.setEnd(node, i + 1)
				const rect = range.getBoundingClientRect()
				characters.push({ char: text[i], top: rect.top, height: rect.height })
			}
		}
		for (let i = 1; i < characters.length; i++) {
			const prev = characters[i - 1]
			const next = characters[i]
			if (!WORD_CHARACTER.test(prev.char) || !WORD_CHARACTER.test(next.char)) continue
			if (!prev.height || !next.height) continue
			if (Math.abs(next.top - prev.top) < Math.min(prev.height, next.height) / 2) continue
			let start = i - 1
			while (start > 0 && WORD_CHARACTER.test(characters[start - 1].char)) start--
			let end = i
			while (end < characters.length - 1 && WORD_CHARACTER.test(characters[end + 1].char)) end++
			const word = characters.map((c) => c.char)
			broken.push(`${word.slice(start, i).join('')}/${word.slice(i, end + 1).join('')}`)
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

	for (const shape of shapes) {
		const labelGlyphs = glyphs.get(shape.id)
		if (!labelGlyphs) continue
		const boundIds =
			shape.type === 'arrow'
				? editor.getBindingsFromShape(shape, 'arrow').map((binding) => binding.toId)
				: []

		for (const other of shapes) {
			let overlaps = false
			if (other.type === 'geo') {
				const outline = getPageOutline(editor, other)
				overlaps = labelGlyphs.some((box) => outlineCrossesBox(outline, box, 'closed'))
			}
			if (!overlaps && other.id !== shape.id && glyphs.has(other.id)) {
				overlaps = labelGlyphs.some((box) =>
					glyphs.get(other.id)!.some((otherBox) => boxesOverlap(box, otherBox))
				)
			}
			if (!overlaps && other.type === 'line' && boundIds.includes(other.id)) {
				const outline = getPageOutline(editor, other)
				overlaps = labelGlyphs.some((box) => outlineCrossesBox(outline, box, 'open'))
			}
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
	return editor.getShapePageTransform(shape.id).applyToPoints(body.vertices)
}

function outlineCrossesBox(outline: VecLike[], box: Box, kind: 'closed' | 'open') {
	if (outline.some((point) => box.containsPoint(point))) return true
	return box.sides.some(([a, b]) =>
		kind === 'closed'
			? intersectLineSegmentPolygon(a, b, outline)
			: intersectLineSegmentPolyline(a, b, outline)
	)
}

function boxesOverlap(a: Box, b: Box) {
	return (
		Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) &&
		Math.min(a.maxY, b.maxY) > Math.max(a.minY, b.minY)
	)
}

function getWords(text: string) {
	return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

/**
 * Every piece of text mermaid draws should appear somewhere in the converted shapes. Words are
 * compared rather than whole strings because the conversion legitimately joins some runs, such as
 * a frame's keyword and its condition, or a message's sequence number and its text.
 */
function findMissingText(editor: Editor, shapes: TLShape[], mermaidSvg: Element) {
	const available = new Map<string, number>()
	for (const shape of shapes) {
		for (const word of getWords(getText(editor, shape))) {
			available.set(word, (available.get(word) ?? 0) + 1)
		}
	}

	const runs: string[] = []
	for (const foreignObject of mermaidSvg.querySelectorAll('foreignObject')) {
		runs.push(foreignObject.textContent ?? '')
	}
	for (const text of mermaidSvg.querySelectorAll('text')) {
		const spans = text.querySelectorAll('tspan')
		for (const run of spans.length ? spans : [text]) runs.push(run.textContent ?? '')
	}

	const findings: MermaidReadabilityFinding[] = []
	for (const run of runs) {
		let missing = false
		for (const word of getWords(run)) {
			const count = available.get(word) ?? 0
			if (count === 0) missing = true
			else available.set(word, count - 1)
		}
		if (missing) findings.push({ check: 'missing text', text: run.trim() })
	}
	return findings
}

/** Shapes with no text can't be found by their words, so they are counted instead. */
function findMissingShapes(editor: Editor, shapes: TLShape[], mermaidSvg: Element) {
	const count = (predicate: (shape: TLShape) => boolean) => shapes.filter(predicate).length
	const comparisons = [
		{
			shapes: 'connectors' as const,
			mermaid: mermaidSvg.querySelectorAll('[data-et="edge"], [data-et="message"]').length,
			converted: count((shape) => shape.type === 'arrow'),
		},
		{
			shapes: 'lifelines' as const,
			mermaid: mermaidSvg.querySelectorAll('[data-et="life-line"]').length,
			converted: count((shape) => shape.type === 'line'),
		},
		{
			shapes: 'shapes with no text' as const,
			mermaid:
				[...mermaidSvg.querySelectorAll('g.node')].filter((node) => !node.textContent?.trim())
					.length + mermaidSvg.querySelectorAll('rect[class^="activation"], rect.rect').length,
			converted: count((shape) => shape.type === 'geo' && !getText(editor, shape)),
		},
	]
	return comparisons
		.filter((comparison) => comparison.converted < comparison.mermaid)
		.map((comparison) => ({ check: 'missing shapes' as const, ...comparison }))
}
