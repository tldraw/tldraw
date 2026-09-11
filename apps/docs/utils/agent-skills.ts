import { createHash } from 'crypto'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { create } from 'tar'

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
 * Keyed by the skill's name, which is also the route segment it is served under. Adding a skill here
 * means adding `app/.well-known/agent-skills/<name>.tar.gz/route.ts` (what the index points at) and
 * `app/.well-known/agent-skills/<name>/SKILL.md/route.ts` (readable form);
 * {@link readPublishedSkill} fails the build if the name and the routes ever disagree.
 */
export const PUBLISHED_SKILLS = {
	'tldraw-migrate': { sourceDir: 'skills/tldraw-migrate' },
} satisfies Record<string, PublishedSkill>

export interface SkillDocument {
	name: string
	description: string
	/** `SKILL.md` on its own, for reading. Not what the index publishes — see {@link archive}. */
	markdown: string
	/**
	 * The whole skill directory as a gzipped tarball, which is what an agent installs.
	 *
	 * `SKILL.md` alone is not installable: tldraw-migrate shells out to `detect-versions.mjs` and
	 * `detect-target.mjs` in the first block an agent runs, and reads `fetch-release-notes.mjs` and
	 * `type-errors.md` later. Publishing the markdown by itself hands over a skill that fails on its
	 * first invocation, with nothing in the index hinting at why.
	 */
	archive: Buffer
	/** `sha256:<hex>` over the archive bytes, as the index format requires. */
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

	const archive = buildSkillArchive(sourceDir)

	return {
		name,
		description,
		markdown,
		archive,
		digest: `sha256:${createHash('sha256').update(archive).digest('hex')}`,
		url: `${AGENT_SKILLS_BASE_URL}/${name}.tar.gz`,
	}
}

/**
 * The skill directory as a `.tar.gz`, with its files at the archive root rather than under a wrapper
 * directory — the layout the discovery RFC requires, and the one that makes `SKILL.md` land where an
 * unpacking client looks for it.
 *
 * `portable: true` strips mtimes, uids and gids, so identical sources produce identical bytes. That
 * is what stops the digest churning on every deploy and invalidating clients that cached it.
 *
 * Dotfiles are skipped: the only one is a `.gitignore` covering the `references/` cache the skill
 * fetches at runtime, which means nothing outside this repo.
 */
function buildSkillArchive(sourceDir: string): Buffer {
	const cwd = join(process.cwd(), '..', '..', sourceDir)
	const entries = readdirSync(cwd)
		.filter((f) => !f.startsWith('.'))
		.sort()

	// `sync: true` with no `file` returns a pack whose contents can be read straight out as a buffer.
	const pack = create({ gzip: true, portable: true, cwd, sync: true }, entries) as unknown as {
		read(): Buffer
	}
	return pack.read()
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
