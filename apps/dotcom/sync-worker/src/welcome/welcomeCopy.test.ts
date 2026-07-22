import { describe, expect, it } from 'vitest'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { WELCOME_COPY } from './welcomeCopy'
import { messageFromRichText, WelcomeRichText } from './welcomeMarkup'

// The invariant the whole welcome i18n pipeline rests on: every string in the manifest appears as
// exactly one shape in the committed default snapshot. The build step asserts the same thing, but
// this keeps the manifest and the baked art from drifting under CI without running the build — if a
// snapshot re-export rewords a caption, this fails and names the entry to fix.

interface ShapeDoc {
	state: { id?: string; type?: string; props?: { richText?: WelcomeRichText } }
}

function englishByShape(): string[] {
	const snapshot = JSON.parse(defaultWelcomeSnapshotJson)
	return (snapshot.documents as ShapeDoc[])
		.filter((d) => d.state?.type === 'text' && d.state?.props?.richText)
		.map((d) => messageFromRichText(d.state.props!.richText!))
}

describe('WELCOME_COPY', () => {
	it('has a unique welcome.* id per owned entry', () => {
		const ids = WELCOME_COPY.map((e) => e.id).filter((id): id is string => id !== undefined)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('has a unique English per entry (the shape match / app-id key)', () => {
		const ens = WELCOME_COPY.map((e) => e.en)
		expect(new Set(ens).size).toBe(ens.length)
	})

	it('matches at least one snapshot shape per entry', () => {
		const allEnglish = englishByShape()
		for (const entry of WELCOME_COPY) {
			const matches = allEnglish.filter((text) => text === entry.en)
			expect(matches.length, `${entry.id ?? entry.en}`).toBeGreaterThanOrEqual(1)
		}
	})
})
