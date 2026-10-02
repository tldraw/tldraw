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
import { emptyDir, isDirEmpty, parseCliArgs } from './utils'

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

describe('parseCliArgs', () => {
	it('leaves telemetry on when the flag is absent', () => {
		expect(parseCliArgs([])).toEqual({
			help: false,
			template: undefined,
			telemetry: true,
			targetDir: undefined,
		})
	})

	it('turns telemetry off for --no-telemetry', () => {
		expect(parseCliArgs(['--no-telemetry'])).toEqual({
			help: false,
			template: undefined,
			telemetry: false,
			targetDir: undefined,
		})
	})

	// Without `no-telemetry` declared as a boolean the parser reads the directory as the flag's value.
	it('keeps the directory when it follows --no-telemetry', () => {
		expect(parseCliArgs(['--no-telemetry', 'my-app'])).toEqual({
			help: false,
			template: undefined,
			telemetry: false,
			targetDir: 'my-app',
		})
	})

	it('reads the template from -t, --template and --template=', () => {
		expect(parseCliArgs(['-t', 'agent']).template).toBe('agent')
		expect(parseCliArgs(['--template', 'agent']).template).toBe('agent')
		expect(parseCliArgs(['--template=agent']).template).toBe('agent')
	})

	it('reads help from -h and --help', () => {
		expect(parseCliArgs(['-h']).help).toBe(true)
		expect(parseCliArgs(['--help']).help).toBe(true)
	})

	// Bare arguments are coerced by the parser, so a numeric directory comes back as a number.
	it('keeps an all-digit directory as a string', () => {
		expect(parseCliArgs(['2026']).targetDir).toBe('2026')
	})

	it('accepts a directory, a template and --no-telemetry together', () => {
		expect(parseCliArgs(['.', '-t', 'basic', '--no-telemetry'])).toEqual({
			help: false,
			template: 'basic',
			telemetry: false,
			targetDir: '.',
		})
	})
})
