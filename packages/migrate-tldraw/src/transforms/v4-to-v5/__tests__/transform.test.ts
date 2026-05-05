/**
 * Fixture-based test for the v4-to-v5 transform. Each fixture is a directory
 * with an `input/` tree, an `expected/` tree, and an `expected.flags.json`
 * mapping each filename to the ordered list of expected flag ids.
 *
 * The harness runs `processSource` on every input file and asserts:
 *   1. The post-fix source matches the corresponding expected file byte-for-byte
 *   2. The list of flag ids fired matches the expected list
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { processSource } from '../../../lib/processFile'
import { CSS_EXTS } from '../../../lib/findFiles'
import { v4ToV5 } from '../index'

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__')
const fixtures = fs.readdirSync(FIXTURES_DIR).filter((name) => {
	const full = path.join(FIXTURES_DIR, name)
	return fs.statSync(full).isDirectory()
})

describe('v4-to-v5 transform', () => {
	for (const fixture of fixtures) {
		describe(fixture, () => {
			const root = path.join(FIXTURES_DIR, fixture)
			const inputDir = path.join(root, 'input')
			const expectedDir = path.join(root, 'expected')
			const flagsManifest = JSON.parse(
				fs.readFileSync(path.join(root, 'expected.flags.json'), 'utf8')
			) as Record<string, string[]>

			const files = listFiles(inputDir)

			it.each(files)('%s', (file) => {
				const inputPath = path.join(inputDir, file)
				const expectedPath = path.join(expectedDir, file)
				const ext = path.extname(file)
				const isCss = CSS_EXTS.has(ext)

				const source = fs.readFileSync(inputPath, 'utf8')
				const expected = fs.readFileSync(expectedPath, 'utf8')

				const { updated, result } = processSource(
					inputPath,
					source,
					isCss ? [] : v4ToV5.autoFixes,
					isCss ? v4ToV5.cssFlags : v4ToV5.tsFlags
				)

				expect(updated).toBe(expected)
				const firedIds = result.flags.map((f) => f.flag.id)
				expect(firedIds).toEqual(flagsManifest[file] ?? [])
			})
		})
	}
})

function listFiles(dir: string): string[] {
	const out: string[] = []
	function walk(current: string, prefix: string) {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full, path.join(prefix, entry.name))
			} else {
				out.push(path.join(prefix, entry.name))
			}
		}
	}
	walk(dir, '')
	return out.sort()
}
