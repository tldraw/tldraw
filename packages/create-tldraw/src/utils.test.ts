import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emptyDir, isDirEmpty } from './utils'

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

	it('follows a symlink to an empty directory', () => {
		const dirPath = join(tempDir, 'real')
		mkdirSync(dirPath)
		symlinkSync(dirPath, join(tempDir, 'link'))

		expect(isDirEmpty(join(tempDir, 'link'))).toBe(true)
	})

	it('treats a directory containing only .git as empty', () => {
		const dirPath = join(tempDir, 'my-app')
		mkdirSync(dirPath)
		mkdirSync(join(dirPath, '.git'))

		expect(isDirEmpty(dirPath)).toBe(true)
	})
})

describe('emptyDir', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'create-tldraw-'))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('removes everything except .git', () => {
		mkdirSync(join(tempDir, '.git'))
		writeFileSync(join(tempDir, '.git', 'HEAD'), 'ref: refs/heads/main')
		mkdirSync(join(tempDir, 'src'))
		writeFileSync(join(tempDir, 'src', 'index.ts'), 'x')
		writeFileSync(join(tempDir, 'README.md'), 'x')

		emptyDir(tempDir)

		expect(readdirSync(tempDir)).toEqual(['.git'])
		expect(existsSync(join(tempDir, '.git', 'HEAD'))).toBe(true)
		expect(isDirEmpty(tempDir)).toBe(true)
	})
})
