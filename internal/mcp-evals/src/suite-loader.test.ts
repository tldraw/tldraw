import { describe, expect, it } from 'vitest'
import { parseBoardUrl, parseCsv, parseCsvSuite } from './suite-loader.js'
import type { DescribeTask, FindManyTask, LocateTask } from './types.js'

describe('parseBoardUrl', () => {
	it('reads the slug out of a published board URL', () => {
		expect(parseBoardUrl('https://www.tldraw.com/p/abc123')).toEqual({
			boardId: 'abc123',
			kind: 'published',
		})
	})

	it('reads the slug out of a shared file URL', () => {
		expect(parseBoardUrl('https://tldraw.com/f/xyz789')).toEqual({
			boardId: 'xyz789',
			kind: 'shared',
		})
	})

	it('drops viewport query params and fragments pasted from the address bar', () => {
		expect(parseBoardUrl('https://www.tldraw.com/p/abc123?d=v1.2.3.4#page1').boardId).toBe('abc123')
	})

	it('accepts a URL with no scheme', () => {
		expect(parseBoardUrl('www.tldraw.com/p/abc123').boardId).toBe('abc123')
	})

	it('accepts a bare slug', () => {
		expect(parseBoardUrl('abc123').boardId).toBe('abc123')
	})

	it('accepts staging and other tldraw hosts', () => {
		expect(parseBoardUrl('https://staging.tldraw.com/f/abc123')).toEqual({
			boardId: 'abc123',
			kind: 'shared',
		})
	})

	it('rejects a live room URL by name, since the server can never serve one', () => {
		expect(() => parseBoardUrl('https://www.tldraw.com/r/abc123')).toThrow(/live room/i)
	})

	it('rejects a URL with no board slug in it', () => {
		expect(() => parseBoardUrl('https://www.tldraw.com/')).toThrow(/Could not find a board slug/)
	})

	it('rejects an empty cell', () => {
		expect(() => parseBoardUrl('   ')).toThrow(/empty/)
	})
})

describe('parseCsv', () => {
	it('keeps commas inside quoted fields', () => {
		expect(parseCsv('a,b\n"one, two",three')).toEqual([
			['a', 'b'],
			['one, two', 'three'],
		])
	})

	it('keeps newlines inside quoted fields', () => {
		expect(parseCsv('a\n"line one\nline two"')).toEqual([['a'], ['line one\nline two']])
	})

	it('unescapes doubled quotes', () => {
		expect(parseCsv('a\n"he said ""hi"""')).toEqual([['a'], ['he said "hi"']])
	})

	it('handles CRLF line endings', () => {
		expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
			['a', 'b'],
			['1', '2'],
		])
	})

	it('strips a UTF-8 BOM so the first header name is not corrupted', () => {
		expect(parseCsv('﻿prompt,board_url\n')[0][0]).toBe('prompt')
	})
})

describe('parseCsvSuite', () => {
	const minimal = 'prompt,board_url\n"What is on this board?",https://www.tldraw.com/p/abc123\n'

	it('accepts a two-column CSV and produces an ungraded open task', () => {
		const suite = parseCsvSuite(minimal)
		expect(suite.tasks).toHaveLength(1)
		expect(suite.tasks[0]).toMatchObject({
			id: 'row-2',
			type: 'open',
			board: 'abc123',
			prompt: 'What is on this board?',
		})
		expect(suite.boards.abc123).toMatchObject({ boardId: 'abc123' })
	})

	it('accepts "url" and "board" as spellings of board_url', () => {
		expect(parseCsvSuite('prompt,url\nhi,abc123\n').tasks[0].board).toBe('abc123')
		expect(parseCsvSuite('prompt,board\nhi,abc123\n').tasks[0].board).toBe('abc123')
	})

	it('is case- and spacing-insensitive about headers', () => {
		expect(parseCsvSuite('Prompt,Board URL\nhi,abc123\n').tasks[0].prompt).toBe('hi')
	})

	it('dedupes several rows that share a board', () => {
		const suite = parseCsvSuite(
			'prompt,board_url\none,https://www.tldraw.com/p/abc\ntwo,https://www.tldraw.com/p/abc\n'
		)
		expect(suite.tasks).toHaveLength(2)
		expect(Object.keys(suite.boards)).toEqual(['abc'])
	})

	it('infers locate from a box column with no type column', () => {
		const suite = parseCsvSuite('prompt,board_url,page,box\nfind it,abc,1,"0.1,0.2,0.3,0.4"\n')
		const task = suite.tasks[0] as LocateTask
		expect(task.type).toBe('locate')
		expect(task.expect).toEqual({ page: 1, box: [0.1, 0.2, 0.3, 0.4] })
	})

	it('infers find-many from an items column and splits aliases on ";"', () => {
		const suite = parseCsvSuite(
			'prompt,board_url,items\nlist,abc,"red box;red square|blue arrow"\n'
		)
		const task = suite.tasks[0] as FindManyTask
		expect(task.type).toBe('find-many')
		expect(task.expect.items).toEqual([
			{ id: 'item-1', match: ['red box', 'red square'] },
			{ id: 'item-2', match: ['blue arrow'] },
		])
	})

	it('infers describe from must_mention alone', () => {
		const suite = parseCsvSuite(
			'prompt,board_url,must_mention\ndescribe,abc,"sprint|backlog;to do"\n'
		)
		const task = suite.tasks[0] as DescribeTask
		expect(task.type).toBe('describe')
		expect(task.mustMention).toEqual([['sprint'], ['backlog', 'to do']])
	})

	it('rejects pixel coordinates in a box, which would silently never match', () => {
		expect(() => parseCsvSuite('prompt,board_url,box\nfind,abc,"120,80,300,210"\n')).toThrow(
			/normalized 0–1, not pixels/
		)
	})

	it('rejects a box that is not four numbers', () => {
		expect(() => parseCsvSuite('prompt,board_url,box\nfind,abc,"0.1,0.2"\n')).toThrow(
			/four numbers/
		)
	})

	it('rejects a declared type whose ground truth is missing, rather than silently downgrading', () => {
		expect(() => parseCsvSuite('prompt,board_url,type\ndescribe it,abc,describe\n')).toThrow(
			/neither rubric nor must_mention/
		)
	})

	it('rejects a rubric with no reference for the judge to score against', () => {
		expect(() => parseCsvSuite('prompt,board_url,rubric\nd,abc,"is a diagram"\n')).toThrow(
			/needs a reference/
		)
	})

	it('reports the spreadsheet row number on a bad row', () => {
		expect(() =>
			parseCsvSuite('prompt,board_url\nok,abc\nbad,https://www.tldraw.com/r/live\n')
		).toThrow(/CSV row 3/)
	})

	it('rejects duplicate task ids', () => {
		expect(() => parseCsvSuite('id,prompt,board_url\nt1,a,abc\nt1,b,abc\n')).toThrow(/duplicate/)
	})

	it('skips blank lines instead of failing on them', () => {
		expect(parseCsvSuite('prompt,board_url\none,abc\n\n,\n').tasks).toHaveLength(1)
	})

	it('requires a prompt column', () => {
		expect(() => parseCsvSuite('board_url\nabc\n')).toThrow(/missing a required "prompt" column/)
	})

	it('rejects a header with no rows', () => {
		expect(() => parseCsvSuite('prompt,board_url\n')).toThrow(/no task rows/)
	})
})
