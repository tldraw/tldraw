import { Editor } from 'tldraw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BATCH_GAP } from '../constants'
import { makeEditor } from '../test/makeEditor'
import { MarketingAssetShape } from './assetShape'
import { MarketingAssetShapeUtil } from './AssetShapeUtil'
import {
	composeRefineGuidance,
	createAndGenerateBatch,
	createVariationsFromSelection,
	planBatch,
} from './batch'

// The batch module orchestrates the render seam and the byte conversions; stub them
// so the tests exercise the batch logic itself — what gets created where, and what
// each tile's render is asked for.
vi.mock('./renderVersion', () => ({
	renderFromBrief: vi.fn(async () => true),
}))
vi.mock('./assetBytes', () => ({
	blobToDataUrl: vi.fn(async () => 'data:selection'),
	urlToDataUrl: vi.fn(async () => 'data:background'),
}))

import { renderFromBrief } from './renderVersion'

const TILE = { w: 100, h: 200 }

describe('planBatch', () => {
	it.each([
		[1, 1, 1],
		[4, 2, 2],
		[8, 3, 3],
		[12, 4, 3],
	])('lays out %i tiles as %i columns by %i rows', (count, cols, rows) => {
		const plan = planBatch({ prompt: 'p', count, tile: TILE })
		expect(plan).toMatchObject({ cols, rows })
		expect(plan.tiles).toHaveLength(count)
		expect(plan.gridW).toBe(cols * TILE.w + (cols - 1) * BATCH_GAP)
		expect(plan.gridH).toBe(rows * TILE.h + (rows - 1) * BATCH_GAP)
	})

	it('positions tiles row-major with the gap between them', () => {
		const plan = planBatch({ prompt: 'p', count: 4, tile: TILE })
		expect(plan.tiles.map(({ x, y }) => ({ x, y }))).toEqual([
			{ x: 0, y: 0 },
			{ x: TILE.w + BATCH_GAP, y: 0 },
			{ x: 0, y: TILE.h + BATCH_GAP },
			{ x: TILE.w + BATCH_GAP, y: TILE.h + BATCH_GAP },
		])
	})

	it('clamps the count to at least one whole tile', () => {
		expect(planBatch({ prompt: 'p', count: 0, tile: TILE }).tiles).toHaveLength(1)
		expect(planBatch({ prompt: 'p', count: 2.9, tile: TILE }).tiles).toHaveLength(2)
	})

	it('gives the first tile the bare brief and later tiles distinct direction hints', () => {
		const plan = planBatch({ prompt: 'the brief', count: 4, tile: TILE })
		expect(plan.tiles[0].prompt).toBe('the brief')
		const hinted = plan.tiles.slice(1).map((t) => t.prompt)
		for (const prompt of hinted) {
			expect(prompt.startsWith('the brief\n')).toBe(true)
		}
		expect(new Set(hinted).size).toBe(hinted.length)
	})

	it('adds no direction hint to a batch of one', () => {
		const plan = planBatch({ prompt: 'the brief', count: 1, tile: TILE })
		expect(plan.tiles[0].prompt).toBe('the brief')
	})

	it('folds feedback into every tile, between the brief and the hint', () => {
		const plan = planBatch({ prompt: 'the brief', feedback: 'more blue', count: 2, tile: TILE })
		expect(plan.tiles[0].prompt).toBe('the brief\nmore blue')
		expect(plan.tiles[1].prompt.split('\n').slice(0, 2)).toEqual(['the brief', 'more blue'])
	})

	it('gives every tile of a multi-tile batch a distinct caption angle, and a single tile none', () => {
		const single = planBatch({ prompt: 'p', count: 1, tile: TILE })
		expect(single.tiles[0].captionAngle).toBeUndefined()

		const plan = planBatch({ prompt: 'p', count: 8, tile: TILE })
		const angles = plan.tiles.map((t) => t.captionAngle)
		for (const angle of angles) expect(angle).toBeTruthy()
		expect(new Set(angles).size).toBe(angles.length)
	})
})

describe('composeRefineGuidance', () => {
	it('returns an empty string when there is nothing to say', () => {
		expect(composeRefineGuidance({ notes: '  ', referenceCount: 0, rejectedCount: 0 })).toBe('')
	})

	it('passes the reviewer notes through', () => {
		expect(
			composeRefineGuidance({ notes: ' less text ', referenceCount: 0, rejectedCount: 0 })
		).toBe('Reviewer notes: less text')
	})

	it('mentions references and rejections only when present', () => {
		const all = composeRefineGuidance({ notes: 'n', referenceCount: 2, rejectedCount: 1 })
		expect(all).toContain('Reviewer notes: n')
		expect(all).toContain('approved ideas')
		expect(all).toContain('rejected directions')

		const refsOnly = composeRefineGuidance({ notes: '', referenceCount: 2, rejectedCount: 0 })
		expect(refsOnly).toContain('approved ideas')
		expect(refsOnly).not.toContain('rejected')
	})
})

describe('createAndGenerateBatch', () => {
	let editor: Editor

	beforeEach(() => {
		vi.clearAllMocks()
		editor = makeEditor([MarketingAssetShapeUtil])
	})

	function assetShapes(): MarketingAssetShape[] {
		return editor
			.getCurrentPageShapes()
			.filter((s): s is MarketingAssetShape => s.type === 'marketing-asset')
	}

	it('creates one generating shape per tile and starts a render for each', () => {
		const ids = createAndGenerateBatch(editor, {
			prompt: 'the brief',
			outputTypeId: 'ig-square',
			count: 4,
		})

		expect(ids).toHaveLength(4)
		const shapes = assetShapes()
		expect(shapes).toHaveLength(4)
		for (const shape of shapes) {
			expect(shape.props).toMatchObject({ status: 'generating', prompt: 'the brief' })
		}
		// Shapes sit in a 2×2 grid: two distinct x positions, two distinct y positions.
		expect(new Set(shapes.map((s) => s.x)).size).toBe(2)
		expect(new Set(shapes.map((s) => s.y)).size).toBe(2)

		expect(renderFromBrief).toHaveBeenCalledTimes(4)
		const prompts = vi.mocked(renderFromBrief).mock.calls.map(([, , input]) => input.prompt)
		expect(new Set(prompts).size).toBe(4) // each tile renders its own planned prompt
	})

	it('passes the references and caption angle through to each tile render', () => {
		createAndGenerateBatch(editor, {
			prompt: 'p',
			outputTypeId: 'ig-square',
			count: 2,
			references: ['ref-1'],
		})

		for (const [, , input] of vi.mocked(renderFromBrief).mock.calls) {
			expect(input.references).toEqual(['ref-1'])
			expect(input.captionAngle).toBeTruthy()
		}
	})

	it('selects the new shapes', () => {
		const ids = createAndGenerateBatch(editor, { prompt: 'p', outputTypeId: 'ig-square', count: 4 })
		expect([...editor.getSelectedShapeIds()].sort()).toEqual([...ids].sort())
	})
})

describe('createVariationsFromSelection', () => {
	let editor: Editor

	beforeEach(() => {
		vi.clearAllMocks()
		editor = makeEditor([MarketingAssetShapeUtil])
		editor.toImage = vi.fn(async () => ({ blob: new Blob(), width: 1, height: 1 })) as never
	})

	it('does nothing without a selection', async () => {
		await createVariationsFromSelection(editor, {
			prompt: 'p',
			outputTypeId: 'ig-square',
			count: 2,
		})
		expect(renderFromBrief).not.toHaveBeenCalled()
	})

	it('exports the selection once and seeds every tile with it as a reference', async () => {
		editor.createShape({ type: 'geo', x: 0, y: 0 })
		editor.selectAll()

		await createVariationsFromSelection(editor, {
			prompt: 'p',
			outputTypeId: 'ig-square',
			count: 2,
		})

		expect(editor.toImage).toHaveBeenCalledTimes(1)
		expect(renderFromBrief).toHaveBeenCalledTimes(2)
		for (const [, , input] of vi.mocked(renderFromBrief).mock.calls) {
			expect(input.references).toEqual(['data:selection'])
			expect(input.prompt).toContain('selected as inspiration')
		}
	})
})
