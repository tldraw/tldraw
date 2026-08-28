/**
 * A canvas linter for CI — batch document checks with optional auto-fix.
 *
 * Teams that treat canvases as living documents (architecture boards, runbooks, planning
 * docs) end up wanting the same thing they have for code: a check that runs on a schedule
 * or in CI, flags rot, and optionally fixes it. Headless, that's just: load the document,
 * query it with the editor's geometry APIs, mutate, save.
 *
 * The rules here are small but real:
 * - `empty-note`   — sticky notes whose text is empty (usually an accidental double-click)
 * - `stray-shape`  — content far outside the board area nobody will ever scroll to
 * - `overlap`      — boxes covering each other (someone dropped a shape on a shape)
 *
 * The shape of the whole thing is the pattern to steal: `lint()` returns data; `fix()` is a
 * separate pass wrapped in one history mark (a single undo) that tolerates shapes an
 * earlier fix already deleted; and because fixes can cascade — packing overlapping boxes
 * can nudge one into a *new* overlap — the runner re-lints to a fixed point with a pass
 * cap instead of assuming one pass suffices. Check-only mode exits non-zero for CI.
 *
 * Run it: yarn tsx packages/headless/examples/document-lint.ts [--check]
 */
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Box, Editor, TLGeoShape, TLNoteShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { createHeadlessEditor } from '@tldraw/headless'
import { toRichText } from '@tldraw/tlschema'
import { renderPlaintextFromRichText } from 'tldraw/headless-defaults'

const BOARD = new Box(0, 0, 1600, 1000)

export interface LintIssue {
	rule: 'empty-note' | 'stray-shape' | 'overlap'
	ids: TLShapeId[]
	message: string
}

/** Overlap means shared area — boxes laid out flush against each other are fine. */
function overlapArea(a: Box, b: Box) {
	const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
	const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
	return Math.max(0, w) * Math.max(0, h)
}

export function lint(editor: Editor): LintIssue[] {
	const issues: LintIssue[] = []
	const shapes = editor.getCurrentPageShapes()

	for (const shape of shapes) {
		if (shape.type === 'note') {
			const text = renderPlaintextFromRichText(editor, (shape as TLNoteShape).props.richText)
			if (text.trim() === '') {
				issues.push({ rule: 'empty-note', ids: [shape.id], message: `empty note ${shape.id}` })
			}
		}
		// Bounds can be undefined for some shapes (e.g. a fully unbound arrow) — skip, don't crash
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		// `includes` is collides-or-contains: true whenever any part of the shape touches the board
		if (!BOARD.includes(bounds)) {
			issues.push({
				rule: 'stray-shape',
				ids: [shape.id],
				message: `${shape.type} ${shape.id} is at ${Math.round(bounds.x)},${Math.round(bounds.y)}, nowhere near the board`,
			})
		}
	}

	const boxes = shapes.filter((s): s is TLGeoShape => s.type === 'geo')
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			const a = editor.getShapePageBounds(boxes[i].id)!
			const b = editor.getShapePageBounds(boxes[j].id)!
			if (overlapArea(a, b) > 0) {
				issues.push({
					rule: 'overlap',
					ids: [boxes[i].id, boxes[j].id],
					message: `${boxes[i].id} and ${boxes[j].id} overlap`,
				})
			}
		}
	}

	return issues
}

export function fix(editor: Editor, issues: LintIssue[]) {
	// One mark for the whole fix pass: in an interactive session this makes the entire
	// cleanup a single undo; in a script it's a free consistency boundary.
	editor.markHistoryStoppingPoint('lint fixes')

	// Strays are parked along the board's bottom edge, each in its own slot — a single
	// constant target would pile them on top of each other and manufacture new overlaps.
	let straySlot = 0
	for (const issue of issues) {
		if (issue.rule === 'overlap') continue // handled as components below
		// A shape can carry several issues (an empty note that's also off-board); an
		// earlier fix may have deleted it, so re-check existence instead of asserting it.
		const shape = editor.getShape(issue.ids[0])
		if (!shape) continue
		switch (issue.rule) {
			case 'empty-note':
				editor.deleteShapes(issue.ids)
				break
			case 'stray-shape': {
				const bounds = editor.getShapePageBounds(shape.id)
				if (!bounds) break
				editor.updateShape({
					id: shape.id,
					type: shape.type,
					x: 40 + straySlot * 260,
					y: BOARD.maxY - bounds.h - 40,
				})
				straySlot++
				break
			}
		}
	}

	// Overlaps are packed once per connected component, not once per pair — three mutually
	// overlapping boxes are one packing problem, and packing pairs separately just shuffles
	// the overlap around.
	const componentOf = new Map<TLShapeId, Set<TLShapeId>>()
	for (const issue of issues) {
		if (issue.rule !== 'overlap') continue
		const [a, b] = issue.ids
		const merged = new Set([...(componentOf.get(a) ?? [a]), ...(componentOf.get(b) ?? [b])])
		for (const id of merged) componentOf.set(id, merged)
	}
	for (const component of new Set(componentOf.values())) {
		const ids = [...component].filter((id) => editor.getShape(id))
		if (ids.length > 1) editor.packShapes(ids, 24)
	}
}

/** Build a deliberately messy board so the linter has something to find. */
function seedMessyBoard(editor: Editor) {
	editor.createShape<TLGeoShape>({
		id: createShapeId(),
		type: 'geo',
		x: 100,
		y: 100,
		props: { w: 220, h: 120, richText: toRichText('Auth service'), color: 'blue' },
	})
	// Two boxes dropped on top of each other
	editor.createShape<TLGeoShape>({
		id: createShapeId(),
		type: 'geo',
		x: 500,
		y: 100,
		props: { w: 220, h: 120, richText: toRichText('Billing'), color: 'violet' },
	})
	editor.createShape<TLGeoShape>({
		id: createShapeId(),
		type: 'geo',
		x: 560,
		y: 140,
		props: { w: 220, h: 120, richText: toRichText('Invoices'), color: 'violet' },
	})
	// An accidental empty note
	editor.createShape<TLNoteShape>({
		id: createShapeId(),
		type: 'note',
		x: 900,
		y: 120,
		props: { richText: toRichText('') },
	})
	// An empty note someone also flung into deep space — one shape, two issues, which is
	// exactly the case a fix pass must survive (the empty-note fix deletes it before the
	// stray-shape fix runs)
	editor.createShape<TLNoteShape>({
		id: createShapeId(),
		type: 'note',
		x: 18_000,
		y: -6_000,
		props: { richText: toRichText('') },
	})
}

const MAX_FIX_PASSES = 3

export async function run(
	{ checkOnly = false }: { checkOnly?: boolean } = {},
	log: (message: string) => void = console.log
) {
	// In production you'd `loadSnapshot(editor.store, ...)` from your persistence layer or
	// parse a .tldr file here (see generate-tldr.ts); the seeded board keeps this runnable.
	const editor = createHeadlessEditor()
	try {
		seedMessyBoard(editor)

		const issues = lint(editor)
		log(`${issues.length} issue(s):`)
		for (const issue of issues) log(`  [${issue.rule}] ${issue.message}`)

		if (checkOnly) {
			return { issues, fixed: false }
		}

		// Fixes can cascade, so iterate to a fixed point with a cap.
		let remaining = issues
		for (let pass = 0; pass < MAX_FIX_PASSES && remaining.length > 0; pass++) {
			fix(editor, remaining)
			remaining = lint(editor)
			log(`after fix pass ${pass + 1}: ${remaining.length} issue(s)`)
		}
		if (remaining.length > 0) {
			throw new Error(
				`fixes did not converge after ${MAX_FIX_PASSES} passes: ${remaining.map((i) => i.message).join('; ')}`
			)
		}
		return { issues, fixed: true }
	} finally {
		editor.dispose()
	}
}

const isMain = (() => {
	if (!process.argv[1]) return false
	try {
		return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
})()
if (isMain) {
	const checkOnly = process.argv.includes('--check')
	run({ checkOnly })
		.then(({ issues, fixed }) => {
			// CI semantics: red when problems exist and we weren't allowed to fix them.
			if (!fixed && issues.length > 0) process.exit(1)
		})
		.catch((e) => {
			console.error(e)
			process.exit(1)
		})
}
