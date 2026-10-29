import { describe, expect, it, vi } from 'vitest'
import { makeTestSql } from './test/testSql'
import { VersionWindow } from './versionWindow'

describe('VersionWindow', () => {
	it('noteCommit dedups authors', () => {
		const w = new VersionWindow(makeTestSql())
		w.noteCommit({ userId: 'u1' })
		w.noteCommit({ userId: 'u1' })
		w.noteCommit({ userId: 'u2', agent: 'mcp' })
		expect(w.take()).toEqual({
			authors: [{ userId: 'u1' }, { userId: 'u2', agent: 'mcp' }],
			hasUserChanges: true,
		})
	})

	it('anonymous authors collapse to one', () => {
		const w = new VersionWindow(makeTestSql())
		w.noteCommit({ userId: null })
		w.noteCommit({ userId: null })
		expect(w.take().authors).toEqual([{ userId: null }])
	})

	it('the same user as an agent is a separate author', () => {
		const w = new VersionWindow(makeTestSql())
		w.noteCommit({ userId: 'u1' })
		w.noteCommit({ userId: 'u1', agent: 'mcp' })
		expect(w.take().authors).toHaveLength(2)
	})

	it('take clears the window', () => {
		const w = new VersionWindow(makeTestSql())
		w.noteCommit({ userId: 'u1' })
		w.take()
		expect(w.take()).toEqual({ authors: [], hasUserChanges: false })
	})

	it('empty window has no user changes', () => {
		expect(new VersionWindow(makeTestSql()).take().hasUserChanges).toBe(false)
	})

	it('restore merges taken authors back', () => {
		const w = new VersionWindow(makeTestSql())
		w.noteCommit({ userId: 'u1' })
		const taken = w.take()
		w.noteCommit({ userId: 'u2' })
		w.restore(taken)
		expect(w.take().authors).toEqual(expect.arrayContaining([{ userId: 'u1' }, { userId: 'u2' }]))
	})

	it('a new instance on the same sql sees authors noted by the old one', () => {
		const sql = makeTestSql()
		new VersionWindow(sql).noteCommit({ userId: 'u1' })
		expect(new VersionWindow(sql).take()).toEqual({
			authors: [{ userId: 'u1' }],
			hasUserChanges: true,
		})
	})

	it('repeated noteCommit for a known author does not write', () => {
		const sql = makeTestSql()
		const w = new VersionWindow(sql)
		w.noteCommit({ userId: 'u1' })
		const spy = vi.spyOn(sql, 'exec')
		w.noteCommit({ userId: 'u1' })
		expect(spy).not.toHaveBeenCalled()
	})
})
