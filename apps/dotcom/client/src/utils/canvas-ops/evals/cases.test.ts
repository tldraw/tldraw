import { describe, expect, it } from 'vitest'
import { createTestEditor } from '../testEditor'
import type { AgentRun } from './agent'
import { boardProblems, snapshot } from './board'
import { cases, grade } from './cases'

/** A run that made no edits and said nothing. */
const idle: AgentRun = {
	answer: '',
	batches: [],
	turns: 0,
	usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	costUsd: 0,
	stopReason: 'end_turn',
	messages: [],
}

// Self-tests for the eval cases, no model: a fixture that drifts or a check that passes on an
// untouched board would make an eval pass for the wrong reason.
describe('canvas ops eval cases', () => {
	for (const c of cases) {
		it(`${c.name}: fails when the agent does nothing`, () => {
			const editor = createTestEditor()
			try {
				c.setup?.(editor)
				const before = snapshot(editor)
				const graded = grade(editor, before, boardProblems(editor, before), idle)
				expect(() => c.check(graded)).toThrow()
			} finally {
				editor.dispose()
			}
		})
	}

	it('the seeded boards start clean, except the one the repair case breaks', () => {
		const dirty: Record<string, string[]> = {}
		for (const c of cases) {
			const editor = createTestEditor()
			c.setup?.(editor)
			const problems = boardProblems(editor)
			if (problems.length) dirty[c.name] = problems
			editor.dispose()
		}
		expect(dirty).toEqual({
			'03 repair overflow without touching the neighbour': [
				'note-a overlaps note-b',
				'the label of stuffed spills out of it',
			],
		})
	})
})
