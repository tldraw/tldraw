import { readPublishedSkill } from '@/utils/agent-skills'

export const dynamic = 'force-static'

// Served verbatim from `skills/tldraw-migrate/SKILL.md` so the instructions can be read without
// unpacking anything. The index points at the archive instead — this file alone cannot run.
export function GET() {
	return new Response(readPublishedSkill('tldraw-migrate').markdown, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'access-control-allow-origin': '*',
		},
	})
}
