import {
	AGENT_SKILLS_INDEX_SCHEMA,
	PUBLISHED_SKILLS,
	readPublishedSkill,
} from '@/utils/agent-skills'

// Read at build time, so a skill whose frontmatter has gone missing fails the build rather than
// serving a broken index.
export const dynamic = 'force-static'

export function GET() {
	const skills = Object.keys(PUBLISHED_SKILLS).map((key) => {
		const skill = readPublishedSkill(key as keyof typeof PUBLISHED_SKILLS)
		return {
			name: skill.name,
			// Single-file markdown; a skill that needs its helper scripts to run would have to be
			// published as an `archive` instead.
			type: 'skill-md',
			description: skill.description,
			url: skill.url,
			digest: skill.digest,
		}
	})

	return Response.json(
		{ $schema: AGENT_SKILLS_INDEX_SCHEMA, skills },
		// Readable cross-origin: an agent running in a browser is a normal consumer of this, and
		// everything here is already public.
		{ headers: { 'access-control-allow-origin': '*' } }
	)
}
