import type { Editor } from 'tldraw'
import { expect } from 'vitest'
import type { CanvasAction } from '../schema'
import type { AgentRun } from './agent'
import {
	arrows,
	boardProblems,
	boundArrows,
	byText,
	card,
	changed,
	contains,
	overlaps,
	seed,
	shapes,
	snapshot,
	solids,
	type ShapeState,
} from './board'

/**
 * Cases adapted from the tldraw-offline agent evals (tldraw-internal
 * apps/public/desktop/agent-evals/CASES.md), minus the ones about scripts, pages, images,
 * comments, saving, and collaboration, which canvas ops don't cover. Numbers in names are the
 * offline case numbers.
 */

type Board = Map<string, ShapeState>
export interface Graded {
	before: Board
	after: Board
	run: AgentRun
	problems: { before: string[]; after: string[] }
}
export interface Case {
	name: string
	setup?(editor: Editor): void
	task: string
	check(graded: Graded): void
}

const newProblems = ({ problems }: Graded) =>
	problems.after.filter((p) => !problems.before.includes(p))
const added = ({ before, after }: Graded) => shapes(after).filter((s) => !before.has(s.id))
const centre = (s: ShapeState) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 })

const crowded: CanvasAction[] = [
	card('todo', 'Backlog', 0, 0),
	card('doing', 'In progress', 260, 0),
	card('done', 'Shipped', 520, 0),
	card('bugs', 'Bug triage', 0, 160),
	card('docs', 'Docs pass', 260, 160),
	card('perf', 'Perf budget', 520, 160),
]

export const cases: Case[] = [
	{
		name: '01 follow a bound arrow, then reconnect it',
		setup: (editor) =>
			seed(editor, [
				card('a', 'A', 0, 0),
				card('b', 'B', 300, 0),
				card('c', 'C', 600, 160),
				card('d', 'D', 900, 0),
				{ type: 'create_arrow', id: 'a-b', from: { shapeId: 'a' }, to: { shapeId: 'b' } },
				{ type: 'create_arrow', id: 'b-d', from: { shapeId: 'b' }, to: { shapeId: 'd' } },
			]),
		task: 'Which step comes after B in this flow? Make it go to C instead.',
		check: (g) => {
			expect(g.run.answer).toMatch(/\bD\b/)
			expect(arrows(g.after)).toHaveLength(2)
			expect(
				boundArrows(g.after)
					.map((a) => `${a.start}->${a.end}`)
					.sort()
			).toEqual(['a->b', 'b->c'])
			expect(changed(g.before, g.after, ['a', 'b', 'c', 'd'])).toEqual([])
		},
	},
	{
		name: '03 repair overflow without touching the neighbour',
		setup: (editor) =>
			seed(editor, [
				card('left', 'Left', 0, 0, 120, 100),
				card('stuffed', 'Internationalization roadmap', 150, 0, 160, 100),
				card('fits', 'Fits fine', 700, 0),
				card('note-a', 'Note A', 0, 400, 120, 80),
				card('note-b', 'Note B', 80, 440, 120, 80),
			]),
		task: "One of the shapes has label text that spills outside the shape. Fix it so every label fits, without changing what any label says. Don't move or change any other shape.",
		check: (g) => {
			expect(g.problems.after.filter((p) => p.includes('spills'))).toEqual([])
			expect(newProblems(g)).toEqual([])
			expect(g.after.get('stuffed')?.text).toBe('Internationalization roadmap')
			expect(changed(g.before, g.after, ['left', 'fits', 'note-a', 'note-b'])).toEqual([])
		},
	},
	{
		name: '04 align and distribute',
		setup: (editor) =>
			seed(editor, [
				card('c1', 'One', 0, 0, 160, 80),
				card('c2', 'Two', 190, 12, 160, 80),
				card('c3', 'Three', 390, -10, 160, 80),
				card('c4', 'Four', 570, 15, 160, 80),
				card('c5', 'Five', 790, -5, 160, 80),
			]),
		task: 'Line these up in a neat row with even spacing.',
		check: (g) => {
			const row = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => g.after.get(id)!)
			const ys = row.map((s) => s.y)
			expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(1)
			const sorted = [...row].sort((a, b) => a.x - b.x)
			expect(sorted.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5'])
			const gaps = sorted.slice(1).map((s, i) => s.x - (sorted[i].x + sorted[i].w))
			expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(2)
			expect(Math.min(...gaps)).toBeGreaterThan(0)
			for (const s of row) expect([s.w, s.h]).toEqual([160, 80])
		},
	},
	{
		name: '08 ambiguous target',
		setup: (editor) => seed(editor, crowded),
		task: 'Make the important one stand out.',
		check: (g) => {
			expect(g.run.batches, 'no edits attempted').toEqual([])
			expect(changed(g.before, g.after)).toEqual([])
			expect(g.after.size).toBe(g.before.size)
			expect(g.run.answer).toMatch(/which (one|card|shape)|what do you mean|important/i)
		},
	},
	{
		name: '11 large board, targeted change',
		setup: (editor) => {
			const actions: CanvasAction[] = []
			for (let i = 0; i < 400; i++) {
				const q3 = i % 24 === 5
				actions.push(
					card(
						`k${i}`,
						q3 ? `Q3 launch item ${i}` : `Task ${i}`,
						(i % 20) * 240,
						Math.floor(i / 20) * 140
					)
				)
			}
			seed(editor, actions)
		},
		task: 'Recolour every card that mentions Q3 blue.',
		check: (g) => {
			const q3 = shapes(g.before)
				.filter((s) => s.text.includes('Q3'))
				.map((s) => s.id)
			expect(q3).toHaveLength(17)
			const blue = shapes(g.after)
				.filter((s) => s.color === 'blue')
				.map((s) => s.id)
			expect(blue.sort()).toEqual([...q3].sort())
			const others = [...g.before.keys()].filter((id) => !q3.includes(id))
			expect(changed(g.before, g.after, others)).toEqual([])
			expect(g.run.batches.length).toBeLessThanOrEqual(3)
		},
	},
	{
		name: '12 freehand loops',
		task: 'Draw three overlapping freehand loops on the board.',
		check: (g) => {
			const loops = added(g).filter((s) => s.type === 'draw' || s.type === 'line')
			expect(loops.length).toBeGreaterThanOrEqual(3)
			const overlapping = loops.filter((a) => loops.some((b) => a !== b && overlaps(a, b)))
			expect(overlapping.length).toBeGreaterThanOrEqual(3)
		},
	},
	{
		name: '13 a card carries its words as its label',
		task: 'Make a card with a simple pancake recipe on it: a title and three or four short steps.',
		check: (g) => {
			const recipe = solids(g.after).find((s) => s.type === 'geo' && /pancake/i.test(s.text))
			expect(recipe, 'a geo card whose own label mentions pancakes').toBeDefined()
			expect(recipe!.text.split('\n').filter((l) => l.trim()).length).toBeGreaterThanOrEqual(4)
			const floating = shapes(g.after).filter((s) => s.type === 'text' && overlaps(s, recipe!))
			expect(
				floating.map((s) => s.id),
				'text shapes laid over the card'
			).toEqual([])
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '14 canary: five weekday cards',
		task: 'Create five cards, one for each weekday Monday to Friday, each with one short line about a typical plan for that day.',
		check: (g) => {
			for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
				expect(
					shapes(g.after).filter((s) => s.text.includes(day)),
					day
				).toHaveLength(1)
			}
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '15 two flows from prose, side by side',
		task: 'Compare our old signup flow and the new one side by side. Old: email, password, confirm email, done. New: email, magic link, done.',
		check: (g) => {
			expect(solids(g.after).length).toBeGreaterThanOrEqual(7)
			expect(boundArrows(g.after).length).toBeGreaterThanOrEqual(5)
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '16 ticket states, no diagram vocabulary',
		task: 'Show what states a support ticket can be in and how it moves between them.',
		check: (g) => {
			expect(solids(g.after).length).toBeGreaterThanOrEqual(4)
			expect(boundArrows(g.after).length).toBeGreaterThanOrEqual(3)
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '17 extend an existing diagram',
		setup: (editor) =>
			seed(editor, [
				card('opened', 'PR opened', 0, 0),
				card('review', 'Review', 300, 0),
				card('verdict', 'Verdict', 600, 0),
				card('merged', 'Merged', 900, 0),
				{ type: 'create_arrow', id: 'e1', from: { shapeId: 'opened' }, to: { shapeId: 'review' } },
				{ type: 'create_arrow', id: 'e2', from: { shapeId: 'review' }, to: { shapeId: 'verdict' } },
				{ type: 'create_arrow', id: 'e3', from: { shapeId: 'verdict' }, to: { shapeId: 'merged' } },
			]),
		task: "Add a 'Rejected' outcome to the flowchart: the verdict can also lead to Rejected, which ends the flow.",
		check: (g) => {
			for (const id of g.before.keys()) expect(g.after.has(id), id).toBe(true)
			const rejected = solids(g.after).find((s) => /rejected/i.test(s.text))
			expect(rejected, 'a Rejected node').toBeDefined()
			const fresh = added(g).filter((s) => s.type !== 'arrow')
			expect(fresh.length).toBeGreaterThanOrEqual(1)
			expect(fresh.length).toBeLessThanOrEqual(3)
			expect(
				boundArrows(g.after).some((a) => a.start === 'verdict' && a.end === rejected!.id)
			).toBe(true)
			expect(changed(g.before, g.after, ['opened', 'review', 'verdict', 'merged'])).toEqual([])
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '18 kanban board',
		task: 'Set up a kanban board with To do, Doing, Done columns and a few cards in each.',
		check: (g) => {
			expect(arrows(g.after)).toEqual([])
			const all = solids(g.after)
			const columns = all.filter(
				(c) => c.type === 'geo' && all.filter((s) => s !== c && contains(c, s)).length >= 2
			)
			expect(columns.length, 'columns holding at least two cards').toBeGreaterThanOrEqual(3)
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '27 dots on a circle outline',
		setup: (editor) =>
			seed(editor, [
				{
					type: 'create_shape',
					id: 'planet',
					geo: 'ellipse',
					x: 200,
					y: 200,
					w: 300,
					h: 300,
					text: 'Planet',
				},
			]),
		task: "Put four small dots on the outline of the 'Planet' circle: one at the top-left, one at the top-right, one at the bottom-left and one at the bottom-right.",
		check: (g) => {
			expect(changed(g.before, g.after, ['planet'])).toEqual([])
			const dots = added(g).filter((s) => s.type !== 'arrow' && s.w <= 40 && s.h <= 40)
			const c = { x: 350, y: 350 }
			const onOutline = dots.filter((d) => {
				const p = centre(d)
				return Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - 150) <= 4 + Math.max(d.w, d.h) / 2
			})
			const quadrant = (d: ShapeState) =>
				`${centre(d).y < c.y ? 'top' : 'bottom'}-${centre(d).x < c.x ? 'left' : 'right'}`
			expect(new Set(onOutline.map(quadrant)).size).toBe(4)
		},
	},
	{
		name: '28 bracket labels inside the panel',
		setup: (editor) =>
			seed(editor, [
				{ type: 'create_text', id: 'title', text: 'Pipeline', x: 0, y: -60 },
				{
					type: 'create_shape',
					id: 'pipeline',
					geo: 'rectangle',
					x: 0,
					y: 0,
					w: 760,
					h: 260,
					dash: 'dashed',
				},
				card('fetch', 'Fetch', 40, 120, 180, 80),
				card('parse', 'Parse', 290, 120, 180, 80),
				card('store', 'Store', 540, 120, 180, 80),
			]),
		task: "Add a bracket above 'Fetch' and 'Parse' labelled 'input side', and one above 'Store' labelled 'output side'. Keep everything inside the Pipeline panel and don't resize it.",
		check: (g) => {
			const panel = g.after.get('pipeline')!
			for (const label of [/input side/i, /output side/i])
				expect(contains(panel, byText(g.after, label))).toBe(true)
			expect(changed(g.before, g.after, ['pipeline', 'fetch', 'parse', 'store'])).toEqual([])
			expect(newProblems(g)).toEqual([])
		},
	},
	{
		name: '29 a chart drawn on a paper fits it',
		setup: (editor) =>
			seed(editor, [
				{ type: 'create_shape', id: 'paper', geo: 'rectangle', x: 0, y: 0, w: 720, h: 480 },
			]),
		task: "Draw a simple bar chart on the box called 'paper': Mon 4, Tue 7, Wed 5, with labelled axes. Everything should fit on the paper; don't resize it.",
		check: (g) => {
			const paper = g.after.get('paper')!
			expect(changed(g.before, g.after, ['paper'])).toEqual([])
			const fresh = added(g).filter((s) => s.type !== 'arrow')
			expect(fresh.length).toBeGreaterThanOrEqual(3)
			expect(
				fresh.filter((s) => !contains(paper, s)).map((s) => s.id),
				'shapes off the paper'
			).toEqual([])
			expect(newProblems(g)).toEqual([])
		},
	},
]

/** Grade a finished run: snapshot the board after and collect problems on both sides. */
export function grade(
	editor: Editor,
	before: Board,
	problemsBefore: string[],
	run: AgentRun
): Graded {
	const after = snapshot(editor)
	return {
		before,
		after,
		run,
		problems: { before: problemsBefore, after: boardProblems(editor, after) },
	}
}
