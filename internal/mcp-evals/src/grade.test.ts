import { describe, expect, it } from 'vitest'
import { extractAnswer, extractAnswerBlock } from './agents/claude.js'
import { gradeDescribe, gradeFindMany, gradeLocate } from './grade.js'
import type { DescribeTask, FindManyTask, LocateTask } from './types.js'

const locateTask: LocateTask = {
	id: 'locate',
	type: 'locate',
	board: 'b',
	prompt: 'find it',
	expect: { page: 1, box: [0.2, 0.2, 0.4, 0.4] },
}

describe('gradeLocate', () => {
	it('passes when the predicted box centers on the target', () => {
		expect(gradeLocate(locateTask, { page: 1, box: [0.25, 0.25, 0.35, 0.35] })).toMatchObject({
			score: 1,
			pass: true,
		})
	})

	it('fails on the right box but the wrong page', () => {
		expect(gradeLocate(locateTask, { page: 0, box: [0.25, 0.25, 0.35, 0.35] })).toMatchObject({
			score: 0,
			pass: false,
			detail: 'wrong page: said 0, expected 1',
		})
	})

	it('fails when the predicted center falls outside the target', () => {
		expect(gradeLocate(locateTask, { page: 1, box: [0.6, 0.6, 0.9, 0.9] })).toMatchObject({
			pass: false,
		})
	})

	it('accepts a box whose corners are given in reverse order', () => {
		expect(gradeLocate(locateTask, { page: 1, box: [0.35, 0.35, 0.25, 0.25] })).toMatchObject({
			pass: true,
		})
	})

	it('enforces IoU instead of containment when minIou is set', () => {
		const strict: LocateTask = { ...locateTask, minIou: 0.5 }
		// Centered on the target, but far too small to overlap half of it.
		expect(gradeLocate(strict, { page: 1, box: [0.29, 0.29, 0.31, 0.31] })).toMatchObject({
			pass: false,
		})
		expect(gradeLocate(strict, { page: 1, box: [0.21, 0.21, 0.39, 0.39] })).toMatchObject({
			pass: true,
		})
	})

	it('reports a malformed answer rather than scoring it', () => {
		expect(gradeLocate(locateTask, { page: 1, box: [0.1, 0.2] })).toMatchObject({
			pass: false,
			detail: 'answer was not {page, box:[x0,y0,x1,y1]}',
		})
	})
})

const findManyTask: FindManyTask = {
	id: 'find',
	type: 'find-many',
	board: 'b',
	prompt: 'list them',
	expect: {
		items: [
			{ id: 'a', match: ['red square', 'red box'] },
			{ id: 'b', match: ['blue arrow'] },
			{ id: 'c', match: ['missing label'] },
		],
	},
	minF1: 0.7,
}

describe('gradeFindMany', () => {
	it('gives partial credit rather than pass/fail alone', () => {
		const grade = gradeFindMany(findManyTask, { items: ['a red box on the left', 'blue arrow'] })
		expect(grade.pass).toBe(true)
		expect(grade.breakdown).toMatchObject({ precision: 1, recall: 2 / 3, missed: ['c'] })
	})

	it('penalizes spurious findings through precision', () => {
		const grade = gradeFindMany(findManyTask, {
			items: ['red square', 'blue arrow', 'missing label', 'a green circle', 'a purple blob'],
		})
		expect(grade.breakdown).toMatchObject({ recall: 1, precision: 3 / 5 })
	})

	it('does not let one vague claim collect credit for several findings', () => {
		// A single answer entry that happens to contain two truth phrases must still
		// count once, or padding one string with keywords games the recall score.
		const grade = gradeFindMany(findManyTask, { items: ['red square and blue arrow'] })
		expect(grade.breakdown).toMatchObject({ recall: 1 / 3 })
	})

	it('scores zero for an empty answer without dividing by zero', () => {
		const grade = gradeFindMany(findManyTask, { items: [] })
		expect(grade.score).toBe(0)
		expect(grade.pass).toBe(false)
	})
})

const describeTask: DescribeTask = {
	id: 'describe',
	type: 'describe',
	board: 'b',
	prompt: 'describe it',
	reference: 'A sprint planning board.',
	rubric: ['Says it is a planning board.', 'Mentions the columns.'],
	mustMention: [['sprint'], ['backlog', 'to do'], ['done']],
}

const allTrueJudge = {
	async score() {
		return { verdicts: [true, true], usage: zeroUsage() }
	},
}

describe('gradeDescribe', () => {
	it('needs both the deterministic recall check and the rubric', async () => {
		const grade = await gradeDescribe(
			describeTask,
			{
				summary: 'A sprint board with a to do column and a done column.',
				entities: [],
				regions: [],
			},
			allTrueJudge
		)
		expect(grade.pass).toBe(true)
		expect(grade.breakdown).toMatchObject({ recall: 1 })
	})

	it('fails a fluent description that misses the required entities', async () => {
		const grade = await gradeDescribe(
			describeTask,
			{ summary: 'A tidy planning board with several columns.', entities: [], regions: [] },
			allTrueJudge
		)
		expect(grade.pass).toBe(false)
		expect(grade.breakdown).toMatchObject({ missing: ['sprint', 'backlog', 'done'] })
	})

	it('fails when the judge rejects the rubric even with full recall', async () => {
		const grade = await gradeDescribe(
			describeTask,
			{ summary: 'sprint backlog done', entities: [], regions: [] },
			{
				async score() {
					return { verdicts: [false, false], usage: zeroUsage() }
				},
			}
		)
		expect(grade.pass).toBe(false)
	})
})

describe('extractAnswer', () => {
	it('reads the answer envelope', () => {
		expect(extractAnswer('thinking out loud\n<answer>{"page": 2}</answer>')).toEqual({ page: 2 })
	})

	it('tolerates a code fence inside the envelope', () => {
		expect(extractAnswer('<answer>\n```json\n{"page": 2}\n```\n</answer>')).toEqual({ page: 2 })
	})

	it('returns null when there is no envelope, so it grades as malformed', () => {
		expect(extractAnswer('The box is at the top left.')).toBeNull()
	})

	it('returns null for an envelope that is not valid JSON', () => {
		expect(extractAnswer('<answer>page 2, roughly</answer>')).toBeNull()
	})
})

function zeroUsage() {
	return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 }
}

describe('extractAnswerBlock', () => {
	it('returns the raw block text even when it is not JSON', () => {
		// This is what an `open` task relies on: the agent wrote prose, and prose is
		// a perfectly good answer when there is nothing to grade against.
		expect(extractAnswerBlock('<answer>**Overall:** a beach scene.</answer>')).toBe(
			'**Overall:** a beach scene.'
		)
	})

	it('still strips a code fence', () => {
		expect(extractAnswerBlock('<answer>```json\n{"a":1}\n```</answer>')).toBe('{"a":1}')
	})

	it('returns null when there is no block at all', () => {
		expect(extractAnswerBlock('no envelope here')).toBeNull()
	})
})
