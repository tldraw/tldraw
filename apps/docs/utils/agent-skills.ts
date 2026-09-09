import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// The skills tldraw publishes for agents to discover, per the Agent Skills Discovery RFC. Served
// from this app but reached at tldraw.dev/.well-known/agent-skills/* through the dotdev proxy, the
// same arrangement as the llms*.txt bundles.
//
// `skills/` in this repo is mostly workflows for contributing *to* tldraw, which are no use to
// somebody building *with* it. Only skills that stand alone for an outside reader belong here.

/** Where these documents are served from, which is not where this app is deployed. */
export const AGENT_SKILLS_BASE_URL = 'https://tldraw.dev/.well-known/agent-skills'

export const AGENT_SKILLS_INDEX_SCHEMA =
	'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

export interface PublishedSkill {
	/** The skill's directory, relative to the repo root. */
	sourceDir: string
}

/**
 * Keyed by the skill's name, which is also the route segment its `SKILL.md` is served under. Adding
 * a skill here means adding the matching `app/.well-known/agent-skills/<name>/SKILL.md/route.ts`;
 * {@link readPublishedSkill} fails the build if the two ever disagree.
 */
export const PUBLISHED_SKILLS = {
	'tldraw-migrate': { sourceDir: 'skills/tldraw-migrate' },
} satisfies Record<string, PublishedSkill>

export interface SkillDocument {
	name: string
	description: string
	markdown: string
	/** `sha256:<hex>`, over the exact bytes served, as the index format requires. */
	digest: string
	url: string
}

/** Reads from disk, so every route that calls it must stay `force-static`. */
export function readPublishedSkill(key: keyof typeof PUBLISHED_SKILLS): SkillDocument {
	const { sourceDir } = PUBLISHED_SKILLS[key]
	// `next build` runs with the app as its working directory; the skills live two levels up.
	const markdown = readFileSync(join(process.cwd(), '..', '..', sourceDir, 'SKILL.md'), 'utf8')

	const name = readFrontmatterField(markdown, 'name', sourceDir)
	const description = readFrontmatterField(markdown, 'description', sourceDir)

	// The index advertises a URL built from this name, and the route serving that URL is a directory
	// in `app/`. A rename upstream would publish a link to a 404 — silently, since nothing else reads
	// both halves.
	if (name !== key) {
		throw new Error(
			`${sourceDir}/SKILL.md is named \`${name}\`, but it is published as \`${key}\`. Rename the route directory to match, or drop it from PUBLISHED_SKILLS.`
		)
	}

	return {
		name,
		description,
		markdown,
		digest: `sha256:${createHash('sha256').update(markdown).digest('hex')}`,
		url: `${AGENT_SKILLS_BASE_URL}/${name}/SKILL.md`,
	}
}

/**
 * Pulls one scalar out of the skill's own YAML frontmatter rather than restating it here, so the
 * published index cannot describe a skill differently from the skill itself.
 *
 * Deliberately not a YAML parser: the fields taken are single-line scalars, and a build that fails
 * loudly on an unreadable one is better than a dependency added to read six lines.
 */
function readFrontmatterField(markdown: string, field: string, sourceDir: string): string {
	const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
	if (!frontmatter) throw new Error(`${sourceDir}/SKILL.md has no frontmatter`)

	const match = frontmatter[1].match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))
	if (!match) throw new Error(`${sourceDir}/SKILL.md frontmatter has no \`${field}\``)

	return match[1].trim().replace(/^['"]|['"]$/g, '')
}
