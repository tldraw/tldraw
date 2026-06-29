import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it, vi } from 'vitest'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'
import { WelcomeRichText } from './welcomeMarkup'

// A real copy-shape id from the committed default snapshot (the welcome title), so the injector has
// something to match. The baked artifact is mocked so the test doesn't depend on which locales have
// landed real translations.
const TITLE_SHAPE = 'shape:lC5iGWdiF2kYebPJxooPZ'
// The artifact stores the localized MESSAGE; the worker rebuilds the richText from the shape's doc.
const frenchMessage = 'Bienvenue dans votre espace de travail'
const frenchTitle: WelcomeRichText = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: frenchMessage }] }],
}

vi.mock('./localizedWelcomeCopy', () => ({
	localizedWelcomeCopy: {
		fr: { [TITLE_SHAPE]: frenchMessage },
		'pt-br': { [TITLE_SHAPE]: frenchMessage },
	},
}))

const { resolveWelcomeSnapshot, welcomeLocaleCandidates } = await import('./resolveWelcomeSnapshot')

const defaultSnapshot = JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
function titleRichText(snapshot: RoomSnapshot) {
	const doc = snapshot.documents.find((d) => (d.state as any).id === TITLE_SHAPE)
	return (doc!.state as any).props.richText
}

describe('welcomeLocaleCandidates', () => {
	it('lowercases and adds the base language', () => {
		expect(welcomeLocaleCandidates('pt-BR')).toEqual(['pt-br', 'pt'])
		expect(welcomeLocaleCandidates('fr')).toEqual(['fr'])
		expect(welcomeLocaleCandidates('en-GB')).toEqual(['en-gb', 'en'])
	})
})

describe('resolveWelcomeSnapshot', () => {
	it('returns the committed English default when no locale is given', () => {
		expect(resolveWelcomeSnapshot()).toEqual(defaultSnapshot)
	})

	it('returns the English default for English locales (no baked variant)', () => {
		expect(resolveWelcomeSnapshot('en')).toEqual(defaultSnapshot)
		expect(resolveWelcomeSnapshot('en-US')).toEqual(defaultSnapshot)
	})

	it('injects the baked variant for a locale that has one', () => {
		expect(titleRichText(resolveWelcomeSnapshot('fr'))).toEqual(frenchTitle)
	})

	it('falls back through locale candidates to the base region variant', () => {
		// 'pt-PT' has no variant, but its base 'pt' has none either → English default.
		expect(resolveWelcomeSnapshot('pt-PT')).toEqual(defaultSnapshot)
		// 'pt-BR' matches the baked 'pt-br' variant directly.
		expect(titleRichText(resolveWelcomeSnapshot('pt-BR'))).toEqual(frenchTitle)
	})

	it('falls back to English for a locale with no baked variant', () => {
		expect(resolveWelcomeSnapshot('de')).toEqual(defaultSnapshot)
	})
})
