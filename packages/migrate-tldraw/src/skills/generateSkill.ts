/**
 * Skill generator. Composes a transform's auto-fix and flag tables together
 * with the hand-written section markdown into:
 *
 *   skills/SKILL.md                       — Claude Code skill format
 *   skills/.agent/migrate-to-<id>.md      — generic agent format
 *
 * Both files share the same body. The Claude version has an additional
 * frontmatter block. Section markdown is concatenated verbatim, so authors
 * can write idiomatic prose without thinking about the generator.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { AutoFix, Flag, Transform, TransformSection } from '../lib/types'

export interface GenerateOptions {
	transform: Transform
	/** Directory containing the transform's source (e.g. `src/transforms/v4-to-v5`). */
	transformSourceDir: string
	/** Directory where the generated `SKILL.md` and `.agent/*.md` will be written. */
	outputDir: string
}

export interface GeneratedSkill {
	skillMd: string
	agentMd: string
}

export function generateSkill(options: GenerateOptions): GeneratedSkill {
	const { transform, transformSourceDir } = options
	const sections = loadSections(path.join(transformSourceDir, transform.sectionsDir))

	const body = renderBody(transform, sections)

	const frontmatter =
		[
			'---',
			`name: migrate-${transform.id}`,
			`description: ${JSON.stringify(transform.summary)}`,
			'---',
			'',
		].join('\n')

	const skillMd = frontmatter + body
	const agentMd = body

	return { skillMd, agentMd }
}

/** Convenience CLI entry: writes `SKILL.md` and `.agent/migrate-<id>.md`. */
export function writeGeneratedSkill(options: GenerateOptions): void {
	const { skillMd, agentMd } = generateSkill(options)
	const skillPath = path.join(options.outputDir, 'SKILL.md')
	const agentPath = path.join(options.outputDir, '.agent', `migrate-${options.transform.id}.md`)
	fs.mkdirSync(path.dirname(skillPath), { recursive: true })
	fs.mkdirSync(path.dirname(agentPath), { recursive: true })
	fs.writeFileSync(skillPath, skillMd)
	fs.writeFileSync(agentPath, agentMd)
}

function loadSections(sectionsDir: string): TransformSection[] {
	const entries = fs.readdirSync(sectionsDir).sort()
	const sections: TransformSection[] = []
	for (const file of entries) {
		if (!file.endsWith('.md')) continue
		const slug = file.replace(/\.md$/, '')
		const body = fs.readFileSync(path.join(sectionsDir, file), 'utf8').replace(/\s+$/g, '\n')
		const titleMatch = body.match(/^#+\s+(.+)$/m)
		sections.push({ slug, title: titleMatch?.[1] ?? slug, body })
	}
	return sections
}

function renderBody(transform: Transform, sections: TransformSection[]): string {
	const lines: string[] = []

	lines.push(`# ${transform.title} migration`)
	lines.push('')
	lines.push(`> ${transform.summary}`)
	lines.push('')
	lines.push('This skill is a companion to the `@tldraw/migrate` CLI.')
	lines.push('')
	lines.push('## Workflow')
	lines.push('')
	lines.push('1. Run the deterministic migration:')
	lines.push('')
	lines.push('   ```sh')
	lines.push(`   npx @tldraw/migrate ${transform.id} .`)
	lines.push('   ```')
	lines.push('')
	lines.push('   The CLI applies the auto-fixes below and prints a list of flagged lines.')
	lines.push('')
	lines.push('2. Run typecheck to surface remaining errors:')
	lines.push('')
	lines.push('   ```sh')
	lines.push('   tsc --noEmit')
	lines.push('   ```')
	lines.push('')
	lines.push('3. For each flagged line, apply the change documented in this file. Verify')
	lines.push('   the change with the surrounding code before saving — these are pattern')
	lines.push('   matches, not AST replacements, so context matters.')
	lines.push('')

	if (transform.autoFixes.length > 0) {
		lines.push('## Auto-fixes (handled by the CLI)')
		lines.push('')
		lines.push('| Id | Change | Notes |')
		lines.push('| --- | --- | --- |')
		for (const fix of transform.autoFixes) {
			lines.push(`| \`${fix.id}\` | ${escapeCell(fix.name)} | ${escapeCell(fix.note)} |`)
		}
		lines.push('')
	}

	const allFlags: Flag[] = [...transform.tsFlags, ...transform.cssFlags]
	if (allFlags.length > 0) {
		lines.push('## Manual review required (flagged by the CLI)')
		lines.push('')
		lines.push('| Id | Flag | Notes |')
		lines.push('| --- | --- | --- |')
		for (const flag of allFlags) {
			lines.push(`| \`${flag.id}\` | ${escapeCell(flag.name)} | ${escapeCell(flag.note)} |`)
		}
		lines.push('')
	}

	lines.push('## Detailed migration notes')
	lines.push('')
	for (const section of sections) {
		lines.push(section.body.trimEnd())
		lines.push('')
	}

	lines.push('## Quality bar')
	lines.push('')
	lines.push('- Do **not** add `as any` or `as unknown as X` to silence type errors. If the')
	lines.push('  type genuinely changed, change the consumer to match.')
	lines.push('- Re-run `npx @tldraw/migrate ' + transform.id + ' . --dry-run` after each')
	lines.push('  batch of fixes to confirm the flag count is going down, not sideways.')
	lines.push('- When in doubt, search for similar usages elsewhere in the codebase and')
	lines.push('  match them — consistency matters more than cleverness.')
	lines.push('')

	return lines.join('\n')
}

function escapeCell(s: string): string {
	return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
