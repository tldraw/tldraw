import { readPublishedSkill } from '@/utils/agent-skills'

export const dynamic = 'force-static'

// The installable form of the skill: the whole directory, which the index publishes a digest over.
// A client that unpacks this and one that reads the `SKILL.md` route next door see the same
// instructions; only this one carries the helper scripts those instructions run.
export function GET() {
	return new Response(new Uint8Array(readPublishedSkill('tldraw-migrate').archive), {
		headers: {
			'content-type': 'application/gzip',
			'access-control-allow-origin': '*',
		},
	})
}
