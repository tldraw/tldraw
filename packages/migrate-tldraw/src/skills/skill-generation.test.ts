/**
 * Asserts that the committed `skills/SKILL.md` and `skills/.agent/migrate-*.md`
 * files match what the generator currently produces. If this fails, run
 * `yarn run -T tsx ./scripts/generate-skills.ts` and commit the diff.
 *
 * This is the contract that keeps the LLM-facing docs and the CLI flag list
 * from drifting apart.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateSkill } from './generateSkill'
import { TRANSFORMS } from '../transforms'

const PKG_ROOT = path.resolve(__dirname, '..', '..')
const SKILLS_DIR = path.join(PKG_ROOT, 'skills')

describe('committed skill files match generator output', () => {
	for (const transform of TRANSFORMS) {
		describe(`transform: ${transform.id}`, () => {
			const transformSourceDir = path.join(PKG_ROOT, 'src', 'transforms', transform.id)
			const generated = generateSkill({
				transform,
				transformSourceDir,
				outputDir: SKILLS_DIR,
			})

			it('SKILL.md is up to date', () => {
				const committed = fs.readFileSync(path.join(SKILLS_DIR, 'SKILL.md'), 'utf8')
				expect(committed).toBe(generated.skillMd)
			})

			it(`.agent/migrate-${transform.id}.md is up to date`, () => {
				const committed = fs.readFileSync(
					path.join(SKILLS_DIR, '.agent', `migrate-${transform.id}.md`),
					'utf8'
				)
				expect(committed).toBe(generated.agentMd)
			})
		})
	}
})
