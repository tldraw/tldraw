import { readPublishedSkill } from '@/utils/agent-skills'

export const dynamic = 'force-static'

// Served verbatim from `skills/tldraw-migrate/SKILL.md`: the index publishes a digest over these
// exact bytes, so anything that rewrote them here would invalidate it.
export function GET() {
	return new Response(readPublishedSkill('tldraw-migrate').markdown, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'access-control-allow-origin': '*',
		},
	})
}
