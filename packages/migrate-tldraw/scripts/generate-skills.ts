/**
 * Build-time script: regenerate `skills/SKILL.md` and `skills/.agent/*.md` for
 * every transform in the registry. Runs as the package's `prebuild` step and
 * also as the source of truth that `skill-generation.test.ts` checks against.
 */

import * as path from 'node:path'
import { writeGeneratedSkill } from '../src/skills/generateSkill'
import { TRANSFORMS } from '../src/transforms'

function main() {
	const pkgRoot = path.resolve(__dirname, '..')
	const outputDir = path.join(pkgRoot, 'skills')

	for (const transform of TRANSFORMS) {
		const transformSourceDir = path.join(pkgRoot, 'src', 'transforms', transform.id)
		writeGeneratedSkill({ transform, transformSourceDir, outputDir })
	}
	// eslint-disable-next-line no-console
	console.log(`Generated skill files for ${TRANSFORMS.length} transform(s) → ${outputDir}`)
}

main()
