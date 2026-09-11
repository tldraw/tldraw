import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { readdirSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { PUBLISHED_SKILLS, readPublishedSkill } from './agent-skills'

type SkillKey = keyof typeof PUBLISHED_SKILLS
const keys = Object.keys(PUBLISHED_SKILLS) as SkillKey[]

/** The archive is gzipped tar, so read it back with tar rather than trusting the writer. */
function listArchive(archive: Buffer): string[] {
	return execFileSync('tar', ['-tzf', '-'], { input: archive })
		.toString()
		.split('\n')
		.filter(Boolean)
		.sort()
}

describe.each(keys)('published skill: %s', (key) => {
	const skill = readPublishedSkill(key)

	// The reason this is an archive at all. tldraw-migrate shells out to `detect-versions.mjs` in the
	// first block an agent runs; publishing `SKILL.md` on its own handed over a skill that failed on
	// first invocation. Any skill added later with the same shape fails here instead of in the wild.
	it('ships every sibling file its SKILL.md names', () => {
		const sourceDir = join(process.cwd(), '..', '..', PUBLISHED_SKILLS[key].sourceDir)
		const onDisk = new Set(readdirSync(sourceDir))
		const referenced = [...skill.markdown.matchAll(/[\w-]+\.(?:mjs|md)/g)]
			.map((m) => m[0])
			.filter((f) => onDisk.has(f) && f !== 'SKILL.md')

		expect(referenced.length).toBeGreaterThan(0)
		expect(listArchive(skill.archive)).toEqual(expect.arrayContaining(referenced))
	})

	// An unpacking client looks for SKILL.md at the root; a wrapper directory would hide it.
	it('puts SKILL.md at the archive root, not under a wrapper directory', () => {
		const entries = listArchive(skill.archive)
		expect(entries).toContain('SKILL.md')
		expect(entries.every((e) => !e.includes('/'))).toBe(true)
	})

	// The index publishes this digest for clients to verify the download against, so it has to be
	// taken over the bytes actually served rather than over the markdown or the source directory.
	it('publishes a digest over the archive bytes', () => {
		expect(skill.digest).toBe(`sha256:${createHash('sha256').update(skill.archive).digest('hex')}`)
	})

	// Identical sources must produce identical bytes, or the digest churns on every deploy and
	// invalidates whatever cached it.
	it('builds byte-identical archives from the same source', () => {
		expect(readPublishedSkill(key).archive.equals(skill.archive)).toBe(true)
	})
})
