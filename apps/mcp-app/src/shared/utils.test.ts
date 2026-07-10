import { describe, expect, it } from 'vitest'
import { computeExecKey } from './exec-key'
import { generateCanvasId } from './utils'

describe('generateCanvasId', () => {
	it('produces 26-char base36 ids (bearer-capability entropy)', () => {
		const id = generateCanvasId()
		expect(id).toMatch(/^[a-z0-9]{26}$/)
	})

	it('produces unique ids', () => {
		const ids = new Set(Array.from({ length: 1000 }, () => generateCanvasId()))
		expect(ids.size).toBe(1000)
	})
})

describe('computeExecKey', () => {
	it('is deterministic for the same code', async () => {
		expect(await computeExecKey('editor.createShape({})')).toBe(
			await computeExecKey('editor.createShape({})')
		)
	})

	it('differs for different code', async () => {
		expect(await computeExecKey('a()')).not.toBe(await computeExecKey('b()'))
	})

	it('folds the canvasId in so identical code on different bases cannot collide', async () => {
		const code = 'editor.createShape({})'
		const bare = await computeExecKey(code)
		const withBase = await computeExecKey(code, 'canvas123')
		const withOtherBase = await computeExecKey(code, 'canvas456')
		expect(withBase).not.toBe(bare)
		expect(withBase).not.toBe(withOtherBase)
	})
})
