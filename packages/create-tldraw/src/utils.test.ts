import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDirEmpty } from './utils'

describe('isDirEmpty', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'create-tldraw-'))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('returns false for a regular file', () => {
		const filePath = join(tempDir, 'my-app')
		writeFileSync(filePath, 'x')

		expect(isDirEmpty(filePath)).toBe(false)
	})

	it('treats a directory containing only .git as empty', () => {
		const dirPath = join(tempDir, 'my-app')
		mkdirSync(dirPath)
		mkdirSync(join(dirPath, '.git'))

		expect(isDirEmpty(dirPath)).toBe(true)
	})
})
